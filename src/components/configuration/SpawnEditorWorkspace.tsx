import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  useCallback,
} from "react";
import { StreamerbotService } from "../../services/streamerbotService";
import { toast } from "sonner";
import { usePanelState } from "../../hooks/useLayout";
import { SpawnService } from "../../services/spawnService";
import type { Spawn } from "../../types/spawn";
import type { RandomizationBucket } from "../../types/spawn";
import type { Trigger, TriggerType } from "../../types/spawn";
import { getDefaultTrigger } from "../../types/spawn";
import AssetSettingsForm from "./asset-settings/AssetSettingsForm";
import { validateTrigger } from "../../utils/triggerValidation";
import { RandomizationBucketsSection } from "./RandomizationBucketsSection";
import { validateRandomizationBuckets } from "../../utils/randomizationBuckets";
import {
  dispatchMediaSpawnerEvent,
  MediaSpawnerEvents,
  useMediaSpawnerEvent,
} from "../../hooks/useMediaSpawnerEvent";

// Extracted components
import { SpawnEditorDialogs } from "./SpawnEditorDialogs";
import { SpawnSettingsHeader } from "./SpawnSettingsHeader";
import { BasicDetailsCard } from "./BasicDetailsCard";
import { TriggerTypeSelector } from "./TriggerTypeSelector";
import { MetadataCard } from "./MetadataCard";

// Trigger config components
import {
  getCommandConfig,
  getChannelPointConfig,
  CommandTriggerConfig,
  ChannelPointTriggerConfig,
  SubscriptionTriggerConfig,
  GiftSubTriggerConfig,
  CheerTriggerConfig,
  TimeTriggerConfig,
} from "./triggers";

