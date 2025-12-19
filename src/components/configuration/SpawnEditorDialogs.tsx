import type { RefObject } from "react";
import React from "react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import type { Spawn } from "../../types/spawn";
import type { TriggerType } from "../../types/spawn";
import { getDefaultTrigger } from "../../types/spawn";
import { SpawnService } from "../../services/spawnService";
import {
  dispatchMediaSpawnerEvent,
  MediaSpawnerEvents,
} from "../../hooks/useMediaSpawnerEvent";

interface SpawnEditorDialogsProps {
  // Discard dialog
  showDiscardDialog: boolean;
  setShowDiscardDialog: (show: boolean) => void;
  selectedSpawn: Spawn | null;
  clearAllCacheEntries: () => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setEnabled: (enabled: boolean) => void;
  setDuration: (duration: number) => void;
  setSaveError: (error: string | null) => void;
  setSaveSuccess: (success: string | null) => void;

  // Trigger type dialog
  showTriggerTypeDialog: boolean;
  setShowTriggerTypeDialog: (show: boolean) => void;
  pendingTriggerTypeRef: RefObject<TriggerType | null>;
  setTrigger: (trigger: ReturnType<typeof getDefaultTrigger>) => void;

  // Mode switch dialog
  showModeSwitchDialog: boolean;
  setShowModeSwitchDialog: (show: boolean) => void;
  getModalContent: () => { title: string; message: string };
  switchPendingRef: RefObject<{
    mode: "spawn-settings" | "asset-settings";
    spawnAssetId?: string;
  } | null>;
  selectSpawnAsset: (id: string | undefined) => void;
  setCenterPanelMode: (mode: "spawn-settings" | "asset-settings") => void;

  // Asset switch dialog
  showAssetSwitchDialog: boolean;
  setShowAssetSwitchDialog: (show: boolean) => void;
  pendingAssetSwitchIdRef: RefObject<string | null>;
  setUnsavedChanges: (
    hasChanges: boolean,
    type: "none" | "spawn" | "asset",
  ) => void;
  selectedSpawnAssetId: string | undefined;
  selectedSpawnId: string | undefined;
  clearCacheEntryUnsafe: (
    spawnId: string | undefined,
    spawnAssetId: string | undefined,
  ) => void;
  prevSelectedSpawnAssetIdRef: RefObject<string | undefined>;

  // Delete dialog
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  setDeleteError: (error: string | null) => void;
  setSelectedSpawn: (spawn: Spawn | null) => void;
  selectSpawn: (id: string | undefined) => void;
}

