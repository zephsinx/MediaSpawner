import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  useCallback,
} from "react";
import { useStreamerbotCommands } from "../../hooks/useStreamerbotCommands";
import { HUICombobox } from "../common";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Switch";
import { StreamerbotService } from "../../services/streamerbotService";
import { toast } from "sonner";

const SBCommandAliasCombobox: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
  const { commands, loading, refresh } = useStreamerbotCommands();
  const options = React.useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    (commands || []).forEach((cmd) => {
      (cmd.commands || []).forEach((a) => {
        const key = a.toLowerCase();
        if (!seen.has(key) && a.trim()) {
          seen.add(key);
          out.push({ value: a, label: cmd.name });
        }
      });
    });
    out.sort((a, b) => a.value.localeCompare(b.value));
    return out;
  }, [commands]);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1">
        <HUICombobox
          value={value}
          onChange={onChange}
          onSelect={onChange}
          options={options}
          isLoading={loading}
          placeholder="Enter command alias (e.g., scene1, alert)"
        />
      </div>
      <button
        type="button"
        onClick={() => refresh()}
        disabled={loading}
        className="text-xs text-[rgb(var(--color-accent))] hover:text-[rgb(var(--color-accent-hover))] disabled:opacity-50"
      >
        Refresh
      </button>
    </div>
  );
};
import moment from "moment-timezone/builds/moment-timezone-with-data-1970-2030";
import { usePanelState } from "../../hooks/useLayout";
import { SpawnService } from "../../services/spawnService";
import type { Spawn } from "../../types/spawn";
import type { RandomizationBucket } from "../../types/spawn";
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
import { RandomizationBucketsSection } from "./RandomizationBucketsSection";
import { validateRandomizationBuckets } from "../../utils/randomizationBuckets";

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

