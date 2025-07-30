import React, { useReducer, useEffect, useRef } from "react";
import { SpawnProfileService } from "../../services/spawnProfileService";
import { LayoutContext } from "./LayoutContextTypes";
import type { LayoutState, LayoutAction } from "./LayoutContextTypes";

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
  const hasLoadedProfile = useRef(false);

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

  // Load active profile on mount only
  useEffect(() => {
    if (!hasLoadedProfile.current) {
      try {
        const { activeProfileId } =
          SpawnProfileService.getProfilesWithActiveInfo();
        if (activeProfileId && activeProfileId !== state.activeProfileId) {
          dispatch({
            type: "SET_ACTIVE_PROFILE",
            payload: { profileId: activeProfileId },
          });
        }
        hasLoadedProfile.current = true;
      } catch (error) {
        console.error("Failed to load active profile:", error);
      }
    }
  }, [state.activeProfileId]);

  return (
    <LayoutContext.Provider value={{ state, dispatch }}>
      {children}
    </LayoutContext.Provider>
  );
};
