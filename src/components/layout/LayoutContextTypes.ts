import React, { createContext } from "react";

/**
 * Types of unsaved changes in the workspace
 */
export type ChangeType = "none" | "spawn" | "asset";

/**
 * Layout state interface for panel coordination
 */
export interface LayoutState {
  /** Currently active profile ID */
  activeProfileId: string | undefined;

  /** Currently live profile ID for Streamer.bot execution */
  liveProfileId: string | undefined;

  /** Currently selected spawn ID */
  selectedSpawnId: string | undefined;

  /** Currently selected spawn-asset ID for asset settings mode */
  selectedSpawnAssetId?: string | undefined;

  /** Center panel mode (spawn settings vs asset settings) */
  centerPanelMode: "spawn-settings" | "asset-settings";

  /** Whether there are unsaved changes in the workspace */
  hasUnsavedChanges: boolean;

  /** Type of unsaved changes in the workspace */
  changeType: ChangeType;

  /** Per-profile spawn selection persistence */
  profileSpawnSelections: Record<string, string | undefined>;
}

/**
 * Layout action types for state management
 */
export type LayoutAction =
  | { type: "SET_ACTIVE_PROFILE"; payload: { profileId: string | undefined } }
  | { type: "SET_LIVE_PROFILE"; payload: { profileId: string | undefined } }
  | { type: "SELECT_SPAWN"; payload: { spawnId: string | undefined } }
  | {
      type: "SELECT_SPAWN_ASSET";
      payload: { spawnAssetId: string | undefined };
    }
  | {
      type: "SET_CENTER_PANEL_MODE";
      payload: { mode: "spawn-settings" | "asset-settings" };
    }
  | {
      type: "SET_UNSAVED_CHANGES";
      payload: { hasChanges: boolean; changeType?: ChangeType };
    }
  | { type: "CLEAR_CONTEXT" }
  | { type: "LOAD_STATE_FROM_STORAGE" };

/**
 * Layout context for panel state management
 */
export const LayoutContext = createContext<{
  state: LayoutState;
  dispatch: React.Dispatch<LayoutAction>;
} | null>(null);
