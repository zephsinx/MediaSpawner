import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { AssetService } from "../../../services/assetService";
import { SpawnService } from "../../../services/spawnService";
import type {
  MediaAsset,
  MediaAssetProperties,
  MonitorType,
  BoundsType,
  AlignmentOption,
} from "../../../types/media";
import type { Spawn, SpawnAsset } from "../../../types/spawn";
import {
  resolveEffectiveProperties,
  buildOverridesDiff,
} from "../../../utils/assetSettingsResolver";
import { usePanelState } from "../../../hooks/useLayout";
import { useDebounce } from "../../../hooks/useDebounce";
import { useAssetValidation } from "../../../hooks/useAssetValidation";
import { Button } from "../../ui/Button";
import { cn } from "../../../utils/cn";
import { inputVariants } from "../../ui/variants";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ConfirmDialog } from "../../common/ConfirmDialog";

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

/**
 * Reusable tooltip component for form field help text
 */
function FieldTooltip({ content }: { content: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center ml-1.5 text-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-fg))] transition-colors"
          aria-label="More information"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] shadow-md max-w-xs"
        >
          {content}
          <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

const AssetSettingsForm: React.FC<AssetSettingsFormProps> = ({
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

  // Local draft state: values only
  const [durationDraftMs, setDurationDraftMs] = useState<number>(0);
  const [initialDurationMs, setInitialDurationMs] = useState<number>(0);
  const [draftValues, setDraftValues] = useState<Partial<MediaAssetProperties>>(
    {},
  );
  const [initialValues, setInitialValues] =
    useState<Partial<MediaAssetProperties> | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});

  // Local state for immediate slider feedback
  const [localVolume, setLocalVolume] = useState<number>(0.5);
  const [localRotation, setLocalRotation] = useState<number>(0);

  // Helper for consistent input styling
  const getInputClassName = (field?: FieldKey) =>
    cn(
      inputVariants({
        variant: field && validationErrors[field] ? "error" : "default",
      }),
    );

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

  // Initialize draft when context target changes (avoid loops on referential changes)
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!effective || !spawn || !spawnAsset) return;
    const key = `${spawn.id}|${spawnAsset.id}`;
    if (initKeyRef.current === key) return;
    initKeyRef.current = key;
    setSuccess(null);

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
    setUnsavedChanges(false);
  }, [effective, spawn, spawnAsset, setUnsavedChanges, getCachedDraft]);

  // Keep draftValuesRef in sync
  useEffect(() => {
    draftValuesRef.current = draftValues;
  });

  const setField = useCallback(
    (key: FieldKey, value: MediaAssetProperties[FieldKey]) => {
      setDraftValues((prev) => ({ ...prev, [key]: value }));
      setUnsavedChanges(true);
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
    setUnsavedChanges(true);
  }, [debouncedVolume, debouncedRotation, setUnsavedChanges]);

  // Initialize local state when component first loads
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

  // Keep refs in sync (no dependencies - runs after every render)
  useEffect(() => {
    spawnRef.current = spawn;
    spawnAssetRef.current = spawnAsset;
  });

  // Stable event listener - only re-registered when IDs change
  useEffect(() => {
    const onSpawnUpdated = async (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | { spawnId?: string; updatedSpawn?: Spawn }
        | undefined;
      if (!detail?.spawnId || detail.spawnId !== spawnId) return;

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
    };

    window.addEventListener(
      "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
      onSpawnUpdated as EventListener,
    );

    return () => {
      window.removeEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        onSpawnUpdated as EventListener,
      );
    };
  }, [spawnId, spawnAssetId]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      onBack();
    }
  }, [hasUnsavedChanges, onBack]);

  const handleConfirmDiscard = useCallback(() => {
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
      clearCachedDraft(spawnAssetId);
    }

    // Clear unsaved changes flag and close dialog
    setUnsavedChanges(false);
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
      setUnsavedChanges(false);
      if (setCachedDraft) {
        setCachedDraft({
          draftValues,
        });
      }
      window.dispatchEvent(
        new CustomEvent(
          "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
          { detail: { spawnId: result.spawn.id } } as CustomEventInit,
        ),
      );
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
      if (setCachedDraft) {
        setCachedDraft({ draftValues });
      }
    };
  }, [draftValues, setCachedDraft]);

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
      <div className="p-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[rgb(var(--color-fg))]">
                Asset Settings
              </h2>
              {hasUnsavedChanges && (
                <span className="text-amber-600 dark:text-amber-500 text-sm font-medium">
                  • Unsaved changes
                </span>
              )}
            </div>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              {baseAsset.name} · {type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              aria-label="Close asset settings"
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={hasValidationErrors}
              loading={isSaving}
              aria-label="Save asset settings"
            >
              Save
            </Button>
          </div>
        </div>
        {error && (
          <div
            className="mt-3 p-3 bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error-border))] text-sm text-[rgb(var(--color-error))] rounded flex items-center gap-2"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div
            className="mt-3 p-3 bg-[rgb(var(--color-success-bg))] border border-[rgb(var(--color-success-border))] text-sm text-[rgb(var(--color-success))] rounded flex items-center gap-2"
            role="status"
          >
            <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4">
        <div className="max-w-2xl space-y-6">
          <section className="bg-[rgb(var(--color-surface-1))] border border-[rgb(var(--color-border))] rounded-lg shadow-md p-4">
            <h3 className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
              Duration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                  Duration (ms)
                </label>
                <input
                  type="number"
                  min={0}
                  value={durationDraftMs}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setDurationDraftMs(val);
                    setUnsavedChanges(true);
                  }}
                  className={getInputClassName()}
                />
              </div>
            </div>
          </section>
          {isVisual && (
            <section className="bg-[rgb(var(--color-surface-1))] border border-[rgb(var(--color-border))] rounded-lg shadow-md p-4">
              <h3 className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
                Visual Properties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                    Width (px)
                    <FieldTooltip content="Positive numbers only." />
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={draftValues.dimensions?.width ?? ""}
                    onChange={(e) =>
                      setField("dimensions", {
                        width: Math.max(1, Number(e.target.value) || 1),
                        height: draftValues.dimensions?.height ?? 1,
                      })
                    }
                    onBlur={() => handleBlur("dimensions")}
                    className={getInputClassName("dimensions")}
                    aria-describedby="dimensions-error"
                  />
                  {validationErrors.dimensions && (
                    <p
                      id="dimensions-error"
                      className="text-xs text-[rgb(var(--color-error))] mt-1"
                    >
                      {validationErrors.dimensions}
                    </p>
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                    Height (px)
                    <FieldTooltip content="Positive numbers only." />
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={draftValues.dimensions?.height ?? ""}
                    onChange={(e) =>
                      setField("dimensions", {
                        width: draftValues.dimensions?.width ?? 1,
                        height: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    onBlur={() => handleBlur("dimensions")}
                    className={getInputClassName("dimensions")}
                  />
                </div>

                <div>
                  <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                    X Position (px)
                    <FieldTooltip content="Use non-negative values. Relative/centered behavior depends on mode." />
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draftValues.position?.x ?? ""}
                    onChange={(e) =>
                      setField("position", {
                        x: Math.max(0, Number(e.target.value) || 0),
                        y: draftValues.position?.y ?? 0,
                      })
                    }
                    onBlur={() => handleBlur("position")}
                    className={getInputClassName("position")}
                    aria-describedby="position-error"
                  />
                  {validationErrors.position && (
                    <p
                      id="position-error"
                      className="text-xs text-[rgb(var(--color-error))] mt-1"
                    >
                      {validationErrors.position}
                    </p>
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                    Y Position (px)
                    <FieldTooltip content="Use non-negative values. Relative/centered behavior depends on mode." />
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draftValues.position?.y ?? ""}
                    onChange={(e) =>
                      setField("position", {
                        x: draftValues.position?.x ?? 0,
                        y: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    onBlur={() => handleBlur("position")}
                    className={getInputClassName("position")}
                  />
                </div>

                <div>
                  <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                    Scale
                    <FieldTooltip content='Enter a non-negative factor (1.0 = 100%). Toggle "Unlinked" to scale X and Y independently.' />
                  </label>
                  <div className="flex-1">
                    {/* Linked/Unlinked Toggle */}
                    <div className="flex items-center gap-2 mb-2">
                      <label className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                        <input
                          type="checkbox"
                          checked={
                            typeof draftValues.scale === "object" &&
                            draftValues.scale?.linked === false
                          }
                          onChange={(e) => {
                            const isUnlinked = e.target.checked;
                            const currentScale = draftValues.scale;

                            if (isUnlinked) {
                              // Convert to unlinked mode
                              const scaleValue =
                                typeof currentScale === "number"
                                  ? currentScale
                                  : (currentScale?.x ?? 1);
                              setField("scale", {
                                x: scaleValue,
                                y: scaleValue,
                                linked: false,
                              });
                            } else {
                              // Convert to linked mode - use X value for both
                              const scaleValue =
                                typeof currentScale === "number"
                                  ? currentScale
                                  : (currentScale?.x ?? 1);
                              setField("scale", {
                                x: scaleValue,
                                y: scaleValue,
                                linked: true,
                              });
                            }
                          }}
                          className="rounded"
                        />
                        Unlinked
                      </label>
                    </div>

                    {/* Scale Inputs */}
                    <div className="flex items-center gap-2">
                      {typeof draftValues.scale === "object" &&
                      draftValues.scale?.linked === false ? (
                        // Non-uniform mode: separate X/Y inputs
                        <>
                          <div className="flex-1">
                            <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                              X
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={draftValues.scale?.x ?? ""}
                              onChange={(e) => {
                                const xValue = Math.max(
                                  0,
                                  parseFloat(e.target.value) || 0,
                                );
                                const currentScale = draftValues.scale;
                                setField("scale", {
                                  x: xValue,
                                  y:
                                    typeof currentScale === "object" &&
                                    currentScale?.y !== undefined
                                      ? currentScale.y
                                      : 1,
                                  linked: false,
                                });
                              }}
                              onBlur={() => handleBlur("scale")}
                              className={getInputClassName("scale")}
                              aria-describedby="scale-error"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                              Y
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={draftValues.scale?.y ?? ""}
                              onChange={(e) => {
                                const yValue = Math.max(
                                  0,
                                  parseFloat(e.target.value) || 0,
                                );
                                const currentScale = draftValues.scale;
                                setField("scale", {
                                  x:
                                    typeof currentScale === "object" &&
                                    currentScale?.x !== undefined
                                      ? currentScale.x
                                      : 1,
                                  y: yValue,
                                  linked: false,
                                });
                              }}
                              onBlur={() => handleBlur("scale")}
                              className={getInputClassName("scale")}
                              aria-describedby="scale-error"
                            />
                          </div>
                        </>
                      ) : (
                        // Uniform mode: single input
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={
                            typeof draftValues.scale === "number"
                              ? draftValues.scale
                              : (draftValues.scale?.x ?? "")
                          }
                          onChange={(e) => {
                            const scaleValue = Math.max(
                              0,
                              parseFloat(e.target.value) || 0,
                            );
                            setField("scale", {
                              x: scaleValue,
                              y: scaleValue,
                              linked: true,
                            });
                          }}
                          onBlur={() => handleBlur("scale")}
                          className={cn(getInputClassName("scale"), "w-24")}
                          aria-describedby="scale-error"
                        />
                      )}
                    </div>
                    {validationErrors.scale && (
                      <p
                        id="scale-error"
                        className="text-xs text-[rgb(var(--color-error))] mt-1"
                      >
                        {validationErrors.scale}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                  Position Mode
                </label>
                <select
                  value={draftValues.positionMode ?? "absolute"}
                  onChange={(e) =>
                    setField(
                      "positionMode",
                      e.target.value as MediaAssetProperties["positionMode"],
                    )
                  }
                  className={getInputClassName()}
                >
                  <option value="absolute">Absolute (px)</option>
                  <option value="relative">Relative (%)</option>
                  <option value="centered">Centered</option>
                </select>
              </div>

              <div>
                <label
                  className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1"
                  htmlFor="rotation-input"
                >
                  Rotation (°)
                  <FieldTooltip content="Angle in degrees." />
                </label>
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={localRotation}
                    onChange={(e) => setLocalRotation(Number(e.target.value))}
                    onBlur={() => {
                      // Validate using the local value for sliders
                      const error = validateField("rotation", {
                        ...draftValuesRef.current,
                        rotation: localRotation,
                      });
                      setValidationErrors((prev) => ({
                        ...prev,
                        rotation: error,
                      }));
                    }}
                    className="w-full h-2 bg-[rgb(var(--color-border))] rounded-lg appearance-none cursor-pointer focus-visible:outline-none"
                    aria-label="Rotation slider"
                    aria-describedby="rotation-error"
                  />
                  <input
                    type="number"
                    min={0}
                    max={360}
                    step={1}
                    value={draftValues.rotation ?? ""}
                    onChange={(e) =>
                      setField(
                        "rotation",
                        Math.max(0, Math.min(360, Number(e.target.value) || 0)),
                      )
                    }
                    onBlur={() => handleBlur("rotation")}
                    className={cn(getInputClassName("rotation"), "w-20 mt-2")}
                    id="rotation-input"
                    aria-label="Rotation input"
                    aria-describedby="rotation-error"
                  />
                  {validationErrors.rotation && (
                    <p
                      id="rotation-error"
                      className="text-xs text-[rgb(var(--color-error))] mt-1"
                    >
                      {validationErrors.rotation}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                  Crop (px)
                  <FieldTooltip content="Crop the source (0 means no crop). Applied before scaling." />
                </label>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                      Left
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draftValues.crop?.left ?? ""}
                      onChange={(e) =>
                        setField("crop", {
                          left: Math.max(0, Number(e.target.value) || 0),
                          top: draftValues.crop?.top ?? 0,
                          right: draftValues.crop?.right ?? 0,
                          bottom: draftValues.crop?.bottom ?? 0,
                        })
                      }
                      onBlur={() => handleBlur("crop")}
                      className={getInputClassName("crop")}
                      aria-describedby="crop-error"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                      Top
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draftValues.crop?.top ?? ""}
                      onChange={(e) =>
                        setField("crop", {
                          left: draftValues.crop?.left ?? 0,
                          top: Math.max(0, Number(e.target.value) || 0),
                          right: draftValues.crop?.right ?? 0,
                          bottom: draftValues.crop?.bottom ?? 0,
                        })
                      }
                      onBlur={() => handleBlur("crop")}
                      className={getInputClassName("crop")}
                      aria-describedby="crop-error"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                      Right
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draftValues.crop?.right ?? ""}
                      onChange={(e) =>
                        setField("crop", {
                          left: draftValues.crop?.left ?? 0,
                          top: draftValues.crop?.top ?? 0,
                          right: Math.max(0, Number(e.target.value) || 0),
                          bottom: draftValues.crop?.bottom ?? 0,
                        })
                      }
                      onBlur={() => handleBlur("crop")}
                      className={getInputClassName("crop")}
                      aria-describedby="crop-error"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                      Bottom
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draftValues.crop?.bottom ?? ""}
                      onChange={(e) =>
                        setField("crop", {
                          left: draftValues.crop?.left ?? 0,
                          top: draftValues.crop?.top ?? 0,
                          right: draftValues.crop?.right ?? 0,
                          bottom: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      onBlur={() => handleBlur("crop")}
                      className={getInputClassName("crop")}
                      aria-describedby="crop-error"
                    />
                  </div>
                </div>
                {validationErrors.crop && (
                  <p
                    id="crop-error"
                    className="text-xs text-[rgb(var(--color-error))] mt-1 col-span-2"
                  >
                    {validationErrors.crop}
                  </p>
                )}
              </div>

              <div>
                <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                  Bounds Type
                  <FieldTooltip content="OBS bounds setting. 'None' uses source size; others fit/fill within dimensions." />
                </label>
                <select
                  value={draftValues.boundsType ?? ""}
                  onChange={(e) =>
                    setField(
                      "boundsType",
                      e.target.value
                        ? (e.target.value as BoundsType)
                        : undefined,
                    )
                  }
                  onBlur={() => handleBlur("boundsType")}
                  className={getInputClassName("boundsType")}
                  aria-describedby="bounds-type-error"
                >
                  <option value="">Select bounds type...</option>
                  <option value="OBS_BOUNDS_NONE">None</option>
                  <option value="OBS_BOUNDS_STRETCH">Stretch</option>
                  <option value="OBS_BOUNDS_SCALE_INNER">Scale Inner</option>
                  <option value="OBS_BOUNDS_SCALE_OUTER">Scale Outer</option>
                  <option value="OBS_BOUNDS_SCALE_TO_WIDTH">
                    Scale to Width
                  </option>
                  <option value="OBS_BOUNDS_SCALE_TO_HEIGHT">
                    Scale to Height
                  </option>
                  <option value="OBS_BOUNDS_MAX_ONLY">Max Only</option>
                </select>
                {validationErrors.boundsType && (
                  <p
                    id="bounds-type-error"
                    className="text-xs text-[rgb(var(--color-error))] mt-1"
                  >
                    {validationErrors.boundsType}
                  </p>
                )}
              </div>

              <div>
                <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                  Alignment
                  <FieldTooltip content="Alignment within the bounds." />
                </label>
                <select
                  value={draftValues.alignment ?? ""}
                  onChange={(e) =>
                    setField(
                      "alignment",
                      e.target.value
                        ? (Number(e.target.value) as AlignmentOption)
                        : undefined,
                    )
                  }
                  onBlur={() => handleBlur("alignment")}
                  className={getInputClassName("alignment")}
                  aria-describedby="alignment-error"
                >
                  <option value="">Select alignment...</option>
                  <option value="0">Top Left</option>
                  <option value="1">Top Center</option>
                  <option value="2">Top Right</option>
                  <option value="4">Center Left</option>
                  <option value="5">Center</option>
                  <option value="6">Center Right</option>
                  <option value="8">Bottom Left</option>
                  <option value="9">Bottom Center</option>
                  <option value="10">Bottom Right</option>
                </select>
                {validationErrors.alignment && (
                  <p
                    id="alignment-error"
                    className="text-xs text-[rgb(var(--color-error))] mt-1"
                  >
                    {validationErrors.alignment}
                  </p>
                )}
              </div>
            </section>
          )}

          {(type === "video" || isAudio) && (
            <section className="bg-[rgb(var(--color-surface-1))] border border-[rgb(var(--color-border))] rounded-lg shadow-md p-4">
              <h3 className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
                Playback Properties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                    Volume (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(localVolume * 100)}
                      onChange={(e) =>
                        setLocalVolume(Number(e.target.value) / 100)
                      }
                      onBlur={() => {
                        // Validate using the local value for sliders
                        const error = validateField("volume", {
                          ...draftValuesRef.current,
                          volume: localVolume,
                        });
                        setValidationErrors((prev) => ({
                          ...prev,
                          volume: error,
                        }));
                      }}
                      className="flex-1 h-2 bg-[rgb(var(--color-border))] rounded-lg appearance-none cursor-pointer focus-visible:outline-none"
                      aria-label="Volume slider"
                      aria-describedby="volume-help volume-error"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round((draftValues.volume ?? 0.5) * 100)}
                      onChange={(e) =>
                        setField("volume", (Number(e.target.value) || 0) / 100)
                      }
                      onBlur={() => handleBlur("volume")}
                      className={cn(getInputClassName("volume"), "w-20")}
                      aria-describedby="volume-help volume-error"
                    />
                  </div>

                  {validationErrors.volume && (
                    <p
                      id="volume-error"
                      className="text-xs text-[rgb(var(--color-error))] mt-1"
                    >
                      {validationErrors.volume}
                    </p>
                  )}
                </div>

                <div>
                  <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
                    Monitor Type
                    <FieldTooltip content="Monitor Only: Hear through headphones, not in stream. Monitor and Output: Both headphones and stream." />
                  </label>
                  <select
                    value={draftValues.monitorType ?? ""}
                    onChange={(e) =>
                      setField(
                        "monitorType",
                        e.target.value
                          ? (e.target.value as MonitorType)
                          : undefined,
                      )
                    }
                    onBlur={() => handleBlur("monitorType")}
                    className={getInputClassName("monitorType")}
                  >
                    <option value="">Not set (OBS default)</option>
                    <option value="monitor-only">Monitor Only</option>
                    <option value="monitor-and-output">
                      Monitor and Output
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-[rgb(var(--color-fg))]">
                    <input
                      type="checkbox"
                      checked={!!draftValues.loop}
                      onChange={(e) => setField("loop", e.target.checked)}
                    />
                    Loop
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-[rgb(var(--color-fg))]">
                    <input
                      type="checkbox"
                      checked={!!draftValues.autoplay}
                      onChange={(e) => setField("autoplay", e.target.checked)}
                    />
                    Autoplay
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-[rgb(var(--color-fg))]">
                    <input
                      type="checkbox"
                      checked={!!draftValues.muted}
                      onChange={(e) => setField("muted", e.target.checked)}
                    />
                    Muted
                  </label>
                </div>
              </div>
            </section>
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
};

export default AssetSettingsForm;