// Hooks
import { useAssetDraftCache } from "./hooks";

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

  // Use the extracted cache hook
  const {
    setCacheEntry,
    getCacheEntry,
    clearCacheEntry,
    clearCacheEntryUnsafe,
    clearAllCacheEntries,
  } = useAssetDraftCache({
    selectedSpawnId,
    selectedSpawnAssetId,
    centerPanelMode,
  });

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
      console.debug(
        "Spawn changed, clearing all asset draft cache entries to prevent cross-spawn contamination",
      );
    }
    clearAllCacheEntries();
  }, [selectedSpawnId, clearAllCacheEntries]);

  // Stable event listener - only re-registered when IDs change
  useEffect(() => {
    const load = async () => {
      if (!selectedSpawnId) {
        setSelectedSpawn(null);
        setName("");
        setDescription("");
        return;
      }
      const allSpawns = await SpawnService.getAllSpawns();
      setAllSpawnsCache(allSpawns);
      const found = allSpawns.find((s) => s.id === selectedSpawnId) || null;
      setSelectedSpawn(found);
    };
    load();
  }, [selectedSpawnId]);

  useMediaSpawnerEvent(
    MediaSpawnerEvents.SPAWN_UPDATED,
    (event) => {
      const detail = event.detail;
      if (!detail.spawnId) return;
      if (detail.spawnId !== selectedSpawnIdRef.current) return;
      if (detail.updatedSpawn) {
        setSelectedSpawnRef.current(detail.updatedSpawn);
        setNameRef.current(detail.updatedSpawn.name);
        setDescriptionRef.current(detail.updatedSpawn.description || "");
        return;
      }
      const load = async () => {
        const allSpawns = await SpawnService.getAllSpawns();
        setAllSpawnsCache(allSpawns);
        const found =
          allSpawns.find((s) => s.id === selectedSpawnIdRef.current) || null;
        setSelectedSpawnRef.current(found);
      };
      void load();
    },
    [],
  );

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

  useEffect(() => {}, []);

  useMediaSpawnerEvent(
    MediaSpawnerEvents.REQUEST_CENTER_SWITCH,
    (event) => {
      const detail = event.detail;

      if (
        !detail.skipGuard &&
        hasUnsavedChangesRef.current &&
        changeTypeRef.current !== "none"
      ) {
        // Asset-to-asset switches handled by useEffect at line 395 to avoid double dialogs
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
    },
    [],
  );

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
        console.debug(
          "Component unmounting, clearing all asset draft cache entries",
        );
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

  const isCancelDisabled = !hasUnsavedChanges && !isDirty;

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
      dispatchMediaSpawnerEvent(MediaSpawnerEvents.SPAWN_UPDATED, {
        spawnId: result.spawn.id,
        updatedSpawn: result.spawn,
      });
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

  const handleTriggerTypeChange = useCallback((nextType: TriggerType) => {
    pendingTriggerTypeRef.current = nextType;
    setShowTriggerTypeDialog(true);
  }, []);

  const handleDelete = useCallback(() => {
    setDeleteError(null);
    setShowDeleteDialog(true);
  }, []);

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
      <SpawnEditorDialogs
        // Discard dialog
        showDiscardDialog={showDiscardDialog}
        setShowDiscardDialog={setShowDiscardDialog}
        selectedSpawn={selectedSpawn}
        clearAllCacheEntries={clearAllCacheEntries}
        setName={setName}
        setDescription={setDescription}
        setEnabled={setEnabled}
        setDuration={setDuration}
        setSaveError={setSaveError}
        setSaveSuccess={setSaveSuccess}
        // Trigger type dialog
        showTriggerTypeDialog={showTriggerTypeDialog}
        setShowTriggerTypeDialog={setShowTriggerTypeDialog}
        pendingTriggerTypeRef={pendingTriggerTypeRef}
        setTrigger={setTrigger}
        // Mode switch dialog
        showModeSwitchDialog={showModeSwitchDialog}
        setShowModeSwitchDialog={setShowModeSwitchDialog}
        getModalContent={getModalContent}
        switchPendingRef={switchPendingRef}
        selectSpawnAsset={selectSpawnAsset}
        setCenterPanelMode={setCenterPanelMode}
        // Asset switch dialog
        showAssetSwitchDialog={showAssetSwitchDialog}
        setShowAssetSwitchDialog={setShowAssetSwitchDialog}
        pendingAssetSwitchIdRef={pendingAssetSwitchIdRef}
        setUnsavedChanges={setUnsavedChanges}
        selectedSpawnAssetId={selectedSpawnAssetId}
        selectedSpawnId={selectedSpawnId}
        clearCacheEntryUnsafe={clearCacheEntryUnsafe}
        prevSelectedSpawnAssetIdRef={prevSelectedSpawnAssetIdRef}
        // Delete dialog
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        setDeleteError={setDeleteError}
        setSelectedSpawn={setSelectedSpawn}
        selectSpawn={selectSpawn}
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
            dispatchMediaSpawnerEvent(
              MediaSpawnerEvents.REQUEST_CENTER_SWITCH,
              {
                mode: "spawn-settings",
                skipGuard,
              },
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
          <SpawnSettingsHeader
            selectedSpawn={selectedSpawn}
            hasUnsavedChanges={hasUnsavedChanges}
            isTesting={isTesting}
            isSaving={isSaving}
            isSaveDisabled={isSaveDisabled}
            isCancelDisabled={isCancelDisabled}
            onTest={handleTestSpawn}
            onDelete={handleDelete}
            onCancel={handleCancel}
            onSave={handleSave}
          />
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
                <BasicDetailsCard
                  name={name}
                  setName={setName}
                  description={description}
                  setDescription={setDescription}
                  duration={duration}
                  setDuration={setDuration}
                  enabled={enabled}
                  setEnabled={setEnabled}
                  trimmedName={trimmedName}
                  isNameValid={isNameValid}
                  validation={validation}
                />

                <TriggerTypeSelector
                  trigger={trigger}
                  setTrigger={setTrigger}
                  onTriggerTypeChange={handleTriggerTypeChange}
                />

                {trigger?.type === "streamerbot.command" && (
                  <CommandTriggerConfig
                    trigger={trigger}
                    setTrigger={setTrigger}
                  />
                )}

                {trigger?.type === "twitch.channelPointReward" && (
                  <ChannelPointTriggerConfig
                    trigger={trigger}
                    setTrigger={setTrigger}
                  />
                )}

                {trigger?.type === "twitch.subscription" && (
                  <SubscriptionTriggerConfig
                    trigger={trigger}
                    setTrigger={setTrigger}
                    validation={validation}
                  />
                )}

                {trigger?.type === "twitch.giftSub" && (
                  <GiftSubTriggerConfig
                    trigger={trigger}
                    setTrigger={setTrigger}
                  />
                )}

                {trigger?.type === "twitch.cheer" && (
                  <CheerTriggerConfig
                    trigger={trigger}
                    setTrigger={setTrigger}
                    validation={validation}
                  />
                )}

                {(trigger?.type === "time.atDateTime" ||
                  trigger?.type === "time.dailyAt" ||
                  trigger?.type === "time.everyNMinutes" ||
                  trigger?.type === "time.minuteOfHour" ||
                  trigger?.type === "time.weeklyAt" ||
                  trigger?.type === "time.monthlyOn") && (
                  <TimeTriggerConfig
                    trigger={trigger}
                    setTrigger={setTrigger}
                    validation={validation}
                  />
                )}

                {/* Randomization Buckets */}
                <RandomizationBucketsSection
                  spawn={selectedSpawn}
                  buckets={bucketsDraft}
                  onChange={setBucketsDraft}
                />

                <MetadataCard spawn={selectedSpawn} />
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
