import { useContext, useCallback } from "react";
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

  const setActiveProfile = useCallback(
    (profileId: string | undefined) => {
      dispatch({ type: "SET_ACTIVE_PROFILE", payload: { profileId } });
    },
    [dispatch],
  );

  const selectSpawn = useCallback(
    (spawnId: string | undefined) => {
      dispatch({ type: "SELECT_SPAWN", payload: { spawnId } });
    },
    [dispatch],
  );

  const selectSpawnAsset = useCallback(
    (spawnAssetId: string | undefined) => {
      dispatch({ type: "SELECT_SPAWN_ASSET", payload: { spawnAssetId } });
    },
    [dispatch],
  );

  const setCenterPanelMode = useCallback(
    (mode: "spawn-settings" | "asset-settings") => {
      dispatch({ type: "SET_CENTER_PANEL_MODE", payload: { mode } });
    },
    [dispatch],
  );

  const setUnsavedChanges = useCallback(
    (hasChanges: boolean) => {
      dispatch({ type: "SET_UNSAVED_CHANGES", payload: { hasChanges } });
    },
    [dispatch],
  );

  const setLiveProfile = useCallback(
    (profileId: string | undefined) => {
      dispatch({ type: "SET_LIVE_PROFILE", payload: { profileId } });
    },
    [dispatch],
  );

  const clearContext = useCallback(() => {
    dispatch({ type: "CLEAR_CONTEXT" });
  }, [dispatch]);

  return {
    // State
    activeProfileId: state.activeProfileId,
    liveProfileId: state.liveProfileId,
    selectedSpawnId: state.selectedSpawnId,
    selectedSpawnAssetId: state.selectedSpawnAssetId,
    centerPanelMode: state.centerPanelMode,
    hasUnsavedChanges: state.hasUnsavedChanges,
    profileSpawnSelections: state.profileSpawnSelections,

    // Actions
    setActiveProfile,
    setLiveProfile,
    selectSpawn,
    selectSpawnAsset,
    setCenterPanelMode,
    setUnsavedChanges,
    clearContext,
  };
};
