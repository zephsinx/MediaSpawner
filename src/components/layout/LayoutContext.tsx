import React, { createContext, useContext, useReducer, useEffect } from "react";
import { SpawnProfileService } from "../../services/spawnProfileService";

/**
 * Layout state interface for panel coordination
 */
export interface LayoutState {
  /** Currently active profile ID */
  activeProfileId: string | undefined;

  /** Currently selected spawn ID */
  selectedSpawnId: string | undefined;

  /** Center panel mode (spawn settings vs asset settings) */
  centerPanelMode: "spawn-settings" | "asset-settings";

  /** Whether there are unsaved changes in the workspace */
  hasUnsavedChanges: boolean;

  /** Per-profile spawn selection persistence */
  profileSpawnSelections: Record<string, string | undefined>;
}

/**
 * Layout action types for state management
 */
export type LayoutAction =
  | { type: "SET_ACTIVE_PROFILE"; payload: { profileId: string | undefined } }
  | { type: "SELECT_SPAWN"; payload: { spawnId: string | undefined } }
  | {
      type: "SET_CENTER_PANEL_MODE";
      payload: { mode: "spawn-settings" | "asset-settings" };
    }
  | { type: "SET_UNSAVED_CHANGES"; payload: { hasChanges: boolean } }
  | { type: "CLEAR_CONTEXT" }
  | { type: "LOAD_STATE_FROM_STORAGE" };

/**
 * Initial state for the layout context
 */
const initialState: LayoutState = {
  activeProfileId: undefined,
  selectedSpawnId: undefined,
  centerPanelMode: "spawn-settings",
  hasUnsavedChanges: false,
  profileSpawnSelections: {},
};

/**
 * Layout context for panel state management
 */
const LayoutContext = createContext<{
  state: LayoutState;
  dispatch: React.Dispatch<LayoutAction>;
} | null>(null);

/**
 * Layout reducer for state management
 */
function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
  switch (action.type) {
    case "SET_ACTIVE_PROFILE": {
      const { profileId } = action.payload;

      // If switching to a different profile, reset spawn selection
      const newSelectedSpawnId =
        profileId !== state.activeProfileId
          ? state.profileSpawnSelections[profileId || ""] || undefined
          : state.selectedSpawnId;

      return {
        ...state,
        activeProfileId: profileId,
        selectedSpawnId: newSelectedSpawnId,
        centerPanelMode: "spawn-settings", // Reset to spawn settings mode
        hasUnsavedChanges: false, // Clear unsaved changes when switching profiles
      };
    }

    case "SELECT_SPAWN": {
      const { spawnId } = action.payload;

      // Update selected spawn and persist selection for current profile
      const newProfileSpawnSelections = state.activeProfileId
        ? {
            ...state.profileSpawnSelections,
            [state.activeProfileId]: spawnId,
          }
        : state.profileSpawnSelections;

      return {
        ...state,
        selectedSpawnId: spawnId,
        profileSpawnSelections: newProfileSpawnSelections,
        centerPanelMode: "spawn-settings", // Reset to spawn settings when selecting spawn
      };
    }

    case "SET_CENTER_PANEL_MODE": {
      const { mode } = action.payload;
      return {
        ...state,
        centerPanelMode: mode,
      };
    }

    case "SET_UNSAVED_CHANGES": {
      const { hasChanges } = action.payload;
      return {
        ...state,
        hasUnsavedChanges: hasChanges,
      };
    }

    case "CLEAR_CONTEXT": {
      return {
        ...initialState,
        activeProfileId: state.activeProfileId, // Preserve active profile
        profileSpawnSelections: state.profileSpawnSelections, // Preserve selections
      };
    }

    case "LOAD_STATE_FROM_STORAGE": {
      try {
        const storedSelections = localStorage.getItem(
          "mediaspawner_profile_spawn_selections"
        );
        const profileSpawnSelections = storedSelections
          ? JSON.parse(storedSelections)
          : {};

        return {
          ...state,
          profileSpawnSelections,
        };
      } catch (error) {
        console.error("Failed to load state from storage:", error);
        return state;
      }
    }

    default:
      return state;
  }
}

/**
 * Props for the LayoutProvider component
 */
export interface LayoutProviderProps {
  children: React.ReactNode;
}

/**
 * Layout provider component that manages panel state
 */
export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(layoutReducer, initialState);

  // Load state from storage on mount
  useEffect(() => {
    dispatch({ type: "LOAD_STATE_FROM_STORAGE" });
  }, []);

  // Persist profile spawn selections to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "mediaspawner_profile_spawn_selections",
        JSON.stringify(state.profileSpawnSelections)
      );
    } catch (error) {
      console.error("Failed to persist state to storage:", error);
    }
  }, [state.profileSpawnSelections]);

  // Load active profile on mount and when profiles change
  useEffect(() => {
    try {
      const { activeProfileId } =
        SpawnProfileService.getProfilesWithActiveInfo();
      if (activeProfileId && activeProfileId !== state.activeProfileId) {
        dispatch({
          type: "SET_ACTIVE_PROFILE",
          payload: { profileId: activeProfileId },
        });
      }
    } catch (error) {
      console.error("Failed to load active profile:", error);
    }
  }, []);

  return (
    <LayoutContext.Provider value={{ state, dispatch }}>
      {children}
    </LayoutContext.Provider>
  );
};

/**
 * Custom hook to use the layout context
 */
export const useLayoutContext = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayoutContext must be used within a LayoutProvider");
  }
  return context;
};

/**
 * Custom hook for panel-specific state management
 */
export const usePanelState = () => {
  const { state, dispatch } = useLayoutContext();

  const setActiveProfile = (profileId: string | undefined) => {
    dispatch({ type: "SET_ACTIVE_PROFILE", payload: { profileId } });
  };

  const selectSpawn = (spawnId: string | undefined) => {
    dispatch({ type: "SELECT_SPAWN", payload: { spawnId } });
  };

  const setCenterPanelMode = (mode: "spawn-settings" | "asset-settings") => {
    dispatch({ type: "SET_CENTER_PANEL_MODE", payload: { mode } });
  };

  const setUnsavedChanges = (hasChanges: boolean) => {
    dispatch({ type: "SET_UNSAVED_CHANGES", payload: { hasChanges } });
  };

  const clearContext = () => {
    dispatch({ type: "CLEAR_CONTEXT" });
  };

  return {
    // State
    activeProfileId: state.activeProfileId,
    selectedSpawnId: state.selectedSpawnId,
    centerPanelMode: state.centerPanelMode,
    hasUnsavedChanges: state.hasUnsavedChanges,
    profileSpawnSelections: state.profileSpawnSelections,

    // Actions
    setActiveProfile,
    selectSpawn,
    setCenterPanelMode,
    setUnsavedChanges,
    clearContext,
  };
};