const SpawnEditorWorkspace: React.FC = memo(() => {
  const {
    selectedSpawnId,
    selectedSpawnAssetId,
    centerPanelMode,
    setUnsavedChanges,
    hasUnsavedChanges,
    changeType,
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
  const hasUnsavedChangesRef = useRef<boolean>(false);
  const changeTypeRef = useRef<"none" | "spawn" | "asset">("none");
  const centerPanelModeRef = useRef<"spawn-settings" | "asset-settings">(
    centerPanelMode,
  );
  const selectedSpawnAssetIdRef = useRef<string | undefined>(
    selectedSpawnAssetId,
  );
  const [showModeSwitchDialog, setShowModeSwitchDialog] = useState(false);
  const [showAssetSwitchDialog, setShowAssetSwitchDialog] = useState(false);
  const [showTriggerTypeDialog, setShowTriggerTypeDialog] = useState(false);
  const pendingTriggerTypeRef = useRef<TriggerType | null>(null);
  const pendingAssetSwitchIdRef = useRef<string | null>(null);
  const prevSelectedSpawnAssetIdRef = useRef<string | undefined>(undefined);
  const [bucketsDraft, setBucketsDraft] = useState<RandomizationBucket[]>([]);
  const [duration, setDuration] = useState<number>(0);

  const assetDraftCacheRef = useRef<
    Record<
      string,
      {
        draftValues: Partial<MediaAssetProperties>;
      }
    >
  >({});

  // Cache key validation and generation functions
  const validateCacheKey = useCallback(
    (
      spawnId: string | undefined,
      spawnAssetId: string | undefined,
    ): string | null => {
      if (!spawnId || !spawnAssetId) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "Cache key validation failed: missing spawnId or spawnAssetId",
            { spawnId, spawnAssetId },
          );
        }
        return null;
      }

      // Sanitize keys to prevent invalid characters
      const sanitizedSpawnId = spawnId.replace(/[|]/g, "_");
      const sanitizedSpawnAssetId = spawnAssetId.replace(/[|]/g, "_");

      const key = `${sanitizedSpawnId}|${sanitizedSpawnAssetId}`;

      if (process.env.NODE_ENV === "development") {
        console.debug("Generated cache key:", key, {
          originalSpawnId: spawnId,
          originalSpawnAssetId: spawnAssetId,
        });
      }

      return key;
    },
    [],
  );

  const generateCacheKey = useCallback(
    (spawnId: string | undefined, spawnAssetId: string | undefined): string => {
      const key = validateCacheKey(spawnId, spawnAssetId);
      if (!key) {
        throw new Error(
          `Invalid cache key parameters: spawnId=${spawnId}, spawnAssetId=${spawnAssetId}`,
        );
      }
      return key;
    },
    [validateCacheKey],
  );

  // Cache isolation boundary validation functions
  const validateCacheScope = useCallback(
    (
      spawnId: string | undefined,
      spawnAssetId: string | undefined,
      operation: string,
    ) => {
      if (!spawnId || !spawnAssetId) {
        const error = `Cache ${operation} failed: missing spawnId or spawnAssetId`;
        if (process.env.NODE_ENV === "development") {
          console.error(error, { spawnId, spawnAssetId, operation });
        }
        throw new Error(error);
      }

      // Validate that we're operating on the currently selected spawn
      if (spawnId !== selectedSpawnId) {
        const error = `Cache ${operation} boundary violation: spawnId mismatch (expected: ${selectedSpawnId}, got: ${spawnId})`;
        if (process.env.NODE_ENV === "development") {
          console.error(error, {
            expectedSpawnId: selectedSpawnId,
            actualSpawnId: spawnId,
            spawnAssetId,
            operation,
          });
        }
        throw new Error(error);
      }

      if (process.env.NODE_ENV === "development") {
        console.debug(`Cache ${operation} scope validated:`, {
          spawnId,
          spawnAssetId,
        });
      }
    },
    [selectedSpawnId],
  );

  const validateAssetScope = useCallback(
    (spawnAssetId: string | undefined, operation: string) => {
      if (!spawnAssetId) {
        const error = `Asset ${operation} failed: missing spawnAssetId`;
        if (process.env.NODE_ENV === "development") {
          console.error(error, { spawnAssetId, operation });
        }
        throw new Error(error);
      }

      // Validate that we're operating on the currently selected asset (if in asset-settings mode)
      if (
        centerPanelMode === "asset-settings" &&
        spawnAssetId !== selectedSpawnAssetId
      ) {
        const error = `Asset ${operation} boundary violation: spawnAssetId mismatch (expected: ${selectedSpawnAssetId}, got: ${spawnAssetId})`;
        if (process.env.NODE_ENV === "development") {
          console.error(error, {
            expectedSpawnAssetId: selectedSpawnAssetId,
            actualSpawnAssetId: spawnAssetId,
            operation,
          });
        }
        throw new Error(error);
      }

      if (process.env.NODE_ENV === "development") {
        console.debug(`Asset ${operation} scope validated:`, { spawnAssetId });
      }
    },
    [centerPanelMode, selectedSpawnAssetId],
  );

  // Immutable cache operations helper functions with isolation validation
  const setCacheEntry = useCallback(
    (
      spawnId: string | undefined,
      spawnAssetId: string | undefined,
      draft: { draftValues: Partial<MediaAssetProperties> },
    ) => {
      validateCacheScope(spawnId, spawnAssetId, "set");
      validateAssetScope(spawnAssetId, "set");

      const key = generateCacheKey(spawnId, spawnAssetId);
      if (process.env.NODE_ENV === "development") {
        console.debug("Setting cache entry:", key, draft);
      }
      assetDraftCacheRef.current = {
        ...assetDraftCacheRef.current,
        [key]: draft,
      };
    },
    [generateCacheKey, validateCacheScope, validateAssetScope],
  );

  const getCacheEntry = useCallback(
    (spawnId: string | undefined, spawnAssetId: string | undefined) => {
      validateCacheScope(spawnId, spawnAssetId, "get");
      validateAssetScope(spawnAssetId, "get");

      const key = generateCacheKey(spawnId, spawnAssetId);
      const entry = assetDraftCacheRef.current[key];
      if (process.env.NODE_ENV === "development") {
        console.debug(
          "Getting cache entry:",
          key,
          entry ? "found" : "not found",
        );
      }
      return entry;
    },
    [generateCacheKey, validateCacheScope, validateAssetScope],
  );

  const clearCacheEntry = useCallback(
    (spawnId: string | undefined, spawnAssetId: string | undefined) => {
      validateCacheScope(spawnId, spawnAssetId, "clear");
      validateAssetScope(spawnAssetId, "clear");

      const key = generateCacheKey(spawnId, spawnAssetId);
      if (process.env.NODE_ENV === "development") {
        console.debug("Clearing cache entry:", key);
      }
      const newCache = { ...assetDraftCacheRef.current };
      delete newCache[key];
      assetDraftCacheRef.current = newCache;
    },
    [generateCacheKey, validateCacheScope, validateAssetScope],
  );

  // Special cache operations for system-level clearing (bypasses asset scope validation)
  const clearCacheEntryUnsafe = useCallback(
    (spawnId: string | undefined, spawnAssetId: string | undefined) => {
      // Only validate cache scope, not asset scope (for system operations)
      validateCacheScope(spawnId, spawnAssetId, "clear-unsafe");

      const key = generateCacheKey(spawnId, spawnAssetId);
      if (process.env.NODE_ENV === "development") {
        console.debug("Clearing cache entry (unsafe):", key);
      }
      const newCache = { ...assetDraftCacheRef.current };
      delete newCache[key];
      assetDraftCacheRef.current = newCache;
    },
    [generateCacheKey, validateCacheScope],
  );

  const clearAllCacheEntries = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("Clearing all cache entries");
    }
    assetDraftCacheRef.current = {};
  }, []);

  const [showMetadata, setShowMetadata] = useState<boolean>(true);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const validation = useMemo(() => validateTrigger(trigger), [trigger]);

  // Get modal content based on change type
  const getModalContent = useCallback(() => {
    const currentChangeType = changeTypeRef.current;
    switch (currentChangeType) {
      case "spawn":
        return {
          title: "Unsaved Spawn Changes",
          message: "Switching will discard asset list changes. Continue?",
        };
      case "asset":
        return {
          title: "Unsaved Asset Settings",
          message: "Switching will discard property changes. Continue?",
        };
      default:
        return {
          title: "Unsaved Changes",
          message: "Switching modes will not save your changes. Continue?",
        };
    }
  }, []);
  const bucketValidation = useMemo(() => {
    if (!selectedSpawn) return { isValid: true, errors: [] as string[] };
    const candidate = {
      ...selectedSpawn,
      randomizationBuckets: bucketsDraft,
    } as Spawn;
    return validateRandomizationBuckets(candidate);
  }, [selectedSpawn, bucketsDraft]);

  // Create refs for latest state
  const selectedSpawnIdRef = useRef(selectedSpawnId);
  const setSelectedSpawnRef = useRef(setSelectedSpawn);
  const setNameRef = useRef(setName);
  const setDescriptionRef = useRef(setDescription);

  selectedSpawnIdRef.current = selectedSpawnId;
  setSelectedSpawnRef.current = setSelectedSpawn;
  setNameRef.current = setName;
  setDescriptionRef.current = setDescription;

  // Clear all cache entries when spawn changes to prevent cross-spawn contamination
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("Spawn changed, clearing all cache entries");
    }
    clearAllCacheEntries();
  }, [selectedSpawnId, clearAllCacheEntries]);

  // Stable event listener - only re-registered when IDs change
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
      if (detail.spawnId !== selectedSpawnIdRef.current) return;
      if (detail.updatedSpawn) {
        setSelectedSpawnRef.current(detail.updatedSpawn);
        setNameRef.current(detail.updatedSpawn.name);
        setDescriptionRef.current(detail.updatedSpawn.description || "");
        return;
      }
      void load();
    };
    window.addEventListener(
      "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
      onUpdated as EventListener,
    );
    return () => {
      isActive = false;
      window.removeEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        onUpdated as EventListener,
      );
    };
  }, [selectedSpawnId]);

  // Keep hasUnsavedChanges and changeType refs in sync
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
    changeTypeRef.current = changeType;
  }, [hasUnsavedChanges, changeType]);

  // Keep centerPanelMode and selectedSpawnAssetId refs in sync
  useEffect(() => {
    centerPanelModeRef.current = centerPanelMode;
    selectedSpawnAssetIdRef.current = selectedSpawnAssetId;
  }, [centerPanelMode, selectedSpawnAssetId]);

  // Create refs for latest state for mode switching
  const selectSpawnAssetRef = useRef(selectSpawnAsset);
  const setCenterPanelModeRef = useRef(setCenterPanelMode);
  const setShowModeSwitchDialogRef = useRef(setShowModeSwitchDialog);

  selectSpawnAssetRef.current = selectSpawnAsset;
  setCenterPanelModeRef.current = setCenterPanelMode;
  setShowModeSwitchDialogRef.current = setShowModeSwitchDialog;

  useEffect(() => {
    const onRequestSwitch = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | {
            mode: "spawn-settings" | "asset-settings";
            spawnAssetId?: string;
            skipGuard?: boolean;
          }
        | undefined;
      if (!detail) return;

      // Check skipGuard first to avoid checking stale refs when bypassing
      if (
        !detail.skipGuard &&
        hasUnsavedChangesRef.current &&
        changeTypeRef.current !== "none"
      ) {
        // Special case: If we're in asset-settings mode and switching to a different asset,
        // let the useEffect at line 395 handle the guard check to avoid double dialogs
        const isAssetToAssetSwitch =
          centerPanelModeRef.current === "asset-settings" &&
          detail.mode === "asset-settings" &&
          detail.spawnAssetId &&
          detail.spawnAssetId !== selectedSpawnAssetIdRef.current &&
          changeTypeRef.current === "asset";

        if (!isAssetToAssetSwitch) {
          switchPendingRef.current = detail;
          setShowModeSwitchDialogRef.current(true);
          return;
        }
      }

      if (detail.mode === "asset-settings" && detail.spawnAssetId) {
        selectSpawnAssetRef.current(detail.spawnAssetId);
        setCenterPanelModeRef.current("asset-settings");
      } else if (detail.mode === "spawn-settings") {
        setCenterPanelModeRef.current("spawn-settings");
        selectSpawnAssetRef.current(undefined);
      }
    };
    window.addEventListener(
      "mediaspawner:request-center-switch" as unknown as keyof WindowEventMap,
      onRequestSwitch as EventListener,
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:request-center-switch" as unknown as keyof WindowEventMap,
        onRequestSwitch as EventListener,
      );
    };
  }, []); // Empty dependency array - event listener never re-registers

  useEffect(() => {
    if (selectedSpawn) {
      setName(selectedSpawn.name);
      setDescription(selectedSpawn.description || "");
      setEnabled(!!selectedSpawn.enabled);
      setTrigger(selectedSpawn.trigger || getDefaultTrigger("manual"));
      setDuration(selectedSpawn.duration);
      setBucketsDraft([...(selectedSpawn.randomizationBuckets || [])]);
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
    const baselineEnabled = !!selectedSpawn.enabled;
    const triggerChanged =
      JSON.stringify(trigger) !== JSON.stringify(selectedSpawn.trigger || null);
    const durationChanged = duration !== selectedSpawn.duration;
    const bucketsChanged =
      JSON.stringify(bucketsDraft || []) !==
      JSON.stringify(selectedSpawn.randomizationBuckets || []);
    return (
      name !== baselineName ||
      description !== baselineDesc ||
      enabled !== baselineEnabled ||
      durationChanged ||
      triggerChanged ||
      bucketsChanged
    );
  }, [
    name,
    description,
    enabled,
    selectedSpawn,
    duration,
    trigger,
    bucketsDraft,
  ]);

  useEffect(() => {
    // Only update when dirty state changes to avoid unnecessary context re-renders
    setUnsavedChanges(!!isDirty, isDirty ? "spawn" : "none");
  }, [isDirty, setUnsavedChanges]);

  // Detect asset-to-asset switches and show confirmation dialog
  useEffect(() => {
    // Skip on initial render
    if (prevSelectedSpawnAssetIdRef.current === undefined) {
      prevSelectedSpawnAssetIdRef.current = selectedSpawnAssetId;
      return;
    }

    // Detect asset switch while in asset-settings mode
    if (
      centerPanelMode === "asset-settings" &&
      selectedSpawnAssetId !== prevSelectedSpawnAssetIdRef.current &&
      hasUnsavedChanges &&
      changeType === "asset"
    ) {
      // Revert to previous asset temporarily
      selectSpawnAsset(prevSelectedSpawnAssetIdRef.current);
      // Store pending switch
      pendingAssetSwitchIdRef.current = selectedSpawnAssetId || null;
      // Show confirmation
      setShowAssetSwitchDialog(true);
      return;
    }

    prevSelectedSpawnAssetIdRef.current = selectedSpawnAssetId;
  }, [
    selectedSpawnAssetId,
    centerPanelMode,
    hasUnsavedChanges,
    changeType,
    selectSpawnAsset,
  ]);

  // Cleanup cache on component unmount
  useEffect(() => {
    return () => {
      if (process.env.NODE_ENV === "development") {
        console.debug("Component unmounting, clearing cache");
      }
      clearAllCacheEntries();
    };
  }, [clearAllCacheEntries]);

  const trimmedName = name.trim();
  const isNameNonEmpty = trimmedName.length > 0;
  const isNameUnique = useMemo(() => {
    if (!selectedSpawn) return true;
    const lower = trimmedName.toLowerCase();
    return !allSpawnsCache.some(
      (s) => s.id !== selectedSpawn.id && s.name.toLowerCase() === lower,
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
    validation.errors.length > 0 ||
    !bucketValidation.isValid;

  const handleCancel = useCallback(() => {
    if (!selectedSpawn) return;
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    setName(selectedSpawn.name);
    setDescription(selectedSpawn.description || "");
    setEnabled(!!selectedSpawn.enabled);
    setTrigger(selectedSpawn.trigger || getDefaultTrigger("manual"));
    setDuration(selectedSpawn.duration);
    setSaveError(null);
    setSaveSuccess(null);
  }, [
    selectedSpawn,
    isDirty,
    setShowDiscardDialog,
    setName,
    setDescription,
    setEnabled,
    setTrigger,
    setDuration,
    setSaveError,
    setSaveSuccess,
  ]);

  const handleSave = useCallback(async () => {
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
      const result = await SpawnService.updateSpawn(selectedSpawn.id, {
        name: trimmedName,
        description: description.trim() || undefined,
        enabled,
        trigger: trigger || undefined,
        duration,
        randomizationBuckets: bucketsDraft,
      });
      if (!result.success || !result.spawn) {
        setSaveError(result.error || "Failed to save spawn");
        return;
      }
      // Sync form fields immediately so dirty resets without waiting for effects
      setName(result.spawn.name);
      setDescription(result.spawn.description || "");
      setEnabled(!!result.spawn.enabled);
      setTrigger(result.spawn.trigger || getDefaultTrigger("manual"));
      setSelectedSpawn(result.spawn);
      setSaveSuccess("Changes saved");
      // Notify other panels and list of updates (e.g., name change)
      window.dispatchEvent(
        new CustomEvent(
          "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
          {
            detail: { spawnId: result.spawn.id, updatedSpawn: result.spawn },
          } as CustomEventInit,
        ),
      );
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save spawn");
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedSpawn,
    isSaveDisabled,
    trigger,
    isCommandAliasValid,
    isChannelPointConfigValid,
    setIsSaving,
    setSaveError,
    setSaveSuccess,
    trimmedName,
    description,
    enabled,
    duration,
    bucketsDraft,
    setName,
    setDescription,
    setEnabled,
    setTrigger,
    setSelectedSpawn,
  ]);

  const handleTestSpawn = useCallback(async () => {
    if (!selectedSpawn || isTesting) return;

    setIsTesting(true);

    try {
      const success = await StreamerbotService.testSpawn(selectedSpawn.id);

      if (success) {
        toast.success(`Successfully tested spawn: ${selectedSpawn.name}`);
      } else {
        toast.error(`Failed to test spawn: ${selectedSpawn.name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Error testing spawn: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  }, [selectedSpawn, isTesting]);

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
        <div className="p-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/5">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-fg))]">
            Spawn Editor
          </h2>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Select a spawn to edit its settings
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-[rgb(var(--color-muted-foreground))]">
            Select a spawn from the list to begin editing.
          </div>
        </div>
      </div>
    );
  }

  // Render all confirmation dialogs at the top level so they're always in the render tree
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
            console.debug("Discarding changes, clearing cache");
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
              "Mode switch confirmed, clearing cache for mode change",
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
              console.debug("Spawn deleted, clearing cache");
            }
            clearAllCacheEntries();

            // Notify list to remove and clear selection
            window.dispatchEvent(
              new CustomEvent<{ id: string }>("mediaspawner:spawn-deleted", {
                detail: { id: selectedSpawn.id },
              }),
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
              e instanceof Error ? e.message : "Failed to delete spawn",
            );
            setShowDeleteDialog(false);
          }
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Conditionally render Asset Settings or Spawn Editor */}
      {centerPanelMode === "asset-settings" &&
      selectedSpawnId &&
      selectedSpawnAssetId ? (
        <AssetSettingsForm
          key={selectedSpawnAssetId}
          spawnId={selectedSpawnId}
          spawnAssetId={selectedSpawnAssetId}
          onBack={(skipGuard = false) => {
            window.dispatchEvent(
              new CustomEvent(
                "mediaspawner:request-center-switch" as unknown as keyof WindowEventMap,
                {
                  detail: { mode: "spawn-settings", skipGuard },
                } as CustomEventInit,
              ),
            );
          }}
          getCachedDraft={() =>
            getCacheEntry(selectedSpawnId, selectedSpawnAssetId)
          }
          setCachedDraft={(draft) =>
            setCacheEntry(selectedSpawnId, selectedSpawnAssetId, draft)
          }
          clearCachedDraft={(id) => {
            clearCacheEntry(selectedSpawnId, id);
          }}
        />
      ) : (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[rgb(var(--color-fg))]">
                Spawn Editor
              </h2>
              {hasUnsavedChanges && (
                <span className="text-[rgb(var(--color-warning))] text-sm font-medium">
                  • Unsaved changes
                </span>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-1">
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                {selectedSpawn
                  ? `Editing: ${selectedSpawn.name}`
                  : "Loading spawn..."}
              </p>
              <div className="flex items-center gap-2">
                {selectedSpawn && (
                  <>
                    <Button
                      type="button"
                      onClick={handleTestSpawn}
                      variant="outline"
                      size="sm"
                      disabled={isTesting}
                      loading={isTesting}
                      aria-label="Test spawn"
                    >
                      Test
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setShowDeleteDialog(true);
                      }}
                      variant="destructive"
                      size="sm"
                      aria-label="Delete spawn"
                    >
                      Delete
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  aria-label="Cancel edits"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaveDisabled}
                  variant="primary"
                  size="sm"
                  loading={isSaving}
                  aria-label="Save spawn"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 p-4">
            {deleteError && (
              <div className="mb-4 p-3 bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error-border))] text-sm text-[rgb(var(--color-error))] rounded">
                {deleteError}
              </div>
            )}
            {saveError && (
              <div className="mb-4 p-3 bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error-border))] text-sm text-[rgb(var(--color-error))] rounded">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="mb-4 p-3 bg-[rgb(var(--color-success))]/10 border border-[rgb(var(--color-success))]/20 text-sm text-[rgb(var(--color-success))] rounded">
                {saveSuccess}
              </div>
            )}
            {selectedSpawn ? (
              <div className="max-w-2xl space-y-5">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))]">
                        Basic Details
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="spawn-enabled"
                          checked={enabled}
                          onCheckedChange={setEnabled}
                          aria-label="Enabled"
                        />
                        <label
                          htmlFor="spawn-enabled"
                          className="text-sm text-[rgb(var(--color-fg))] cursor-pointer"
                        >
                          Enabled
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 flex items-center gap-2 text-xs">
                      {validation.errors.length > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-[rgb(var(--color-error-bg))] text-[rgb(var(--color-error))]">
                          Invalid
                        </span>
                      ) : validation.warnings.length > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-[rgb(var(--color-warning))]/10 text-[rgb(var(--color-warning))]">
                          Warning
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[rgb(var(--color-success))]/10 text-[rgb(var(--color-success))]">
                          Valid
                        </span>
                      )}
                      {validation.warnings.length > 0 && (
                        <span className="text-[rgb(var(--color-muted-foreground))]">
                          {validation.warnings[0]}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          id="spawn-name"
                          type="text"
                          label="Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          error={
                            !trimmedName
                              ? "Name is required"
                              : !isNameValid
                                ? "Name must be unique"
                                : undefined
                          }
                        />
                      </div>

                      <div>
                        <Input
                          id="spawn-duration"
                          type="number"
                          label="Duration (ms)"
                          value={duration}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDuration(val >= 0 ? val : 0);
                          }}
                          min={0}
                          error={
                            duration < 0
                              ? "Duration must be non-negative"
                              : undefined
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Input
                          id="spawn-description"
                          type="text"
                          label="Description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))]">
                        Trigger
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={trigger?.enabled !== false}
                          onCheckedChange={(checked) => {
                            if (!trigger) return;
                            setTrigger({ ...trigger, enabled: checked });
                          }}
                          aria-label="Trigger Enabled"
                        />
                        <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
                          Trigger Enabled
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          id="trigger-type"
                          type="select"
                          label="Trigger Type"
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
                        >
                          <option value="manual">Manual</option>
                          <option value="time.atDateTime">
                            Time: At Date/Time
                          </option>
                          <option value="time.dailyAt">Time: Daily At</option>
                          <option value="time.everyNMinutes">
                            Time: Every N Minutes
                          </option>
                          <option value="time.weeklyAt">Time: Weekly At</option>
                          <option value="time.monthlyOn">
                            Time: Monthly On
                          </option>
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
                          <option value="twitch.giftSub">
                            Twitch: Gifted Subs
                          </option>
                          <option value="twitch.cheer">Twitch: Cheer</option>
                          <option value="twitch.follow">Twitch: Follow</option>
                        </Input>
                      </div>
                      <div className="md:col-span-2 text-xs text-[rgb(var(--color-muted-foreground))]">
                        {(() => {
                          const t = trigger?.type || "manual";
                          if (t === "manual") {
                            return (
                              <p>
                                Manual triggers are activated outside of
                                MediaSpawner. No configuration required.
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
                                Schedule triggers based on timezone-aware
                                date/time rules.
                              </p>
                            );
                          }
                          if (t === "streamerbot.command") {
                            return (
                              <p>
                                Streamer.bot command: configure command aliases
                                and platform sources.
                              </p>
                            );
                          }
                          if (t === "twitch.channelPointReward") {
                            return (
                              <p>
                                Twitch Channel Point reward redemption.
                                Configure reward details in a later story.
                              </p>
                            );
                          }
                          if (t === "twitch.subscription") {
                            return (
                              <p>
                                Configure subscription tier or minimum months.
                              </p>
                            );
                          }
                          if (t === "twitch.giftSub") {
                            return (
                              <p>
                                Configure gifted sub count and optional tier.
                              </p>
                            );
                          }
                          if (t === "twitch.cheer") {
                            return (
                              <p>Configure minimum bits required to trigger.</p>
                            );
                          }
                          if (t === "twitch.follow") {
                            return (
                              <p>
                                Twitch follow events. No additional
                                configuration required.
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Randomization Buckets */}
                <RandomizationBucketsSection
                  spawn={selectedSpawn}
                  buckets={bucketsDraft}
                  onChange={setBucketsDraft}
                />

                {trigger?.type === "streamerbot.command" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
                        Command Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Command Aliases */}
                        <div>
                          <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-2">
                            Command Aliases
                            {/* Refresh moved into SBCommandAliasCombobox */}
                          </label>
                          <div className="space-y-2">
                            {(getCommandConfig(trigger)?.aliases || [""]).map(
                              (alias: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <SBCommandAliasCombobox
                                    value={alias}
                                    onChange={(v) => {
                                      const newAliases = [
                                        ...(getCommandConfig(trigger)
                                          ?.aliases || [""]),
                                      ];
                                      newAliases[index] =
                                        typeof v === "string" ? v : "";
                                      setTrigger({
                                        ...trigger,
                                        config: {
                                          ...getCommandConfig(trigger),
                                          aliases: newAliases,
                                        },
                                      });
                                    }}
                                  />
                                  {(getCommandConfig(trigger)?.aliases || [""])
                                    .length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newAliases = (
                                          getCommandConfig(trigger)
                                            ?.aliases || [""]
                                        ).filter(
                                          (_: string, i: number) => i !== index,
                                        );
                                        setTrigger({
                                          ...trigger,
                                          config: {
                                            ...getCommandConfig(trigger),
                                            aliases: newAliases,
                                          },
                                        });
                                      }}
                                      className="px-2 py-1 text-[rgb(var(--color-error))] hover:text-[rgb(var(--color-error-hover))] hover:bg-[rgb(var(--color-error-bg))] rounded"
                                      aria-label="Remove command alias"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ),
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const newAliases = [
                                  ...(getCommandConfig(trigger)?.aliases || [
                                    "",
                                  ]),
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
                              className="px-3 py-1 text-sm text-[rgb(var(--color-accent))] hover:text-[rgb(var(--color-accent-hover))] hover:bg-[rgb(var(--color-accent))]/10 rounded border border-[rgb(var(--color-accent))]/20"
                            >
                              + Add Alias
                            </button>
                          </div>
                          {(() => {
                            const config = getCommandConfig(trigger);
                            const aliases = config?.aliases || [];
                            const hasEmptyAlias = aliases.some(
                              (a: string) => !a.trim(),
                            );
                            if (!aliases.length || hasEmptyAlias) {
                              return (
                                <p className="mt-1 text-xs text-[rgb(var(--color-error))]">
                                  At least one command alias is required
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Case Sensitivity */}
                        <div>
                          <div className="flex items-center gap-2">
                            <Switch
                              aria-label="Case sensitive"
                              checked={
                                getCommandConfig(trigger)?.caseSensitive ||
                                false
                              }
                              onCheckedChange={(checked) => {
                                setTrigger({
                                  ...trigger,
                                  config: {
                                    ...getCommandConfig(trigger),
                                    caseSensitive: checked,
                                  },
                                });
                              }}
                            />
                            <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
                              Case sensitive
                            </label>
                          </div>
                          <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                            When enabled, command matching will be
                            case-sensitive
                          </p>
                        </div>

                        {/* Platform Sources removed: Twitch-only support for now */}

                        {/* Filtering Options */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Switch
                                aria-label="Ignore internal messages"
                                checked={
                                  getCommandConfig(trigger)?.ignoreInternal !==
                                  false
                                }
                                onCheckedChange={(checked) => {
                                  setTrigger({
                                    ...trigger,
                                    config: {
                                      ...getCommandConfig(trigger),
                                      ignoreInternal: checked,
                                    },
                                  });
                                }}
                              />
                              <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
                                Ignore internal messages
                              </label>
                            </div>
                            <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                              Skip messages from internal/system sources
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <Switch
                                aria-label="Ignore bot account messages"
                                checked={
                                  getCommandConfig(trigger)
                                    ?.ignoreBotAccount !== false
                                }
                                onCheckedChange={(checked) => {
                                  setTrigger({
                                    ...trigger,
                                    config: {
                                      ...getCommandConfig(trigger),
                                      ignoreBotAccount: checked,
                                    },
                                  });
                                }}
                              />
                              <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
                                Ignore bot account messages
                              </label>
                            </div>
                            <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                              Skip messages from the bot account to avoid loops
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {trigger?.type === "twitch.channelPointReward" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
                        Channel Point Reward Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Reward Identifier */}
                        <div>
                          <Input
                            type="text"
                            label="Reward Identifier"
                            value={
                              getChannelPointConfig(trigger)
                                ?.rewardIdentifier || ""
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
                            error={
                              !getChannelPointConfig(
                                trigger,
                              )?.rewardIdentifier?.trim()
                                ? "Reward identifier is required"
                                : undefined
                            }
                            helperText="Enter the name or ID of the channel point reward from your Twitch channel"
                          />
                        </div>

                        {/* Use Viewer Input */}
                        <div>
                          <div className="flex items-center gap-2">
                            <Switch
                              aria-label="Use viewer input in spawn configuration"
                              checked={
                                getChannelPointConfig(trigger)
                                  ?.useViewerInput || false
                              }
                              onCheckedChange={(checked) => {
                                setTrigger({
                                  ...trigger,
                                  config: {
                                    ...getChannelPointConfig(trigger),
                                    useViewerInput: checked,
                                  },
                                });
                              }}
                            />
                            <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
                              Use viewer input in spawn configuration
                            </label>
                          </div>
                          <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                            When enabled, the viewer's message will be available
                            for use in spawn settings
                          </p>
                        </div>

                        {/* Redemption Statuses */}
                        <div>
                          <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-2">
                            Redemption Statuses
                          </label>
                          <div className="space-y-2">
                            {["pending", "fulfilled", "cancelled"].map(
                              (status) => (
                                <div
                                  key={status}
                                  className="flex items-center gap-2"
                                >
                                  <Switch
                                    aria-label={status}
                                    checked={(
                                      getChannelPointConfig(trigger)
                                        ?.statuses || ["fulfilled"]
                                    ).includes(status)}
                                    onCheckedChange={(checked) => {
                                      const currentStatuses =
                                        getChannelPointConfig(trigger)
                                          ?.statuses || ["fulfilled"];
                                      const newStatuses = checked
                                        ? [...currentStatuses, status]
                                        : currentStatuses.filter(
                                            (s: string) => s !== status,
                                          );
                                      setTrigger({
                                        ...trigger,
                                        config: {
                                          ...getChannelPointConfig(trigger),
                                          statuses: newStatuses,
                                        },
                                      });
                                    }}
                                  />
                                  <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer capitalize">
                                    {status}
                                  </label>
                                </div>
                              ),
                            )}
                          </div>
                          {(() => {
                            const config = getChannelPointConfig(trigger);
                            const statuses = config?.statuses || [];
                            if (statuses.length === 0) {
                              return (
                                <p className="mt-1 text-xs text-[rgb(var(--color-error))]">
                                  At least one redemption status must be
                                  selected
                                </p>
                              );
                            }
                            return null;
                          })()}
                          <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                            Select which redemption statuses should trigger this
                            spawn
                          </p>
                        </div>

                        {/* Help Text */}
                        <div className="bg-[rgb(var(--color-accent))]/10 border border-[rgb(var(--color-accent))]/20 rounded-lg p-3">
                          <p className="text-xs text-[rgb(var(--color-accent))]">
                            <strong>Note:</strong> Twitch handles all reward
                            logic including cooldowns, usage limits, and point
                            costs. MediaSpawner only configures when spawns
                            trigger based on redemption events.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {trigger?.type === "twitch.subscription" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
                        Subscription Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Input
                            id="sub-tier"
                            type="select"
                            label="Tier"
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
                          >
                            <option value="">Any</option>
                            <option value="1000">Tier 1</option>
                            <option value="2000">Tier 2</option>
                            <option value="3000">Tier 3</option>
                          </Input>
                        </div>
                        <div>
                          <Input
                            id="sub-months-comparator"
                            type="select"
                            label="Months Comparator"
                            value={
                              getSubscriptionConfig(trigger)
                                ?.monthsComparator ?? ""
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
                            error={validation.fieldErrors.monthsComparator?.[0]}
                          >
                            <option value="">- Select -</option>
                            <option value="lt">Less than</option>
                            <option value="eq">Equal to</option>
                            <option value="gt">Greater than</option>
                          </Input>
                        </div>
                        <div>
                          <Input
                            id="sub-months"
                            type="number"
                            label="Months"
                            min={1}
                            value={getSubscriptionConfig(trigger)?.months ?? ""}
                            onChange={(e) => {
                              const val = Math.max(
                                1,
                                Number(e.target.value) || 1,
                              );
                              setTrigger({
                                ...trigger,
                                config: {
                                  ...getSubscriptionConfig(trigger),
                                  months: val,
                                },
                              });
                            }}
                            error={validation.fieldErrors.months?.[0]}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {trigger?.type === "twitch.giftSub" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
                        Gifted Subs Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Input
                            id="gift-min-count"
                            type="number"
                            label="Minimum Count"
                            min={1}
                            value={getGiftSubConfig(trigger)?.minCount ?? ""}
                            onChange={(e) => {
                              const val = Math.max(
                                1,
                                Number(e.target.value) || 1,
                              );
                              setTrigger({
                                ...trigger,
                                config: {
                                  ...getGiftSubConfig(trigger),
                                  minCount: val,
                                },
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Input
                            id="gift-tier"
                            type="select"
                            label="Tier"
                            value={getGiftSubConfig(trigger)?.tier ?? ""}
                            onChange={(e) => {
                              const v = (e.target.value || undefined) as
                                | "1000"
                                | "2000"
                                | "3000"
                                | undefined;
                              setTrigger({
                                ...trigger,
                                config: {
                                  ...getGiftSubConfig(trigger),
                                  tier: v,
                                },
                              });
                            }}
                          >
                            <option value="">Any</option>
                            <option value="1000">Tier 1</option>
                            <option value="2000">Tier 2</option>
                            <option value="3000">Tier 3</option>
                          </Input>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {trigger?.type === "twitch.cheer" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
                        Cheer Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Input
                            id="cheer-bits-comparator"
                            type="select"
                            label="Bits Comparator"
                            value={
                              getCheerConfig(trigger)?.bitsComparator ?? ""
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
                                  ...getCheerConfig(trigger),
                                  bitsComparator: v,
                                },
                              });
                            }}
                            error={validation.fieldErrors.bitsComparator?.[0]}
                          >
                            <option value="">- Select -</option>
                            <option value="lt">Less than</option>
                            <option value="eq">Equal to</option>
                            <option value="gt">Greater than</option>
                          </Input>
                        </div>
                        <div>
                          <Input
                            id="cheer-bits"
                            type="number"
                            label="Bits"
                            min={1}
                            value={getCheerConfig(trigger)?.bits ?? ""}
                            onChange={(e) => {
                              const val = Math.max(
                                1,
                                Number(e.target.value) || 1,
                              );
                              setTrigger({
                                ...trigger,
                                config: {
                                  ...getCheerConfig(trigger),
                                  bits: val,
                                },
                              });
                            }}
                            error={validation.fieldErrors.bits?.[0]}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(trigger?.type === "time.atDateTime" ||
                  trigger?.type === "time.dailyAt" ||
                  trigger?.type === "time.everyNMinutes" ||
                  trigger?.type === "time.minuteOfHour" ||
                  trigger?.type === "time.weeklyAt" ||
                  trigger?.type === "time.monthlyOn") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
                        Time-based Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(() => {
                          const next = getNextActivation(trigger);
                          return (
                            <div className="bg-[rgb(var(--color-muted))]/5 border border-[rgb(var(--color-border))] rounded p-2 text-sm text-[rgb(var(--color-fg))]">
                              <span className="font-medium">
                                Next activation:{" "}
                              </span>
                              {formatNextActivation(next.when, next.timezone)}
                            </div>
                          );
                        })()}
                        {trigger?.type === "time.weeklyAt" && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Input
                                type="select"
                                label="Day of Week"
                                value={
                                  getWeeklyAtConfig(trigger)?.dayOfWeek ?? 0
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
                                    config: {
                                      ...base,
                                      dayOfWeek: parseInt(e.target.value, 10),
                                    },
                                  });
                                }}
                                disabled={trigger?.enabled === false}
                              >
                                {dayOfWeekOptions.map((d) => (
                                  <option key={d.value} value={d.value}>
                                    {d.label}
                                  </option>
                                ))}
                              </Input>
                            </div>
                            <div>
                              <Input
                                type="time"
                                label="Time (HH:mm)"
                                value={
                                  getWeeklyAtConfig(trigger)?.time || "09:00"
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
                                    config: { ...base, time: e.target.value },
                                  });
                                }}
                                disabled={trigger?.enabled === false}
                              />
                            </div>
                            <div>
                              <Input
                                type="select"
                                label="Timezone"
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
                                    config: {
                                      ...base,
                                      timezone: e.target.value,
                                    },
                                  });
                                }}
                                disabled={trigger?.enabled === false}
                              >
                                {timezoneOptions.map((tz) => (
                                  <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </option>
                                ))}
                              </Input>
                            </div>
                          </div>
                        )}
                        {trigger?.type === "time.monthlyOn" && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Input
                                type="number"
                                label="Day of Month"
                                min={1}
                                max={31}
                                value={
                                  getMonthlyOnConfig(trigger)?.dayOfMonth ?? 1
                                }
                                onChange={(e) => {
                                  const val = Math.max(
                                    1,
                                    Math.min(31, Number(e.target.value) || 1),
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
                              />
                            </div>
                            <div>
                              <Input
                                type="time"
                                label="Time (HH:mm)"
                                value={
                                  getMonthlyOnConfig(trigger)?.time || "09:00"
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
                                    config: { ...base, time: e.target.value },
                                  });
                                }}
                                disabled={trigger?.enabled === false}
                              />
                            </div>
                            <div>
                              <Input
                                type="select"
                                label="Timezone"
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
                                    config: {
                                      ...base,
                                      timezone: e.target.value,
                                    },
                                  });
                                }}
                                disabled={trigger?.enabled === false}
                              >
                                {timezoneOptions.map((tz) => (
                                  <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </option>
                                ))}
                              </Input>
                            </div>
                          </div>
                        )}
                        {trigger?.type === "time.atDateTime" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Input
                                id="at-datetime"
                                type="datetime-local"
                                label="ISO Date-Time"
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
                                  const tz =
                                    current?.timezone || moment.tz.guess();
                                  const iso = e.target.value
                                    ? moment
                                        .tz(
                                          e.target.value,
                                          "YYYY-MM-DDTHH:mm",
                                          tz,
                                        )
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
                                error={validation.fieldErrors.isoDateTime?.[0]}
                              />
                            </div>
                            <div>
                              <Input
                                id="at-timezone"
                                type="select"
                                label="Timezone"
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
                                    config: {
                                      ...base,
                                      timezone: e.target.value,
                                    },
                                  });
                                }}
                                disabled={trigger?.enabled === false}
                                error={validation.fieldErrors.timezone?.[0]}
                              >
                                {timezoneOptions.map((tz) => (
                                  <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </option>
                                ))}
                              </Input>
                            </div>
                          </div>
                        )}

                        {trigger?.type === "time.dailyAt" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Input
                                id="daily-time"
                                type="time"
                                label="Time (HH:mm)"
                                value={
                                  getDailyAtConfig(trigger)?.time || "09:00"
                                }
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
                                error={validation.fieldErrors.time?.[0]}
                              />
                            </div>
                            <div>
                              <Input
                                id="daily-timezone"
                                type="select"
                                label="Timezone"
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
                                    config: {
                                      ...base,
                                      timezone: e.target.value,
                                    },
                                  });
                                }}
                                disabled={trigger?.enabled === false}
                                error={validation.fieldErrors.timezone?.[0]}
                              >
                                {timezoneOptions.map((tz) => (
                                  <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </option>
                                ))}
                              </Input>
                            </div>
                          </div>
                        )}

                        {trigger?.type === "time.everyNMinutes" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Input
                                  id="every-interval"
                                  type="number"
                                  label="Interval (minutes)"
                                  min={1}
                                  value={
                                    getEveryNMinutesConfig(trigger)
                                      ?.intervalMinutes ?? 15
                                  }
                                  onChange={(e) => {
                                    const val = Math.max(
                                      1,
                                      Number(e.target.value) || 1,
                                    );
                                    const base =
                                      getEveryNMinutesConfig(trigger) ||
                                      ({
                                        intervalMinutes: 15,
                                        timezone: "UTC",
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
                                      ...trigger,
                                      config: { ...base, intervalMinutes: val },
                                    });
                                  }}
                                  error={
                                    validation.fieldErrors.intervalMinutes?.[0]
                                  }
                                />
                              </div>
                              <div>
                                <Input
                                  id="every-timezone"
                                  type="select"
                                  label="Timezone"
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
                                      config: {
                                        ...base,
                                        timezone: e.target.value,
                                      },
                                    });
                                  }}
                                  disabled={trigger?.enabled === false}
                                  error={validation.fieldErrors.timezone?.[0]}
                                >
                                  {timezoneOptions.map((tz) => (
                                    <option key={tz.value} value={tz.value}>
                                      {tz.label}
                                    </option>
                                  ))}
                                </Input>
                              </div>
                              <div>
                                <Input
                                  id="every-anchor"
                                  type="select"
                                  label="Anchor"
                                  value={(() => {
                                    const a =
                                      getEveryNMinutesConfig(trigger)?.anchor;
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
                                      ({
                                        intervalMinutes: 15,
                                        timezone: "UTC",
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
                                    const nextAnchor =
                                      kind === "topOfHour"
                                        ? { kind: "topOfHour" as const }
                                        : ({
                                            kind: "custom",
                                            isoDateTime:
                                              new Date().toISOString(),
                                            timezone: existing.timezone,
                                          } as const);
                                    setTrigger({
                                      ...trigger,
                                      config: {
                                        ...existing,
                                        anchor: nextAnchor,
                                      },
                                    });
                                  }}
                                >
                                  <option value="topOfHour">Top of hour</option>
                                  <option value="custom">Custom</option>
                                </Input>
                              </div>
                            </div>

                            {getEveryNMinutesConfig(trigger)?.anchor?.kind ===
                              "custom" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Input
                                    id="every-custom-iso"
                                    type="datetime-local"
                                    label="Custom Anchor (ISO)"
                                    value={(() => {
                                      const a =
                                        getEveryNMinutesConfig(trigger)?.anchor;
                                      const v =
                                        a && a.kind === "custom"
                                          ? a.isoDateTime
                                          : "";
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
                                        ({
                                          intervalMinutes: 15,
                                          timezone: "UTC",
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
                                    error={
                                      validation.fieldErrors[
                                        "anchor.isoDateTime"
                                      ]?.[0]
                                    }
                                  />
                                </div>
                                <div>
                                  <Input
                                    id="every-custom-tz"
                                    type="select"
                                    label="Anchor Timezone"
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
                                          anchor: {
                                            ...a,
                                            timezone: e.target.value,
                                          },
                                        },
                                      });
                                    }}
                                    disabled={trigger?.enabled === false}
                                    error={
                                      validation.fieldErrors[
                                        "anchor.timezone"
                                      ]?.[0]
                                    }
                                  >
                                    {timezoneOptions.map((tz) => (
                                      <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                      </option>
                                    ))}
                                  </Input>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {trigger?.type === "time.minuteOfHour" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Input
                                id="minute-minute"
                                type="number"
                                label="Minute (0-59)"
                                min={0}
                                max={59}
                                value={
                                  getMinuteOfHourConfig(trigger)?.minute ?? 0
                                }
                                onChange={(e) => {
                                  const val = Math.max(
                                    0,
                                    Math.min(59, Number(e.target.value) || 0),
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
                                error={validation.fieldErrors.minute?.[0]}
                              />
                            </div>
                            <div>
                              <Input
                                id="minute-timezone"
                                type="select"
                                label="Timezone"
                                value={
                                  getMinuteOfHourConfig(trigger)?.timezone ||
                                  moment.tz.guess()
                                }
                                onChange={(e) => {
                                  const base =
                                    getMinuteOfHourConfig(trigger) ||
                                    ({
                                      minute: 0,
                                      timezone: moment.tz.guess(),
                                    } as {
                                      minute: number;
                                      timezone: string;
                                    });
                                  setTrigger({
                                    ...trigger!,
                                    config: {
                                      ...base,
                                      timezone: e.target.value,
                                    },
                                  });
                                }}
                                disabled={trigger?.enabled === false}
                                error={validation.fieldErrors.timezone?.[0]}
                              >
                                {timezoneOptions.map((tz) => (
                                  <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </option>
                                ))}
                              </Input>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))]">
                        Metadata
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMetadata((v) => !v)}
                        aria-label="Toggle metadata"
                      >
                        {showMetadata ? "Hide" : "Show"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showMetadata && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Input
                            id="spawn-id"
                            type="text"
                            label="ID"
                            value={selectedSpawn.id}
                            disabled
                          />
                        </div>
                        <div>
                          <Input
                            id="spawn-modified"
                            type="text"
                            label="Last Modified"
                            value={formatDate(selectedSpawn.lastModified)}
                            disabled
                          />
                        </div>

                        <div>
                          <Input
                            id="spawn-assets"
                            type="text"
                            label="Assets"
                            value={`${selectedSpawn.assets.length} item${
                              selectedSpawn.assets.length === 1 ? "" : "s"
                            }`}
                            disabled
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-[rgb(var(--color-muted-foreground))] text-sm">
                Loading spawn...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

SpawnEditorWorkspace.displayName = "SpawnEditorWorkspace";

export default SpawnEditorWorkspace;
