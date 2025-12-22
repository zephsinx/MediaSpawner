import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import { AssetService } from "../../../services/assetService";
import { SpawnService } from "../../../services/spawnService";
import type { MediaAsset, MediaAssetProperties } from "../../../types/media";
import type { Spawn, SpawnAsset } from "../../../types/spawn";
import {
  resolveEffectiveProperties,
  buildOverridesDiff,
} from "../../../utils/assetSettingsResolver";
import { usePanelState } from "../../../hooks/useLayout";
import { useDebounce } from "../../../hooks/useDebounce";
import { useAssetValidation } from "../../../hooks/useAssetValidation";
import {
  useMediaSpawnerEvent,
  dispatchMediaSpawnerEvent,
  MediaSpawnerEvents,
} from "../../../hooks/useMediaSpawnerEvent";
import { ConfirmDialog } from "../../common/ConfirmDialog";

import { AssetSettingsHeader } from "./AssetSettingsHeader";
import {
  DurationSection,
  VisualPropertiesSection,
  PlaybackPropertiesSection,
} from "./sections";

export interface AssetSettingsFormProps {
  spawnId: string;
  spawnAssetId: string;
  onBack: (skipGuard?: boolean) => void;
  getCachedDraft?: () =>
    | {
        draftValues: Partial<MediaAssetProperties>;
      }
    | undefined;
  setCachedDraft?: (draft: {
    draftValues: Partial<MediaAssetProperties>;
  }) => void;
  clearCachedDraft?: (spawnAssetId: string) => void;
}

type FieldKey = keyof MediaAssetProperties;