export const SpawnEditorDialogs: React.FC<SpawnEditorDialogsProps> = ({
  // Discard dialog
  showDiscardDialog,
  setShowDiscardDialog,
  selectedSpawn,
  clearAllCacheEntries,
  setName,
  setDescription,
  setEnabled,
  setDuration,
  setSaveError,
  setSaveSuccess,

  // Trigger type dialog
  showTriggerTypeDialog,
  setShowTriggerTypeDialog,
  pendingTriggerTypeRef,
  setTrigger,

  // Mode switch dialog
  showModeSwitchDialog,
  setShowModeSwitchDialog,
  getModalContent,
  switchPendingRef,
  selectSpawnAsset,
  setCenterPanelMode,

  // Asset switch dialog
  showAssetSwitchDialog,
  setShowAssetSwitchDialog,
  pendingAssetSwitchIdRef,
  setUnsavedChanges,
  selectedSpawnAssetId,
  selectedSpawnId,
  clearCacheEntryUnsafe,
  prevSelectedSpawnAssetIdRef,

  // Delete dialog
  showDeleteDialog,
  setShowDeleteDialog,
  setDeleteError,
  setSelectedSpawn,
  selectSpawn,
}) => {
  return (
    <>
      <ConfirmDialog
        isOpen={showDiscardDialog}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes. If you discard now, your edits will be lost."
        confirmText="Discard changes"
        cancelText="Keep editing"
        variant="warning"
        onConfirm={() => {
          if (!selectedSpawn) {
            setShowDiscardDialog(false);
            return;
          }

          // Clear cache when discarding changes to prevent stale data
          if (process.env.NODE_ENV === "development") {
            console.debug(
              "Discarding unsaved changes, clearing asset draft cache to prevent stale data",
            );
          }
          clearAllCacheEntries();

          setName(selectedSpawn.name);
          setDescription(selectedSpawn.description || "");
          setEnabled(!!selectedSpawn.enabled);
          setDuration(selectedSpawn.duration);
          setSaveError(null);
          setSaveSuccess(null);
          setShowDiscardDialog(false);
        }}
        onCancel={() => setShowDiscardDialog(false)}
      />

      <ConfirmDialog
        isOpen={showTriggerTypeDialog}
        title="Change Trigger Type?"
        message="Changing the trigger type will reset the current trigger configuration."
        confirmText="Change type"
        cancelText="Cancel"
        variant="warning"
        onConfirm={() => {
          const nextType = pendingTriggerTypeRef.current;
          setShowTriggerTypeDialog(false);
          if (!nextType) return;
          setTrigger(getDefaultTrigger(nextType));
          pendingTriggerTypeRef.current = null;
        }}
        onCancel={() => {
          pendingTriggerTypeRef.current = null;
          setShowTriggerTypeDialog(false);
        }}
      />

      <ConfirmDialog
        isOpen={showModeSwitchDialog}
        title={getModalContent().title}
        message={getModalContent().message}
        confirmText="Switch"
        cancelText="Stay"
        variant="warning"
        onConfirm={() => {
          const pending = switchPendingRef.current;
          setShowModeSwitchDialog(false);
          if (!pending) return;

          // Clear cache when switching modes to prevent contamination
          if (process.env.NODE_ENV === "development") {
            console.debug(
              "Mode switch confirmed, clearing asset draft cache to prevent contamination between modes",
            );
          }
          clearAllCacheEntries();

          if (pending.mode === "asset-settings" && pending.spawnAssetId) {
            selectSpawnAsset(pending.spawnAssetId);
            setCenterPanelMode("asset-settings");
          } else if (pending.mode === "spawn-settings") {
            setCenterPanelMode("spawn-settings");
            selectSpawnAsset(undefined);
          }
          switchPendingRef.current = null;
        }}
        onCancel={() => {
          switchPendingRef.current = null;
          setShowModeSwitchDialog(false);
        }}
      />

      <ConfirmDialog
        isOpen={showAssetSwitchDialog}
        title="Unsaved Asset Settings"
        message="Switching will discard property changes. Continue?"
        confirmText="Switch"
        cancelText="Stay"
        variant="warning"
        onConfirm={() => {
          const pendingId = pendingAssetSwitchIdRef.current;
          setShowAssetSwitchDialog(false);
          setUnsavedChanges(false, "none");

          // Clear the old asset's cached draft to prevent state bleed
          if (selectedSpawnAssetId) {
            clearCacheEntryUnsafe(selectedSpawnId, selectedSpawnAssetId);
          }

          // Clear the target asset's cached draft to prevent stale data
          if (pendingId) {
            clearCacheEntryUnsafe(selectedSpawnId, pendingId);
          }

          if (pendingId) {
            selectSpawnAsset(pendingId);
            prevSelectedSpawnAssetIdRef.current = pendingId;
          }
          pendingAssetSwitchIdRef.current = null;
        }}
        onCancel={() => {
          pendingAssetSwitchIdRef.current = null;
          setShowAssetSwitchDialog(false);
        }}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Spawn?"
        message="This action cannot be undone. The spawn will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          if (!selectedSpawn) {
            setShowDeleteDialog(false);
            return;
          }
          try {
            const res = await SpawnService.deleteSpawn(selectedSpawn.id);
            if (!res.success) {
              setDeleteError(res.error || "Failed to delete spawn");
              setShowDeleteDialog(false);
              return;
            }

            // Clear cache when deleting spawn to prevent stale data
            if (process.env.NODE_ENV === "development") {
              console.debug(
                "Spawn deleted, clearing asset draft cache to prevent stale data",
              );
            }
            clearAllCacheEntries();

            // Notify list to remove and clear selection
            dispatchMediaSpawnerEvent(MediaSpawnerEvents.SPAWN_DELETED, {
              id: selectedSpawn.id,
            });
            setSelectedSpawn(null);
            setName("");
            setDescription("");
            setSaveError(null);
            setSaveSuccess(null);
            setShowDeleteDialog(false);
            // Clear selection in layout context so center panel returns to guidance
            selectSpawn(undefined);
          } catch (e) {
            setDeleteError(
              e instanceof Error ? e.message : "Failed to delete spawn",
            );
            setShowDeleteDialog(false);
          }
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  );
};
