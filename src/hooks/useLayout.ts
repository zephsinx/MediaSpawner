import { useContext } from "react";
import { LayoutContext } from "../components/layout/LayoutContextTypes";

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