const AssetSettingsForm: React.FC<AssetSettingsFormProps> = memo(
  ({
    spawnId,
    spawnAssetId,
    onBack,
    getCachedDraft,
    setCachedDraft,
    clearCachedDraft,
  }) => {
    const { setUnsavedChanges, hasUnsavedChanges } = usePanelState();
    const [spawn, setSpawn] = useState<Spawn | null>(null);
    const [spawnAsset, setSpawnAsset] = useState<SpawnAsset | null>(null);
    const [baseAsset, setBaseAsset] = useState<MediaAsset | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [isDiscarding, setIsDiscarding] = useState(false);

    // Cache isolation validation
    const validateCacheIsolation = useCallback(
      (operation: string) => {
        if (!spawnId || !spawnAssetId) {
          const error = `AssetSettingsForm ${operation} failed: missing spawnId or spawnAssetId`;
          if (process.env.NODE_ENV === "development") {
            console.error(error, { spawnId, spawnAssetId, operation });
          }
          throw new Error(error);
        }

        if (process.env.NODE_ENV === "development") {
          console.debug(`AssetSettingsForm ${operation} isolation validated:`, {
            spawnId,
            spawnAssetId,
          });
        }
      },
      [spawnId, spawnAssetId],
    );

    // Local draft state: values only
    const [durationDraftMs, setDurationDraftMs] = useState<number>(0);
    const [initialDurationMs, setInitialDurationMs] = useState<number>(0);
    const [draftValues, setDraftValues] = useState<
      Partial<MediaAssetProperties>
    >({});
    const [initialValues, setInitialValues] =
      useState<Partial<MediaAssetProperties> | null>(null);
    const [validationErrors, setValidationErrors] = useState<
      Partial<Record<FieldKey, string>>
    >({});

    // Local state for immediate slider feedback
    const [localVolume, setLocalVolume] = useState<number>(0.5);
    const [localRotation, setLocalRotation] = useState<number>(0);

    useEffect(() => {
      let active = true;
      const load = async () => {
        setError(null);
        const s = await SpawnService.getSpawn(spawnId);
        if (!s) {
          if (active) setError("Failed to load spawn");
          return;
        }
        const sa = s.assets.find((a) => a.id === spawnAssetId) || null;
        if (!sa) {
          if (active) setError("Asset not found in spawn");
          return;
        }
        const base = AssetService.getAssetById(sa.assetId) || null;
        if (active) {
          setSpawn(s);
          setSpawnAsset(sa);
          setBaseAsset(base);
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [spawnId, spawnAssetId]);

    const effective = useMemo(() => {
      if (!spawn || !spawnAsset) return null;
      return resolveEffectiveProperties({
        spawn,
        overrides: spawnAsset.overrides?.properties,
      });
    }, [spawn, spawnAsset]);

    // Debounced values for sliders
    const debouncedVolume = useDebounce(localVolume, 150);
    const debouncedRotation = useDebounce(localRotation, 150);

    // Validation hook
    const { validateField } = useAssetValidation();
    const draftValuesRef = useRef(draftValues);

    const initKeyRef = useRef<string | null>(null);
    useEffect(() => {
      if (!effective || !spawn || !spawnAsset) return;
      const key = `${spawn.id}|${spawnAsset.id}`;
      if (initKeyRef.current === key) return;
      initKeyRef.current = key;
      setSuccess(null);

      validateCacheIsolation("get-cached-draft");
      const cached = getCachedDraft?.();
      const valuesToUse = cached ? cached.draftValues : effective.effective;

      // Store initial values with display defaults
      const initialDisplay: Partial<MediaAssetProperties> = {
        ...valuesToUse,
        volume: valuesToUse.volume ?? 0.5,
        rotation: valuesToUse.rotation ?? 0,
      };
      setInitialValues(initialDisplay);
      setDraftValues(valuesToUse);

      const hasDurationOverride =
        typeof spawnAsset.overrides?.duration === "number";
      const initialDuration = hasDurationOverride
        ? Math.max(0, Number(spawnAsset.overrides?.duration))
        : Math.max(0, Number(spawn.duration));

      setInitialDurationMs(initialDuration);
      setDurationDraftMs(initialDuration);
      setUnsavedChanges(false, "none");
    }, [
      effective,
      spawn,
      spawnAsset,
      setUnsavedChanges,
      getCachedDraft,
      validateCacheIsolation,
    ]);

    // Keep draftValuesRef in sync
    useEffect(() => {
      draftValuesRef.current = draftValues;
    });

    const setField = useCallback(
      (key: FieldKey, value: MediaAssetProperties[FieldKey]) => {
        setDraftValues((prev) => {
          const newValues = { ...prev, [key]: value };
          return newValues;
        });
        setUnsavedChanges(true, "asset");
      },
      [setUnsavedChanges],
    );

    const handleBlur = useCallback(
      (key: FieldKey) => {
        const error = validateField(key, draftValuesRef.current);
        setValidationErrors((prev) => ({
          ...prev,
          [key]: error,
        }));
      },
      [validateField],
    );

    // Single effect to sync debounced slider values to draftValues
    useEffect(() => {
      setDraftValues((prev) => {
        const volumeChanged = debouncedVolume !== prev.volume;
        const rotationChanged = debouncedRotation !== prev.rotation;

        if (!volumeChanged && !rotationChanged) return prev;

        return {
          ...prev,
          volume: debouncedVolume,
          rotation: debouncedRotation,
        };
      });

      // Mark as unsaved when debounced values update
      setUnsavedChanges(true, "asset");
    }, [debouncedVolume, debouncedRotation, setUnsavedChanges]);

    useEffect(() => {
      if (effective) {
        setLocalVolume(effective.effective.volume ?? 0.5);
        setLocalRotation(effective.effective.rotation ?? 0);
      }
    }, [effective]);

    // Single effect to sync draftValues back to local slider state
    useEffect(() => {
      setLocalVolume(draftValues.volume ?? 0.5);
      setLocalRotation(draftValues.rotation ?? 0);
    }, [draftValues.volume, draftValues.rotation]);

    // Create refs for latest state
    const spawnRef = useRef(spawn);
    const spawnAssetRef = useRef(spawnAsset);

    // Keep refs in sync
    useEffect(() => {
      spawnRef.current = spawn;
      spawnAssetRef.current = spawnAsset;
    }, [spawn, spawnAsset]);

    // Stable event listener - only re-registered when IDs change
    useMediaSpawnerEvent(
      MediaSpawnerEvents.SPAWN_UPDATED,
      async (event) => {
        const detail = event.detail;
        if (!detail.spawnId || detail.spawnId !== spawnId) return;

        const nextSpawn: Spawn | null = detail.updatedSpawn
          ? detail.updatedSpawn
          : await SpawnService.getSpawn(spawnId);

        if (!nextSpawn) return;

        // Use refs to access latest state
        const currentSpawnAsset = spawnAssetRef.current;
        if (!currentSpawnAsset) return;

        const nextSpawnAsset =
          nextSpawn.assets.find((a) => a.id === spawnAssetId) || null;
        if (!nextSpawnAsset) return;

        setSpawn(nextSpawn);
        setSpawnAsset(nextSpawnAsset);

        const nextEffective = resolveEffectiveProperties({
          spawn: nextSpawn,
          overrides: nextSpawnAsset.overrides?.properties,
        });
        setDraftValues(nextEffective.effective);
      },
      [spawnId, spawnAssetId],
    );

    // Cleanup unsaved changes when component unmounts
    useEffect(() => {
      return () => {
        setUnsavedChanges(false, "none");
      };
    }, [setUnsavedChanges]);

    const handleClose = useCallback(() => {
      if (hasUnsavedChanges) {
        setShowDiscardDialog(true);
      } else {
        onBack();
      }
    }, [hasUnsavedChanges, onBack]);

    const handleConfirmDiscard = useCallback(() => {
      // Set discarding flag to prevent cleanup effect from saving draft
      setIsDiscarding(true);

      // Reset to initial values
      if (initialValues) {
        setDraftValues(initialValues);

        // Reset slider states to initial values
        setLocalVolume(initialValues.volume ?? 0.5);
        setLocalRotation(initialValues.rotation ?? 0);
      }

      // Reset duration to initial value
      setDurationDraftMs(initialDurationMs);

      // Clear cached draft
      if (clearCachedDraft) {
        validateCacheIsolation("clear-cached-draft");
        clearCachedDraft(spawnAssetId);
      }

      // Clear unsaved changes flag and close dialog
      setUnsavedChanges(false, "none");
      setShowDiscardDialog(false);

      // Navigate back with skipGuard=true since we've already confirmed discard
      onBack(true);
    }, [
      initialValues,
      initialDurationMs,
      clearCachedDraft,
      spawnAssetId,
      setUnsavedChanges,
      onBack,
      validateCacheIsolation,
    ]);

    const handleSave = async () => {
      if (!spawn || !spawnAsset) return;

      // Validate all fields before save
      const errors: Partial<Record<FieldKey, string>> = {};
      const fieldsToValidate: FieldKey[] = [
        "volume",
        "dimensions",
        "position",
        "scale",
        "rotation",
        "crop",
        "boundsType",
        "alignment",
      ];

      fieldsToValidate.forEach((key) => {
        if (draftValues[key] !== undefined) {
          const error = validateField(key, draftValues);
          if (error) {
            errors[key] = error;
          }
        }
      });

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError("Please fix validation errors before saving");
        return;
      }

      setIsSaving(true);
      setError(null);
      setSuccess(null);
      try {
        // Save all non-undefined values as overrides
        const desired: Partial<MediaAssetProperties> = {};
        Object.entries(draftValues).forEach(([key, value]) => {
          if (value !== undefined) {
            (desired as Record<string, unknown>)[key] = value;
          }
        });

        const diff = buildOverridesDiff(desired);

        const updatedAssets: SpawnAsset[] = spawn.assets.map((sa) =>
          sa.id === spawnAsset.id
            ? {
                ...sa,
                overrides: {
                  ...sa.overrides,
                  properties: diff,
                  duration: Math.max(0, durationDraftMs),
                },
              }
            : sa,
        );

        const result = await SpawnService.updateSpawn(spawn.id, {
          assets: updatedAssets,
        });

        if (!result.success || !result.spawn) {
          setError(result.error || "Failed to save asset settings");
          return;
        }

        setSpawn(result.spawn);
        const updated =
          result.spawn.assets.find((a) => a.id === spawnAsset.id) || null;
        setSpawnAsset(updated);
        setSuccess("Changes saved");
        setUnsavedChanges(false, "none");
        if (setCachedDraft) {
          validateCacheIsolation("set-cached-draft");
          setCachedDraft({
            draftValues,
          });
        }
        dispatchMediaSpawnerEvent(MediaSpawnerEvents.SPAWN_UPDATED, {
          spawnId: result.spawn.id,
        });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to save asset settings",
        );
      } finally {
        setIsSaving(false);
      }
    };

    // Persist draft on unmount to preserve across mode switches
    useEffect(() => {
      return () => {
        // Only persist draft if there are unsaved changes and we're not discarding
        if (!isDiscarding && hasUnsavedChanges && setCachedDraft) {
          validateCacheIsolation("set-cached-draft-unmount");
          setCachedDraft({ draftValues });
        }
      };
    }, [
      draftValues,
      setCachedDraft,
      isDiscarding,
      hasUnsavedChanges,
      validateCacheIsolation,
    ]);

    const hasValidationErrors = useMemo(() => {
      return Object.values(validationErrors).some(Boolean);
    }, [validationErrors]);

    if (!spawn || !spawnAsset || !baseAsset || !effective) {
      return (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-fg))]">
              Asset Settings
            </h2>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-[rgb(var(--color-muted-foreground))]">
              Loading asset settings…
            </div>
          </div>
        </div>
      );
    }

    const type = baseAsset.type;
    const isVisual = type === "image" || type === "video";
    const isAudio = type === "audio";

    return (
      <div className="h-full flex flex-col">
        <AssetSettingsHeader
          assetName={baseAsset.name}
          assetType={type}
          hasUnsavedChanges={hasUnsavedChanges}
          hasValidationErrors={hasValidationErrors}
          isSaving={isSaving}
          error={error}
          success={success}
          onClose={handleClose}
          onSave={handleSave}
        />

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-2xl space-y-6">
            <DurationSection
              value={durationDraftMs}
              onChange={setDurationDraftMs}
              onUnsavedChange={() => setUnsavedChanges(true, "asset")}
              getInputClassName={() =>
                "w-full rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] placeholder:text-[rgb(var(--color-muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              }
            />

            {isVisual && (
              <VisualPropertiesSection
                draftValues={draftValues}
                validationErrors={validationErrors}
                setField={setField}
                handleBlur={handleBlur}
                localRotation={localRotation}
                setLocalRotation={setLocalRotation}
                validateField={validateField}
                draftValuesRef={draftValuesRef}
                setValidationErrors={setValidationErrors}
              />
            )}

            {(type === "video" || isAudio) && (
              <PlaybackPropertiesSection
                draftValues={draftValues}
                validationErrors={validationErrors}
                setField={setField}
                handleBlur={handleBlur}
                localVolume={localVolume}
                setLocalVolume={setLocalVolume}
                validateField={validateField}
                draftValuesRef={draftValuesRef}
                setValidationErrors={setValidationErrors}
              />
            )}
          </div>
        </div>

        <ConfirmDialog
          isOpen={showDiscardDialog}
          title="Discard Changes?"
          message="Your unsaved changes will be lost. This cannot be undone."
          confirmText="Discard"
          cancelText="Keep Editing"
          variant="warning"
          onConfirm={handleConfirmDiscard}
          onCancel={() => setShowDiscardDialog(false)}
        />
      </div>
    );
  },
);

AssetSettingsForm.displayName = "AssetSettingsForm";

export default AssetSettingsForm;
