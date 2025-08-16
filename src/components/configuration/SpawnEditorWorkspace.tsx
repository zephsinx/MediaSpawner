import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePanelState } from "../../hooks/useLayout";
import { SpawnService } from "../../services/spawnService";
import type { Spawn } from "../../types/spawn";
import type { MediaAssetProperties } from "../../types/media";
import { ConfirmDialog } from "../common/ConfirmDialog";
import AssetSettingsForm from "./asset-settings/AssetSettingsForm";

const SpawnEditorWorkspace: React.FC = () => {
  const {
    selectedSpawnId,
    selectedSpawnAssetId,
    centerPanelMode,
    setUnsavedChanges,
    hasUnsavedChanges,
    selectSpawn,
    setCenterPanelMode,
    selectSpawnAsset,
  } = usePanelState();
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
  const switchPendingRef = useRef<{
    mode: "spawn-settings" | "asset-settings";
    spawnAssetId?: string;
  } | null>(null);
  const [showModeSwitchDialog, setShowModeSwitchDialog] = useState(false);

  const assetDraftCacheRef = useRef<
    Record<
      string,
      {
        overrideEnabled: Partial<Record<keyof MediaAssetProperties, boolean>>;
        draftValues: Partial<MediaAssetProperties>;
      }
    >
  >({});

  type FieldKey = keyof MediaAssetProperties;
  const DEFAULT_FIELDS: FieldKey[] = [
    "dimensions",
    "position",
    "scale",
    "positionMode",
    "volume",
  ];
  const [defaultsEnabled, setDefaultsEnabled] = useState<
    Partial<Record<FieldKey, boolean>>
  >({});
  const [draftDefaults, setDraftDefaults] = useState<
    Partial<MediaAssetProperties>
  >({});

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
    const onUpdated = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | { spawnId?: string; updatedSpawn?: Spawn }
        | undefined;
      if (!detail || !detail.spawnId) return;
      if (detail.spawnId !== selectedSpawnId) return;
      if (detail.updatedSpawn) {
        setSelectedSpawn(detail.updatedSpawn);
        setName(detail.updatedSpawn.name);
        setDescription(detail.updatedSpawn.description || "");
        return;
      }
      void load();
    };
    window.addEventListener(
      "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
      onUpdated as EventListener
    );
    return () => {
      isActive = false;
      window.removeEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        onUpdated as EventListener
      );
    };
  }, [selectedSpawnId]);

  useEffect(() => {
    const onRequestSwitch = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | { mode: "spawn-settings" | "asset-settings"; spawnAssetId?: string }
        | undefined;
      if (!detail) return;
      if (hasUnsavedChanges) {
        switchPendingRef.current = detail;
        setShowModeSwitchDialog(true);
        return;
      }
      if (detail.mode === "asset-settings" && detail.spawnAssetId) {
        selectSpawnAsset(detail.spawnAssetId);
        setCenterPanelMode("asset-settings");
      } else if (detail.mode === "spawn-settings") {
        setCenterPanelMode("spawn-settings");
        selectSpawnAsset(undefined);
      }
    };
    window.addEventListener(
      "mediaspawner:request-center-switch" as unknown as keyof WindowEventMap,
      onRequestSwitch as EventListener
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:request-center-switch" as unknown as keyof WindowEventMap,
        onRequestSwitch as EventListener
      );
    };
  }, [selectSpawnAsset, setCenterPanelMode, hasUnsavedChanges]);

  useEffect(() => {
    if (selectedSpawn) {
      setName(selectedSpawn.name);
      setDescription(selectedSpawn.description || "");
      setEnabled(!!selectedSpawn.enabled);
      const toggles: Partial<Record<FieldKey, boolean>> = {};
      DEFAULT_FIELDS.forEach((k) => {
        const dp = selectedSpawn.defaultProperties;
        toggles[k] = dp
          ? (dp as Partial<MediaAssetProperties>)[k] !== undefined
          : false;
      });
      setDefaultsEnabled(toggles);
      setDraftDefaults({ ...(selectedSpawn.defaultProperties || {}) });
      // Clear messages only if changing to a different spawn
      if (prevSpawnIdRef.current !== selectedSpawn.id) {
        setSaveError(null);
        setSaveSuccess(null);
      }
      setIsSaving(false);
      prevSpawnIdRef.current = selectedSpawn.id;
    }
  }, [selectedSpawn]);

  const buildEnabledDefaults = (
    values: Partial<MediaAssetProperties>,
    toggles: Partial<Record<FieldKey, boolean>>
  ): Partial<MediaAssetProperties> => {
    const next: Partial<MediaAssetProperties> = {};
    if (toggles.dimensions) next.dimensions = values.dimensions;
    if (toggles.position) next.position = values.position;
    if (toggles.scale) next.scale = values.scale;
    if (toggles.positionMode) next.positionMode = values.positionMode;
    if (toggles.volume) next.volume = values.volume;
    return next;
  };

  const isDirty = useMemo(() => {
    if (!selectedSpawn) return false;
    const baselineName = selectedSpawn.name;
    const baselineDesc = selectedSpawn.description || "";
    const currentEnabledDefaults = buildEnabledDefaults(
      draftDefaults,
      defaultsEnabled
    );
    const baselineDefaults = selectedSpawn.defaultProperties || {};
    const defaultsChanged =
      JSON.stringify(currentEnabledDefaults) !==
      JSON.stringify(baselineDefaults);
    return (
      name !== baselineName || description !== baselineDesc || defaultsChanged
    );
  }, [name, description, selectedSpawn, draftDefaults, defaultsEnabled]);

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
    const toggles: Partial<Record<FieldKey, boolean>> = {};
    DEFAULT_FIELDS.forEach((k) => {
      const dp = selectedSpawn.defaultProperties;
      toggles[k] = dp
        ? (dp as Partial<MediaAssetProperties>)[k] !== undefined
        : false;
    });
    setDefaultsEnabled(toggles);
    setDraftDefaults({ ...(selectedSpawn.defaultProperties || {}) });
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    if (!selectedSpawn || isSaveDisabled) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const defaultProperties = buildEnabledDefaults(
        draftDefaults,
        defaultsEnabled
      );
      const result = await SpawnService.updateSpawn(selectedSpawn.id, {
        name: trimmedName,
        description: description.trim() || undefined,
        defaultProperties,
      });
      if (!result.success || !result.spawn) {
        setSaveError(result.error || "Failed to save spawn");
        return;
      }
      // Sync form fields immediately so dirty resets without waiting for effects
      setName(result.spawn.name);
      setDescription(result.spawn.description || "");
      setSelectedSpawn(result.spawn);
      setSaveSuccess("Changes saved");
      // Notify other panels and list of updates (e.g., name change)
      window.dispatchEvent(
        new CustomEvent(
          "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
          {
            detail: { spawnId: result.spawn.id, updatedSpawn: result.spawn },
          } as CustomEventInit
        )
      );
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save spawn");
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate enabled toggle behavior
  const handleEnabledImmediate = async (next: boolean) => {
    if (!selectedSpawn) return;
    setEnabled(next);
    try {
      const result = next
        ? await SpawnService.enableSpawn(selectedSpawn.id)
        : await SpawnService.disableSpawn(selectedSpawn.id);
      if (!result.success || !result.spawn) {
        setEnabled(!next);
        return;
      }
      setSelectedSpawn(result.spawn);
      window.dispatchEvent(
        new CustomEvent(
          "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
          {
            detail: { spawnId: result.spawn.id, updatedSpawn: result.spawn },
          } as CustomEventInit
        )
      );
    } catch {
      setEnabled(!next);
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

  // Asset settings mode
  if (
    centerPanelMode === "asset-settings" &&
    selectedSpawnId &&
    selectedSpawnAssetId
  ) {
    return (
      <AssetSettingsForm
        spawnId={selectedSpawnId}
        spawnAssetId={selectedSpawnAssetId}
        onBack={() => {
          window.dispatchEvent(
            new CustomEvent(
              "mediaspawner:request-center-switch" as unknown as keyof WindowEventMap,
              {
                detail: { mode: "spawn-settings" },
              } as CustomEventInit
            )
          );
        }}
        getCachedDraft={() =>
          assetDraftCacheRef.current[selectedSpawnAssetId] || undefined
        }
        setCachedDraft={(draft) => {
          assetDraftCacheRef.current[selectedSpawnAssetId] = draft;
        }}
      />
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
            const toggles: Partial<Record<FieldKey, boolean>> = {};
            DEFAULT_FIELDS.forEach((k) => {
              const dp = selectedSpawn.defaultProperties;
              toggles[k] = dp
                ? (dp as Partial<MediaAssetProperties>)[k] !== undefined
                : false;
            });
            setDefaultsEnabled(toggles);
            setDraftDefaults({ ...(selectedSpawn.defaultProperties || {}) });
            setSaveError(null);
            setSaveSuccess(null);
            setShowDiscardDialog(false);
          }}
          onCancel={() => setShowDiscardDialog(false)}
        />
        <ConfirmDialog
          isOpen={showModeSwitchDialog}
          title="Unsaved Changes"
          message="Switching modes will not save your changes. Continue?"
          confirmText="Switch"
          cancelText="Stay"
          variant="warning"
          onConfirm={() => {
            const pending = switchPendingRef.current;
            setShowModeSwitchDialog(false);
            if (!pending) return;
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800">
                  Basic Details
                </h3>
                <label
                  htmlFor="spawn-enabled"
                  className="flex items-center cursor-pointer select-none"
                >
                  <input
                    id="spawn-enabled"
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleEnabledImmediate(e.target.checked)}
                    aria-label="Enabled"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enabled</span>
                </label>
              </div>
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
                Default Asset Properties
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Assets inherit these values unless specifically overridden.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width (px)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!defaultsEnabled.dimensions}
                      onChange={(e) =>
                        setDefaultsEnabled((prev) => ({
                          ...prev,
                          dimensions: e.target.checked,
                        }))
                      }
                      aria-label="Enable default for dimensions"
                    />
                    <input
                      type="number"
                      min={1}
                      value={draftDefaults.dimensions?.width ?? ""}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          dimensions: {
                            width: Math.max(1, Number(e.target.value) || 1),
                            height: prev.dimensions?.height ?? 1,
                          },
                        }))
                      }
                      disabled={!defaultsEnabled.dimensions}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (px)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!defaultsEnabled.dimensions}
                      onChange={(e) =>
                        setDefaultsEnabled((prev) => ({
                          ...prev,
                          dimensions: e.target.checked,
                        }))
                      }
                      aria-label="Enable default for dimensions"
                    />
                    <input
                      type="number"
                      min={1}
                      value={draftDefaults.dimensions?.height ?? ""}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          dimensions: {
                            width: prev.dimensions?.width ?? 1,
                            height: Math.max(1, Number(e.target.value) || 1),
                          },
                        }))
                      }
                      disabled={!defaultsEnabled.dimensions}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    X Position (px)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!defaultsEnabled.position}
                      onChange={(e) =>
                        setDefaultsEnabled((prev) => ({
                          ...prev,
                          position: e.target.checked,
                        }))
                      }
                      aria-label="Enable default for position"
                    />
                    <input
                      type="number"
                      min={0}
                      value={draftDefaults.position?.x ?? ""}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          position: {
                            x: Math.max(0, Number(e.target.value) || 0),
                            y: prev.position?.y ?? 0,
                          },
                        }))
                      }
                      disabled={!defaultsEnabled.position}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Y Position (px)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!defaultsEnabled.position}
                      onChange={(e) =>
                        setDefaultsEnabled((prev) => ({
                          ...prev,
                          position: e.target.checked,
                        }))
                      }
                      aria-label="Enable default for position"
                    />
                    <input
                      type="number"
                      min={0}
                      value={draftDefaults.position?.y ?? ""}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          position: {
                            x: prev.position?.x ?? 0,
                            y: Math.max(0, Number(e.target.value) || 0),
                          },
                        }))
                      }
                      disabled={!defaultsEnabled.position}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scale
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!defaultsEnabled.scale}
                      onChange={(e) =>
                        setDefaultsEnabled((prev) => ({
                          ...prev,
                          scale: e.target.checked,
                        }))
                      }
                      aria-label="Enable default for scale"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={draftDefaults.scale ?? ""}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          scale: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      disabled={!defaultsEnabled.scale}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position Mode
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!defaultsEnabled.positionMode}
                      onChange={(e) =>
                        setDefaultsEnabled((prev) => ({
                          ...prev,
                          positionMode: e.target.checked,
                        }))
                      }
                      aria-label="Enable default for position mode"
                    />
                    <select
                      value={draftDefaults.positionMode ?? "absolute"}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          positionMode: e.target
                            .value as MediaAssetProperties["positionMode"],
                        }))
                      }
                      disabled={!defaultsEnabled.positionMode}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="absolute">Absolute (px)</option>
                      <option value="relative">Relative (%)</option>
                      <option value="centered">Centered</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Volume (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!defaultsEnabled.volume}
                      onChange={(e) =>
                        setDefaultsEnabled((prev) => ({
                          ...prev,
                          volume: e.target.checked,
                        }))
                      }
                      aria-label="Enable default for volume"
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((draftDefaults.volume ?? 0.5) * 100)}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          volume: (Number(e.target.value) || 0) / 100,
                        }))
                      }
                      disabled={!defaultsEnabled.volume}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round((draftDefaults.volume ?? 0.5) * 100)}
                      onChange={(e) =>
                        setDraftDefaults((prev) => ({
                          ...prev,
                          volume: (Number(e.target.value) || 0) / 100,
                        }))
                      }
                      disabled={!defaultsEnabled.volume}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
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
