import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePanelState } from "../../hooks/useLayout";
import { SpawnService } from "../../services/spawnService";
import type { Spawn } from "../../types/spawn";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { deepEqual } from "../../utils/deepEqual";

const SpawnEditorWorkspace: React.FC = () => {
  const { selectedSpawnId, setUnsavedChanges, selectSpawn } = usePanelState();
  const [selectedSpawn, setSelectedSpawn] = useState<Spawn | null>(null);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [allSpawnsCache, setAllSpawnsCache] = useState<Spawn[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const prevSpawnIdRef = useRef<string | undefined>(undefined);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (!selectedSpawnId) {
        if (isActive) setSelectedSpawn(null);
        setName("");
        setDescription("");
        return;
      }
      const allSpawns = await SpawnService.getAllSpawns();
      setAllSpawnsCache(allSpawns);
      const found = allSpawns.find((s) => s.id === selectedSpawnId) || null;
      if (isActive) setSelectedSpawn(found);
    };
    load();
    return () => {
      isActive = false;
    };
  }, [selectedSpawnId]);

  useEffect(() => {
    if (selectedSpawn) {
      setName(selectedSpawn.name);
      setDescription(selectedSpawn.description || "");
      setEnabled(!!selectedSpawn.enabled);
      // Clear messages only if changing to a different spawn
      if (prevSpawnIdRef.current !== selectedSpawn.id) {
        setSaveError(null);
        setSaveSuccess(null);
      }
      setIsSaving(false);
      prevSpawnIdRef.current = selectedSpawn.id;
    }
  }, [selectedSpawn]);

  const isDirty = useMemo(() => {
    if (!selectedSpawn) return false;
    const draft: Partial<Spawn> = {
      name: name,
      description: description || undefined,
      enabled: enabled,
      duration: selectedSpawn.duration,
      trigger: selectedSpawn.trigger,
      assets: selectedSpawn.assets,
      id: selectedSpawn.id,
    };
    const baseline: Partial<Spawn> = {
      name: selectedSpawn.name,
      description: selectedSpawn.description,
      enabled: selectedSpawn.enabled,
      duration: selectedSpawn.duration,
      trigger: selectedSpawn.trigger,
      assets: selectedSpawn.assets,
      id: selectedSpawn.id,
    };
    // Ignore non-editing metadata like lastModified, order
    return !deepEqual(draft, baseline, {
      ignoreKeys: new Set(["lastModified", "order"]),
    });
  }, [name, description, enabled, selectedSpawn]);

  useEffect(() => {
    // Only update when dirty state changes to avoid unnecessary context re-renders
    setUnsavedChanges(!!isDirty);
  }, [isDirty, setUnsavedChanges]);

  const trimmedName = name.trim();
  const isNameNonEmpty = trimmedName.length > 0;
  const isNameUnique = useMemo(() => {
    if (!selectedSpawn) return true;
    const lower = trimmedName.toLowerCase();
    return !allSpawnsCache.some(
      (s) => s.id !== selectedSpawn.id && s.name.toLowerCase() === lower
    );
  }, [allSpawnsCache, selectedSpawn, trimmedName]);
  const isNameValid = isNameNonEmpty && isNameUnique;
  const isSaveDisabled = !isDirty || !isNameValid || isSaving || !selectedSpawn;

  const handleCancel = () => {
    if (!selectedSpawn) return;
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    setName(selectedSpawn.name);
    setDescription(selectedSpawn.description || "");
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    if (!selectedSpawn || isSaveDisabled) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const result = await SpawnService.updateSpawn(selectedSpawn.id, {
        name: trimmedName,
        description: description.trim() || undefined,
        enabled: enabled,
      });
      if (!result.success || !result.spawn) {
        setSaveError(result.error || "Failed to save spawn");
        return;
      }
      setSelectedSpawn(result.spawn);
      setSaveSuccess("Changes saved");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save spawn");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (ms: number | undefined) => {
    if (!ms) return "-";
    try {
      return new Date(ms).toLocaleString();
    } catch {
      return String(ms);
    }
  };

  if (!selectedSpawnId) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Spawn Editor</h2>
          <p className="text-sm text-gray-600">
            Select a spawn to edit its settings
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-600">
            Select a spawn from the list to begin editing.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Spawn Editor</h2>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-1">
          <p className="text-sm text-gray-600">
            {selectedSpawn
              ? `Editing: ${selectedSpawn.name}`
              : "Loading spawn..."}
          </p>
          <div className="flex items-center gap-2">
            {selectedSpawn && (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteDialog(true);
                }}
                className="px-3 py-1.5 rounded-md text-white bg-red-600 hover:bg-red-700"
                aria-label="Delete spawn"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              aria-label="Cancel edits"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaveDisabled}
              className={`px-3 py-1.5 rounded-md text-white ${
                isSaveDisabled
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              aria-label="Save spawn"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 p-4">
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
            setName(selectedSpawn.name);
            setDescription(selectedSpawn.description || "");
            setSaveError(null);
            setSaveSuccess(null);
            setShowDiscardDialog(false);
          }}
          onCancel={() => setShowDiscardDialog(false)}
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
              // Notify list to remove and clear selection
              window.dispatchEvent(
                new CustomEvent<{ id: string }>("mediaspawner:spawn-deleted", {
                  detail: { id: selectedSpawn.id },
                })
              );
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
                e instanceof Error ? e.message : "Failed to delete spawn"
              );
              setShowDeleteDialog(false);
            }
          }}
          onCancel={() => setShowDeleteDialog(false)}
        />
        {deleteError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded">
            {deleteError}
          </div>
        )}
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-sm text-green-700 rounded">
            {saveSuccess}
          </div>
        )}
        {selectedSpawn ? (
          <div className="max-w-2xl space-y-5">
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Basic Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="spawn-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="spawn-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isNameValid
                        ? "border-gray-300 bg-white"
                        : "border-red-300 bg-white"
                    }`}
                  />
                  {!trimmedName && (
                    <p className="mt-1 text-xs text-red-600">
                      Name is required
                    </p>
                  )}
                  {trimmedName && !isNameValid && (
                    <p className="mt-1 text-xs text-red-600">
                      Name must be unique
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="spawn-enabled"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Enabled
                  </label>
                  <div className="flex items-center h-[42px]">
                    <input
                      id="spawn-enabled"
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      aria-label="Enabled"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label
                    htmlFor="spawn-description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="spawn-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Metadata
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="spawn-id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ID
                  </label>
                  <input
                    id="spawn-id"
                    type="text"
                    value={selectedSpawn.id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spawn-modified"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Modified
                  </label>
                  <input
                    id="spawn-modified"
                    type="text"
                    value={formatDate(selectedSpawn.lastModified)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spawn-duration"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Duration (ms)
                  </label>
                  <input
                    id="spawn-duration"
                    type="number"
                    value={selectedSpawn.duration ?? 0}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spawn-assets"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Assets
                  </label>
                  <input
                    id="spawn-assets"
                    type="text"
                    value={`${selectedSpawn.assets.length} item${
                      selectedSpawn.assets.length === 1 ? "" : "s"
                    }`}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Loading spawn...</div>
        )}
      </div>
    </div>
  );
};

export default SpawnEditorWorkspace;
