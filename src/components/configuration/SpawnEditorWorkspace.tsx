import React, { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment-timezone/builds/moment-timezone-with-data-1970-2030";
import { usePanelState } from "../../hooks/useLayout";
import { SpawnService } from "../../services/spawnService";
import type { Spawn } from "../../types/spawn";
import type { Trigger, TriggerType } from "../../types/spawn";
import { getDefaultTrigger } from "../../types/spawn";
import type { MediaAssetProperties } from "../../types/media";
import { ConfirmDialog } from "../common/ConfirmDialog";
import AssetSettingsForm from "./asset-settings/AssetSettingsForm";
import {
  getNextActivation,
  formatNextActivation,
} from "../../utils/scheduling";
import { validateTrigger } from "../../utils/triggerValidation";

const buildTimezoneOptions = () => {
  const now = Date.now();
  return moment.tz
    .names()
    .map((zone) => {
      const offsetMin = moment.tz(now, zone).utcOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
      const mm = String(Math.abs(offsetMin) % 60).padStart(2, "0");
      return {
        value: zone,
        label: `(UTC${sign}${hh}:${mm}) ${zone}`,
        offset: offsetMin,
      };
    })
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label));
};

const timezoneOptions = buildTimezoneOptions();
const dayOfWeekOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type FieldKey = keyof MediaAssetProperties;
const DEFAULT_FIELDS: FieldKey[] = [
  "dimensions",
  "position",
  "scale",
  "positionMode",
  "volume",
];

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

// Helper function to safely access command config
const getCommandConfig = (trigger: Trigger | null) => {
  if (trigger?.type === "streamerbot.command") {
    return trigger.config;
  }
  return null;
};

// Helper function to safely access channel point reward config
const getChannelPointConfig = (trigger: Trigger | null) => {
  if (trigger?.type === "twitch.channelPointReward") {
    return trigger.config;
  }
  return null;
};

// Helper accessors for event/time-based configs
const getSubscriptionConfig = (trigger: Trigger | null) =>
  trigger?.type === "twitch.subscription" ? trigger.config : null;
const getGiftSubConfig = (trigger: Trigger | null) =>
  trigger?.type === "twitch.giftSub" ? trigger.config : null;
const getCheerConfig = (trigger: Trigger | null) =>
  trigger?.type === "twitch.cheer" ? trigger.config : null;
const getAtDateTimeConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.atDateTime" ? trigger.config : null;
const getDailyAtConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.dailyAt" ? trigger.config : null;
const getEveryNMinutesConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.everyNMinutes" ? trigger.config : null;
const getMinuteOfHourConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.minuteOfHour" ? trigger.config : null;
const getWeeklyAtConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.weeklyAt"
    ? (trigger.config as { dayOfWeek: number; time: string; timezone: string })
    : null;
const getMonthlyOnConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.monthlyOn"
    ? (trigger.config as { dayOfMonth: number; time: string; timezone: string })
    : null;

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
  const [trigger, setTrigger] = useState<Trigger | null>(null);
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
  const [showTriggerTypeDialog, setShowTriggerTypeDialog] = useState(false);
  const pendingTriggerTypeRef = useRef<TriggerType | null>(null);

  const assetDraftCacheRef = useRef<
    Record<
      string,
      {
        overrideEnabled: Partial<Record<keyof MediaAssetProperties, boolean>>;
        draftValues: Partial<MediaAssetProperties>;
      }
    >
  >({});

  const [defaultsEnabled, setDefaultsEnabled] = useState<
    Partial<Record<FieldKey, boolean>>
  >({});
  const [draftDefaults, setDraftDefaults] = useState<
    Partial<MediaAssetProperties>
  >({});
  const [showMetadata, setShowMetadata] = useState<boolean>(true);
  const validation = useMemo(() => validateTrigger(trigger), [trigger]);

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
      setTrigger(selectedSpawn.trigger || getDefaultTrigger("manual"));
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

  const isDirty = useMemo(() => {
    if (!selectedSpawn) return false;
    const baselineName = selectedSpawn.name;
    const baselineDesc = selectedSpawn.description || "";
    const triggerChanged =
      JSON.stringify(trigger) !== JSON.stringify(selectedSpawn.trigger || null);
    const currentEnabledDefaults = buildEnabledDefaults(
      draftDefaults,
      defaultsEnabled
    );
    const baselineDefaults = selectedSpawn.defaultProperties || {};
    const defaultsChanged =
      JSON.stringify(currentEnabledDefaults) !==
      JSON.stringify(baselineDefaults);
    return (
      name !== baselineName ||
      description !== baselineDesc ||
      defaultsChanged ||
      triggerChanged
    );
  }, [
    name,
    description,
    selectedSpawn,
    draftDefaults,
    defaultsEnabled,
    trigger,
  ]);

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

  // Command alias validation for streamerbot.command triggers
  const isCommandAliasValid = useMemo(() => {
    if (trigger?.type !== "streamerbot.command") return true;
    const config = getCommandConfig(trigger);
    const aliases = config?.aliases || [];
    return aliases.length > 0 && !aliases.some((a: string) => !a.trim());
  }, [trigger]);

  // Channel point reward validation for twitch.channelPointReward triggers
  const isChannelPointConfigValid = useMemo(() => {
    if (trigger?.type !== "twitch.channelPointReward") return true;
    const config = getChannelPointConfig(trigger);
    const rewardIdentifier = config?.rewardIdentifier || "";
    const statuses = config?.statuses || [];
    return rewardIdentifier.trim().length > 0 && statuses.length > 0;
  }, [trigger]);

  const isSaveDisabled =
    !isDirty ||
    !isNameValid ||
    isSaving ||
    !selectedSpawn ||
    !isCommandAliasValid ||
    !isChannelPointConfigValid ||
    validation.errors.length > 0;

  const handleCancel = () => {
    if (!selectedSpawn) return;
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    setName(selectedSpawn.name);
    setDescription(selectedSpawn.description || "");
    setTrigger(selectedSpawn.trigger || getDefaultTrigger("manual"));
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

    // Additional validation for command aliases
    if (trigger?.type === "streamerbot.command" && !isCommandAliasValid) return;

    // Additional validation for channel point reward configuration
    if (
      trigger?.type === "twitch.channelPointReward" &&
      !isChannelPointConfigValid
    )
      return;
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
        trigger: trigger || undefined,
        defaultProperties,
      });
      if (!result.success || !result.spawn) {
        setSaveError(result.error || "Failed to save spawn");
        return;
      }
      // Sync form fields immediately so dirty resets without waiting for effects
      setName(result.spawn.name);
      setDescription(result.spawn.description || "");
      setTrigger(result.spawn.trigger || getDefaultTrigger("manual"));
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
        getCachedDraft={() => assetDraftCacheRef.current[selectedSpawnAssetId]}
        setCachedDraft={(draft) =>
          (assetDraftCacheRef.current[selectedSpawnAssetId] = draft)
        }
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
              <div className="mb-2 flex items-center gap-2 text-xs">
                {validation.errors.length > 0 ? (
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">
                    Invalid
                  </span>
                ) : validation.warnings.length > 0 ? (
                  <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                    Warning
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                    Valid
                  </span>
                )}
                {validation.warnings.length > 0 && (
                  <span className="text-gray-500">
                    {validation.warnings[0]}
                  </span>
                )}
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800">
                  Trigger
                </h3>
                <label className="flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={trigger?.enabled !== false}
                    onChange={(e) => {
                      if (!trigger) return;
                      setTrigger({ ...trigger, enabled: e.target.checked });
                    }}
                    aria-label="Trigger Enabled"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Trigger Enabled
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="trigger-type"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Trigger Type
                  </label>
                  <select
                    id="trigger-type"
                    value={trigger?.type || "manual"}
                    onChange={(e) => {
                      const nextType = e.target.value as TriggerType;
                      if (!trigger) {
                        setTrigger(getDefaultTrigger(nextType));
                        return;
                      }
                      if (nextType === trigger.type) return;
                      pendingTriggerTypeRef.current = nextType;
                      setShowTriggerTypeDialog(true);
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                  >
                    <option value="manual">Manual</option>
                    <option value="time.atDateTime">Time: At Date/Time</option>
                    <option value="time.dailyAt">Time: Daily At</option>
                    <option value="time.everyNMinutes">
                      Time: Every N Minutes
                    </option>
                    <option value="time.weeklyAt">Time: Weekly At</option>
                    <option value="time.monthlyOn">Time: Monthly On</option>
                    <option value="time.minuteOfHour">
                      Time: Minute Of Hour
                    </option>
                    <option value="streamerbot.command">
                      Streamer.bot Command
                    </option>
                    <option value="twitch.channelPointReward">
                      Twitch: Channel Point Reward
                    </option>
                    <option value="twitch.subscription">
                      Twitch: Subscription
                    </option>
                    <option value="twitch.giftSub">Twitch: Gifted Subs</option>
                    <option value="twitch.cheer">Twitch: Cheer</option>
                    <option value="twitch.follow">Twitch: Follow</option>
                  </select>
                </div>
                <div className="md:col-span-2 text-xs text-gray-600">
                  {(() => {
                    const t = trigger?.type || "manual";
                    if (t === "manual") {
                      return (
                        <p>
                          Manual triggers are activated outside of MediaSpawner.
                          No configuration required.
                        </p>
                      );
                    }
                    if (
                      t === "time.atDateTime" ||
                      t === "time.dailyAt" ||
                      t === "time.everyNMinutes" ||
                      t === "time.minuteOfHour" ||
                      t === "time.weeklyAt" ||
                      t === "time.monthlyOn"
                    ) {
                      return (
                        <p>
                          Schedule triggers based on timezone-aware date/time
                          rules.
                        </p>
                      );
                    }
                    if (t === "streamerbot.command") {
                      return (
                        <p>
                          Streamer.bot command: configure command aliases and
                          platform sources.
                        </p>
                      );
                    }
                    if (t === "twitch.channelPointReward") {
                      return (
                        <p>
                          Twitch Channel Point reward redemption. Configure
                          reward details in a later story.
                        </p>
                      );
                    }
                    if (t === "twitch.subscription") {
                      return (
                        <p>Configure subscription tier or minimum months.</p>
                      );
                    }
                    if (t === "twitch.giftSub") {
                      return (
                        <p>Configure gifted sub count and optional tier.</p>
                      );
                    }
                    if (t === "twitch.cheer") {
                      return <p>Configure minimum bits required to trigger.</p>;
                    }
                    if (t === "twitch.follow") {
                      return (
                        <p>
                          Twitch follow events. No additional configuration
                          required.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </section>

            {trigger?.type === "streamerbot.command" && (
              <section className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Command Configuration
                </h3>
                <div className="space-y-4">
                  {/* Command Aliases */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Command Aliases
                    </label>
                    <div className="space-y-2">
                      {(getCommandConfig(trigger)?.aliases || [""]).map(
                        (alias: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={alias}
                              onChange={(e) => {
                                const newAliases = [
                                  ...(getCommandConfig(trigger)?.aliases || [
                                    "",
                                  ]),
                                ];
                                newAliases[index] = e.target.value;
                                setTrigger({
                                  ...trigger,
                                  config: {
                                    ...getCommandConfig(trigger),
                                    aliases: newAliases,
                                  },
                                });
                              }}
                              placeholder="Enter command alias (e.g., scene1, alert)"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                            {(getCommandConfig(trigger)?.aliases || [""])
                              .length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newAliases = (
                                    getCommandConfig(trigger)?.aliases || [""]
                                  ).filter(
                                    (_: string, i: number) => i !== index
                                  );
                                  setTrigger({
                                    ...trigger,
                                    config: {
                                      ...getCommandConfig(trigger),
                                      aliases: newAliases,
                                    },
                                  });
                                }}
                                className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                aria-label="Remove command alias"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newAliases = [
                            ...(getCommandConfig(trigger)?.aliases || [""]),
                            "",
                          ];
                          setTrigger({
                            ...trigger,
                            config: {
                              ...getCommandConfig(trigger),
                              aliases: newAliases,
                            },
                          });
                        }}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200"
                      >
                        + Add Alias
                      </button>
                    </div>
                    {(() => {
                      const config = getCommandConfig(trigger);
                      const aliases = config?.aliases || [];
                      const hasEmptyAlias = aliases.some(
                        (a: string) => !a.trim()
                      );
                      if (!aliases.length || hasEmptyAlias) {
                        return (
                          <p className="mt-1 text-xs text-red-600">
                            At least one command alias is required
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Case Sensitivity */}
                  <div>
                    <label className="flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={
                          getCommandConfig(trigger)?.caseSensitive || false
                        }
                        onChange={(e) => {
                          setTrigger({
                            ...trigger,
                            config: {
                              ...getCommandConfig(trigger),
                              caseSensitive: e.target.checked,
                            },
                          });
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Case sensitive
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-600">
                      When enabled, command matching will be case-sensitive
                    </p>
                  </div>

                  {/* Platform Sources removed: Twitch-only support for now */}

                  {/* Filtering Options */}
                  <div className="space-y-3">
                    <div>
                      <label className="flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={
                            getCommandConfig(trigger)?.ignoreInternal !== false
                          }
                          onChange={(e) => {
                            setTrigger({
                              ...trigger,
                              config: {
                                ...getCommandConfig(trigger),
                                ignoreInternal: e.target.checked,
                              },
                            });
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Ignore internal messages
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-gray-600">
                        Skip messages from internal/system sources
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={
                            getCommandConfig(trigger)?.ignoreBotAccount !==
                            false
                          }
                          onChange={(e) => {
                            setTrigger({
                              ...trigger,
                              config: {
                                ...getCommandConfig(trigger),
                                ignoreBotAccount: e.target.checked,
                              },
                            });
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Ignore bot account messages
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-gray-600">
                        Skip messages from the bot account to avoid loops
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {trigger?.type === "twitch.channelPointReward" && (
              <section className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Channel Point Reward Configuration
                </h3>
                <div className="space-y-4">
                  {/* Reward Identifier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reward Identifier
                    </label>
                    <input
                      type="text"
                      value={
                        getChannelPointConfig(trigger)?.rewardIdentifier || ""
                      }
                      onChange={(e) => {
                        setTrigger({
                          ...trigger,
                          config: {
                            ...getChannelPointConfig(trigger),
                            rewardIdentifier: e.target.value,
                          },
                        });
                      }}
                      placeholder="Enter reward name or ID (e.g., Alert, Scene1, 12345)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                    {(() => {
                      const config = getChannelPointConfig(trigger);
                      const rewardIdentifier = config?.rewardIdentifier || "";
                      if (!rewardIdentifier.trim()) {
                        return (
                          <p className="mt-1 text-xs text-red-600">
                            Reward identifier is required
                          </p>
                        );
                      }
                      return null;
                    })()}
                    <p className="mt-1 text-xs text-gray-600">
                      Enter the name or ID of the channel point reward from your
                      Twitch channel
                    </p>
                  </div>

                  {/* Use Viewer Input */}
                  <div>
                    <label className="flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={
                          getChannelPointConfig(trigger)?.useViewerInput ||
                          false
                        }
                        onChange={(e) => {
                          setTrigger({
                            ...trigger,
                            config: {
                              ...getChannelPointConfig(trigger),
                              useViewerInput: e.target.checked,
                            },
                          });
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Use viewer input in spawn configuration
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-600">
                      When enabled, the viewer's message will be available for
                      use in spawn settings
                    </p>
                  </div>

                  {/* Redemption Statuses */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Redemption Statuses
                    </label>
                    <div className="space-y-2">
                      {["pending", "fulfilled", "cancelled"].map((status) => (
                        <label
                          key={status}
                          className="flex items-center cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={(
                              getChannelPointConfig(trigger)?.statuses || [
                                "fulfilled",
                              ]
                            ).includes(status)}
                            onChange={(e) => {
                              const currentStatuses = getChannelPointConfig(
                                trigger
                              )?.statuses || ["fulfilled"];
                              const newStatuses = e.target.checked
                                ? [...currentStatuses, status]
                                : currentStatuses.filter(
                                    (s: string) => s !== status
                                  );
                              setTrigger({
                                ...trigger,
                                config: {
                                  ...getChannelPointConfig(trigger),
                                  statuses: newStatuses,
                                },
                              });
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">
                            {status}
                          </span>
                        </label>
                      ))}
                    </div>
                    {(() => {
                      const config = getChannelPointConfig(trigger);
                      const statuses = config?.statuses || [];
                      if (statuses.length === 0) {
                        return (
                          <p className="mt-1 text-xs text-red-600">
                            At least one redemption status must be selected
                          </p>
                        );
                      }
                      return null;
                    })()}
                    <p className="mt-1 text-xs text-gray-600">
                      Select which redemption statuses should trigger this spawn
                    </p>
                  </div>

                  {/* Help Text */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> Twitch handles all reward logic
                      including cooldowns, usage limits, and point costs.
                      MediaSpawner only configures when spawns trigger based on
                      redemption events.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {trigger?.type === "twitch.subscription" && (
              <section className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Subscription Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="sub-tier"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Tier
                    </label>
                    <select
                      id="sub-tier"
                      value={getSubscriptionConfig(trigger)?.tier ?? ""}
                      onChange={(e) => {
                        const v = (e.target.value || undefined) as
                          | "1000"
                          | "2000"
                          | "3000"
                          | undefined;
                        setTrigger({
                          ...trigger,
                          config: {
                            ...getSubscriptionConfig(trigger),
                            tier: v,
                          },
                        });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                    >
                      <option value="">Any</option>
                      <option value="1000">Tier 1</option>
                      <option value="2000">Tier 2</option>
                      <option value="3000">Tier 3</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="sub-months-comparator"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Months Comparator
                    </label>
                    <select
                      id="sub-months-comparator"
                      value={
                        getSubscriptionConfig(trigger)?.monthsComparator ?? ""
                      }
                      onChange={(e) => {
                        const v = (e.target.value || undefined) as
                          | "lt"
                          | "eq"
                          | "gt"
                          | undefined;
                        setTrigger({
                          ...trigger,
                          config: {
                            ...getSubscriptionConfig(trigger),
                            monthsComparator: v,
                          },
                        });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                    >
                      <option value="">- Select -</option>
                      <option value="lt">Less than</option>
                      <option value="eq">Equal to</option>
                      <option value="gt">Greater than</option>
                    </select>
                    {validation.fieldErrors.monthsComparator && (
                      <p className="mt-1 text-xs text-red-600">
                        {validation.fieldErrors.monthsComparator[0]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="sub-months"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Months
                    </label>
                    <input
                      id="sub-months"
                      type="number"
                      min={1}
                      value={getSubscriptionConfig(trigger)?.months ?? ""}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setTrigger({
                          ...trigger,
                          config: {
                            ...getSubscriptionConfig(trigger),
                            months: val,
                          },
                        });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                    />
                    {validation.fieldErrors.months && (
                      <p className="mt-1 text-xs text-red-600">
                        {validation.fieldErrors.months[0]}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {trigger?.type === "twitch.giftSub" && (
              <section className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Gifted Subs Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="gift-min-count"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Minimum Count
                    </label>
                    <input
                      id="gift-min-count"
                      type="number"
                      min={1}
                      value={getGiftSubConfig(trigger)?.minCount ?? ""}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setTrigger({
                          ...trigger,
                          config: {
                            ...getGiftSubConfig(trigger),
                            minCount: val,
                          },
                        });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="gift-tier"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Tier
                    </label>
                    <select
                      id="gift-tier"
                      value={getGiftSubConfig(trigger)?.tier ?? ""}
                      onChange={(e) => {
                        const v = (e.target.value || undefined) as
                          | "1000"
                          | "2000"
                          | "3000"
                          | undefined;
                        setTrigger({
                          ...trigger,
                          config: { ...getGiftSubConfig(trigger), tier: v },
                        });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                    >
                      <option value="">Any</option>
                      <option value="1000">Tier 1</option>
                      <option value="2000">Tier 2</option>
                      <option value="3000">Tier 3</option>
                    </select>
                  </div>
                </div>
              </section>
            )}

            {trigger?.type === "twitch.cheer" && (
              <section className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Cheer Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="cheer-bits-comparator"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Bits Comparator
                    </label>
                    <select
                      id="cheer-bits-comparator"
                      value={getCheerConfig(trigger)?.bitsComparator ?? ""}
                      onChange={(e) => {
                        const v = (e.target.value || undefined) as
                          | "lt"
                          | "eq"
                          | "gt"
                          | undefined;
                        setTrigger({
                          ...trigger,
                          config: {
                            ...getCheerConfig(trigger),
                            bitsComparator: v,
                          },
                        });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                    >
                      <option value="">- Select -</option>
                      <option value="lt">Less than</option>
                      <option value="eq">Equal to</option>
                      <option value="gt">Greater than</option>
                    </select>
                    {validation.fieldErrors.bitsComparator && (
                      <p className="mt-1 text-xs text-red-600">
                        {validation.fieldErrors.bitsComparator[0]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="cheer-bits"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Bits
                    </label>
                    <input
                      id="cheer-bits"
                      type="number"
                      min={1}
                      value={getCheerConfig(trigger)?.bits ?? ""}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setTrigger({
                          ...trigger,
                          config: { ...getCheerConfig(trigger), bits: val },
                        });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                    />
                    {validation.fieldErrors.bits && (
                      <p className="mt-1 text-xs text-red-600">
                        {validation.fieldErrors.bits[0]}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {(trigger?.type === "time.atDateTime" ||
              trigger?.type === "time.dailyAt" ||
              trigger?.type === "time.everyNMinutes" ||
              trigger?.type === "time.minuteOfHour" ||
              trigger?.type === "time.weeklyAt" ||
              trigger?.type === "time.monthlyOn") && (
              <section className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Time-based Configuration
                </h3>
                <div className="space-y-4">
                  {(() => {
                    const next = getNextActivation(trigger);
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-sm text-gray-700">
                        <span className="font-medium">Next activation: </span>
                        {formatNextActivation(next.when, next.timezone)}
                      </div>
                    );
                  })()}
                  {trigger?.type === "time.weeklyAt" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Day of Week
                        </label>
                        <select
                          value={getWeeklyAtConfig(trigger)?.dayOfWeek ?? 0}
                          onChange={(e) => {
                            const base =
                              getWeeklyAtConfig(trigger) ||
                              ({
                                dayOfWeek: 1,
                                time: "09:00",
                                timezone: moment.tz.guess(),
                              } as {
                                dayOfWeek: number;
                                time: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger!,
                              config: {
                                ...base,
                                dayOfWeek: parseInt(e.target.value, 10),
                              },
                            });
                          }}
                          disabled={trigger?.enabled === false}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        >
                          {dayOfWeekOptions.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time (HH:mm)
                        </label>
                        <input
                          type="time"
                          value={getWeeklyAtConfig(trigger)?.time || "09:00"}
                          onChange={(e) => {
                            const base =
                              getWeeklyAtConfig(trigger) ||
                              ({
                                dayOfWeek: 1,
                                time: "09:00",
                                timezone: moment.tz.guess(),
                              } as {
                                dayOfWeek: number;
                                time: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger!,
                              config: { ...base, time: e.target.value },
                            });
                          }}
                          disabled={trigger?.enabled === false}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Timezone
                        </label>
                        <select
                          value={
                            getWeeklyAtConfig(trigger)?.timezone ||
                            moment.tz.guess()
                          }
                          onChange={(e) => {
                            const base =
                              getWeeklyAtConfig(trigger) ||
                              ({
                                dayOfWeek: 1,
                                time: "09:00",
                                timezone: moment.tz.guess(),
                              } as {
                                dayOfWeek: number;
                                time: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger!,
                              config: { ...base, timezone: e.target.value },
                            });
                          }}
                          disabled={trigger?.enabled === false}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        >
                          {timezoneOptions.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  {trigger?.type === "time.monthlyOn" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Day of Month
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={getMonthlyOnConfig(trigger)?.dayOfMonth ?? 1}
                          onChange={(e) => {
                            const val = Math.max(
                              1,
                              Math.min(31, Number(e.target.value) || 1)
                            );
                            const base =
                              getMonthlyOnConfig(trigger) ||
                              ({
                                dayOfMonth: 1,
                                time: "09:00",
                                timezone: moment.tz.guess(),
                              } as {
                                dayOfMonth: number;
                                time: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger!,
                              config: { ...base, dayOfMonth: val },
                            });
                          }}
                          disabled={trigger?.enabled === false}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time (HH:mm)
                        </label>
                        <input
                          type="time"
                          value={getMonthlyOnConfig(trigger)?.time || "09:00"}
                          onChange={(e) => {
                            const base =
                              getMonthlyOnConfig(trigger) ||
                              ({
                                dayOfMonth: 1,
                                time: "09:00",
                                timezone: moment.tz.guess(),
                              } as {
                                dayOfMonth: number;
                                time: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger!,
                              config: { ...base, time: e.target.value },
                            });
                          }}
                          disabled={trigger?.enabled === false}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Timezone
                        </label>
                        <select
                          value={
                            getMonthlyOnConfig(trigger)?.timezone ||
                            moment.tz.guess()
                          }
                          onChange={(e) => {
                            const base =
                              getMonthlyOnConfig(trigger) ||
                              ({
                                dayOfMonth: 1,
                                time: "09:00",
                                timezone: moment.tz.guess(),
                              } as {
                                dayOfMonth: number;
                                time: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger!,
                              config: { ...base, timezone: e.target.value },
                            });
                          }}
                          disabled={trigger?.enabled === false}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        >
                          {timezoneOptions.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  {trigger?.type === "time.atDateTime" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="at-datetime"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          ISO Date-Time
                        </label>
                        <input
                          id="at-datetime"
                          type="datetime-local"
                          value={(() => {
                            const cfg = getAtDateTimeConfig(trigger);
                            if (!cfg?.isoDateTime) return "";
                            try {
                              return moment(cfg.isoDateTime)
                                .tz(cfg.timezone)
                                .format("YYYY-MM-DDTHH:mm");
                            } catch {
                              return "";
                            }
                          })()}
                          onChange={(e) => {
                            const current = getAtDateTimeConfig(trigger);
                            const tz = current?.timezone || moment.tz.guess();
                            const iso = e.target.value
                              ? moment
                                  .tz(e.target.value, "YYYY-MM-DDTHH:mm", tz)
                                  .toISOString()
                              : new Date().toISOString();
                            const base =
                              current ||
                              ({
                                isoDateTime: new Date().toISOString(),
                                timezone: tz,
                              } as {
                                isoDateTime: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger,
                              config: { ...base, isoDateTime: iso },
                            });
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        />
                        {validation.fieldErrors.isoDateTime && (
                          <p className="mt-1 text-xs text-red-600">
                            {validation.fieldErrors.isoDateTime[0]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="at-timezone"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Timezone
                        </label>
                        <select
                          id="at-timezone"
                          value={
                            getAtDateTimeConfig(trigger)?.timezone ||
                            moment.tz.guess()
                          }
                          onChange={(e) => {
                            const base =
                              getAtDateTimeConfig(trigger) ||
                              ({
                                isoDateTime: new Date().toISOString(),
                                timezone: moment.tz.guess(),
                              } as {
                                isoDateTime: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger!,
                              config: { ...base, timezone: e.target.value },
                            });
                          }}
                          disabled={trigger?.enabled === false}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        >
                          {timezoneOptions.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                        {validation.fieldErrors.timezone && (
                          <p className="mt-1 text-xs text-red-600">
                            {validation.fieldErrors.timezone[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {trigger?.type === "time.dailyAt" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="daily-time"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Time (HH:mm)
                        </label>
                        <input
                          id="daily-time"
                          type="time"
                          value={getDailyAtConfig(trigger)?.time || "09:00"}
                          onChange={(e) => {
                            const base =
                              getDailyAtConfig(trigger) ||
                              ({ time: "09:00", timezone: "UTC" } as {
                                time: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger,
                              config: { ...base, time: e.target.value },
                            });
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        />
                        {validation.fieldErrors.time && (
                          <p className="mt-1 text-xs text-red-600">
                            {validation.fieldErrors.time[0]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="daily-timezone"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Timezone
                        </label>
                        <select
                          id="daily-timezone"
                          value={
                            getDailyAtConfig(trigger)?.timezone ||
                            moment.tz.guess()
                          }
                          onChange={(e) => {
                            const base =
                              getDailyAtConfig(trigger) ||
                              ({
                                time: "09:00",
                                timezone: moment.tz.guess(),
                              } as {
                                time: string;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger!,
                              config: { ...base, timezone: e.target.value },
                            });
                          }}
                          disabled={trigger?.enabled === false}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        >
                          {timezoneOptions.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                        {validation.fieldErrors.timezone && (
                          <p className="mt-1 text-xs text-red-600">
                            {validation.fieldErrors.timezone[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {trigger?.type === "time.everyNMinutes" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label
                            htmlFor="every-interval"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Interval (minutes)
                          </label>
                          <input
                            id="every-interval"
                            type="number"
                            min={1}
                            value={
                              getEveryNMinutesConfig(trigger)
                                ?.intervalMinutes ?? 15
                            }
                            onChange={(e) => {
                              const val = Math.max(
                                1,
                                Number(e.target.value) || 1
                              );
                              const base =
                                getEveryNMinutesConfig(trigger) ||
                                ({ intervalMinutes: 15, timezone: "UTC" } as {
                                  intervalMinutes: number;
                                  timezone: string;
                                  anchor?:
                                    | { kind: "topOfHour" }
                                    | {
                                        kind: "custom";
                                        isoDateTime: string;
                                        timezone: string;
                                      };
                                });
                              setTrigger({
                                ...trigger,
                                config: { ...base, intervalMinutes: val },
                              });
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                          />
                          {validation.fieldErrors.intervalMinutes && (
                            <p className="mt-1 text-xs text-red-600">
                              {validation.fieldErrors.intervalMinutes[0]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor="every-timezone"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Timezone
                          </label>
                          <select
                            id="every-timezone"
                            value={
                              getEveryNMinutesConfig(trigger)?.timezone ||
                              moment.tz.guess()
                            }
                            onChange={(e) => {
                              const base =
                                getEveryNMinutesConfig(trigger) ||
                                ({
                                  intervalMinutes: 15,
                                  timezone: moment.tz.guess(),
                                } as {
                                  intervalMinutes: number;
                                  timezone: string;
                                  anchor?:
                                    | { kind: "topOfHour" }
                                    | {
                                        kind: "custom";
                                        isoDateTime: string;
                                        timezone: string;
                                      };
                                });
                              setTrigger({
                                ...trigger!,
                                config: { ...base, timezone: e.target.value },
                              });
                            }}
                            disabled={trigger?.enabled === false}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                          >
                            {timezoneOptions.map((tz) => (
                              <option key={tz.value} value={tz.value}>
                                {tz.label}
                              </option>
                            ))}
                          </select>
                          {validation.fieldErrors.timezone && (
                            <p className="mt-1 text-xs text-red-600">
                              {validation.fieldErrors.timezone[0]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor="every-anchor"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Anchor
                          </label>
                          <select
                            id="every-anchor"
                            value={(() => {
                              const a = getEveryNMinutesConfig(trigger)?.anchor;
                              return a?.kind === "custom"
                                ? "custom"
                                : "topOfHour";
                            })()}
                            onChange={(e) => {
                              const kind =
                                e.target.value === "custom"
                                  ? "custom"
                                  : "topOfHour";
                              const existing =
                                getEveryNMinutesConfig(trigger) ||
                                ({ intervalMinutes: 15, timezone: "UTC" } as {
                                  intervalMinutes: number;
                                  timezone: string;
                                  anchor?:
                                    | { kind: "topOfHour" }
                                    | {
                                        kind: "custom";
                                        isoDateTime: string;
                                        timezone: string;
                                      };
                                });
                              const nextAnchor =
                                kind === "topOfHour"
                                  ? { kind: "topOfHour" as const }
                                  : ({
                                      kind: "custom",
                                      isoDateTime: new Date().toISOString(),
                                      timezone: existing.timezone,
                                    } as const);
                              setTrigger({
                                ...trigger,
                                config: { ...existing, anchor: nextAnchor },
                              });
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                          >
                            <option value="topOfHour">Top of hour</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                      </div>

                      {getEveryNMinutesConfig(trigger)?.anchor?.kind ===
                        "custom" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="every-custom-iso"
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Custom Anchor (ISO)
                            </label>
                            <input
                              id="every-custom-iso"
                              type="datetime-local"
                              value={(() => {
                                const a =
                                  getEveryNMinutesConfig(trigger)?.anchor;
                                const v =
                                  a && a.kind === "custom" ? a.isoDateTime : "";
                                if (!v) return "";
                                try {
                                  return v
                                    .replace(/\.\d{3}Z$/, "")
                                    .slice(0, 16);
                                } catch {
                                  return "";
                                }
                              })()}
                              onChange={(e) => {
                                const existing =
                                  getEveryNMinutesConfig(trigger) ||
                                  ({ intervalMinutes: 15, timezone: "UTC" } as {
                                    intervalMinutes: number;
                                    timezone: string;
                                    anchor?:
                                      | { kind: "topOfHour" }
                                      | {
                                          kind: "custom";
                                          isoDateTime: string;
                                          timezone: string;
                                        };
                                  });
                                const a = existing.anchor;
                                if (!a || a.kind !== "custom") return;
                                const iso = e.target.value
                                  ? new Date(e.target.value).toISOString()
                                  : new Date().toISOString();
                                setTrigger({
                                  ...trigger,
                                  config: {
                                    ...existing,
                                    anchor: { ...a, isoDateTime: iso },
                                  },
                                });
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                            />
                            {validation.fieldErrors["anchor.isoDateTime"] && (
                              <p className="mt-1 text-xs text-red-600">
                                {
                                  validation.fieldErrors[
                                    "anchor.isoDateTime"
                                  ][0]
                                }
                              </p>
                            )}
                          </div>
                          <div>
                            <label
                              htmlFor="every-custom-tz"
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Anchor Timezone
                            </label>
                            <select
                              id="every-custom-tz"
                              value={(() => {
                                const a =
                                  getEveryNMinutesConfig(trigger)?.anchor;
                                return a && a.kind === "custom"
                                  ? a.timezone
                                  : moment.tz.guess();
                              })()}
                              onChange={(e) => {
                                const existing =
                                  getEveryNMinutesConfig(trigger) ||
                                  ({
                                    intervalMinutes: 15,
                                    timezone: moment.tz.guess(),
                                  } as {
                                    intervalMinutes: number;
                                    timezone: string;
                                    anchor?:
                                      | { kind: "topOfHour" }
                                      | {
                                          kind: "custom";
                                          isoDateTime: string;
                                          timezone: string;
                                        };
                                  });
                                const a = existing.anchor;
                                if (!a || a.kind !== "custom") return;
                                setTrigger({
                                  ...trigger!,
                                  config: {
                                    ...existing,
                                    anchor: { ...a, timezone: e.target.value },
                                  },
                                });
                              }}
                              disabled={trigger?.enabled === false}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                            >
                              {timezoneOptions.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                  {tz.label}
                                </option>
                              ))}
                            </select>
                            {validation.fieldErrors["anchor.timezone"] && (
                              <p className="mt-1 text-xs text-red-600">
                                {validation.fieldErrors["anchor.timezone"][0]}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {trigger?.type === "time.minuteOfHour" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="minute-minute"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Minute (0-59)
                        </label>
                        <input
                          id="minute-minute"
                          type="number"
                          min={0}
                          max={59}
                          value={getMinuteOfHourConfig(trigger)?.minute ?? 0}
                          onChange={(e) => {
                            const val = Math.max(
                              0,
                              Math.min(59, Number(e.target.value) || 0)
                            );
                            const base =
                              getMinuteOfHourConfig(trigger) ||
                              ({ minute: 0, timezone: "UTC" } as {
                                minute: number;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger,
                              config: { ...base, minute: val },
                            });
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        />
                        {validation.fieldErrors.minute && (
                          <p className="mt-1 text-xs text-red-600">
                            {validation.fieldErrors.minute[0]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="minute-timezone"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Timezone
                        </label>
                        <select
                          id="minute-timezone"
                          value={
                            getMinuteOfHourConfig(trigger)?.timezone ||
                            moment.tz.guess()
                          }
                          onChange={(e) => {
                            const base =
                              getMinuteOfHourConfig(trigger) ||
                              ({ minute: 0, timezone: moment.tz.guess() } as {
                                minute: number;
                                timezone: string;
                              });
                            setTrigger({
                              ...trigger!,
                              config: { ...base, timezone: e.target.value },
                            });
                          }}
                          disabled={trigger?.enabled === false}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                        >
                          {timezoneOptions.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                        {validation.fieldErrors.timezone && (
                          <p className="mt-1 text-xs text-red-600">
                            {validation.fieldErrors.timezone[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800">
                  Metadata
                </h3>
                <button
                  type="button"
                  className="text-sm text-gray-700 border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-50"
                  onClick={() => setShowMetadata((v) => !v)}
                  aria-label="Toggle metadata"
                >
                  {showMetadata ? "Hide" : "Show"}
                </button>
              </div>
              {showMetadata && (
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
              )}
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
