import React, { useEffect, useMemo, useRef, useState } from "react";
import { AssetService } from "../../../services/assetService";
import { SpawnService } from "../../../services/spawnService";
import type {
  MediaAsset,
  MediaAssetProperties,
  BoundsType,
  AlignmentOption,
} from "../../../types/media";
import type { Spawn, SpawnAsset } from "../../../types/spawn";
import {
  resolveEffectiveProperties,
  buildOverridesDiff,
} from "../../../utils/assetSettingsResolver";
import { usePanelState } from "../../../hooks/useLayout";
import {
  validateVolumePercent,
  validateDimensionsValues,
  validatePositionValues,
  validateScaleValue,
  validateRotation,
  validateCropSettings,
  validateBoundsType,
  validateAlignment,
} from "../../../utils/assetValidation";

export interface AssetSettingsFormProps {
  spawnId: string;
  spawnAssetId: string;
  onBack: () => void;
  getCachedDraft?: () =>
    | {
        draftValues: Partial<MediaAssetProperties>;
      }
    | undefined;
  setCachedDraft?: (draft: {
    draftValues: Partial<MediaAssetProperties>;
  }) => void;
}

type FieldKey = keyof MediaAssetProperties;

const AssetSettingsForm: React.FC<AssetSettingsFormProps> = ({
  spawnId,
  spawnAssetId,
  onBack,
  getCachedDraft,
  setCachedDraft,
}) => {
  const { setUnsavedChanges } = usePanelState();
  const [spawn, setSpawn] = useState<Spawn | null>(null);
  const [spawnAsset, setSpawnAsset] = useState<SpawnAsset | null>(null);
  const [baseAsset, setBaseAsset] = useState<MediaAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Local draft state: values only
  const [durationDraftMs, setDurationDraftMs] = useState<number>(0);
  const [draftValues, setDraftValues] = useState<Partial<MediaAssetProperties>>(
    {}
  );
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});

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

  // Initialize draft when context target changes (avoid loops on referential changes)
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!effective || !spawn || !spawnAsset) return;
    const key = `${spawn.id}|${spawnAsset.id}`;
    if (initKeyRef.current === key) return;
    initKeyRef.current = key;
    setSuccess(null);
    const cached = getCachedDraft?.();
    if (cached) {
      setDraftValues(cached.draftValues);
    } else {
      setDraftValues(effective.effective);
    }

    const hasDurationOverride =
      typeof spawnAsset.overrides?.duration === "number";
    setDurationDraftMs(
      hasDurationOverride
        ? Math.max(0, Number(spawnAsset.overrides?.duration))
        : Math.max(0, Number(spawn.duration))
    );
    setUnsavedChanges(false);
  }, [effective, spawn, spawnAsset, setUnsavedChanges, getCachedDraft]);

  useEffect(() => {
    const onSpawnUpdated = async (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | { spawnId?: string; updatedSpawn?: Spawn }
        | undefined;
      if (!detail?.spawnId || detail.spawnId !== spawnId) return;
      const nextSpawn: Spawn | null = detail.updatedSpawn
        ? detail.updatedSpawn
        : await SpawnService.getSpawn(spawnId);
      if (!nextSpawn || !spawnAsset) return;
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
      onSpawnUpdated as EventListener
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        onSpawnUpdated as EventListener
      );
    };
  }, [spawnId, spawnAssetId, baseAsset, spawnAsset]);

  const setField = (key: FieldKey, value: MediaAssetProperties[FieldKey]) => {
    setDraftValues((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
    // Live-validate the field
    setValidationErrors((prev) => ({
      ...prev,
      [key]: getFieldError(key, { ...draftValues, [key]: value }),
    }));
  };

  const handleCancel = () => {
    if (!effective) return;
    setDraftValues(effective.effective);
    setUnsavedChanges(false);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!spawn || !spawnAsset) return;
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
          : sa
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
          { detail: { spawnId: result.spawn.id } } as CustomEventInit
        )
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save asset settings"
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

  const getFieldError = (
    key: FieldKey,
    values: Partial<MediaAssetProperties>
  ): string | undefined => {
    switch (key) {
      case "volume": {
        const pct = Math.round(((values.volume ?? 0.5) as number) * 100);
        const res = validateVolumePercent(pct);
        return res.isValid ? undefined : res.error;
      }
      case "dimensions": {
        const res = validateDimensionsValues(values.dimensions);
        return res.isValid ? undefined : res.error;
      }
      case "position": {
        const res = validatePositionValues(values.position);
        return res.isValid ? undefined : res.error;
      }
      case "scale": {
        // Handle both number and ScaleObject for backward compatibility
        const scaleValue =
          typeof values.scale === "number" ? values.scale : values.scale?.x;
        const res = validateScaleValue(scaleValue);
        return res.isValid ? undefined : res.error;
      }
      case "rotation": {
        const res = validateRotation(values.rotation);
        return res.isValid ? undefined : res.error;
      }
      case "crop": {
        const res = validateCropSettings(values.crop);
        return res.isValid ? undefined : res.error;
      }
      case "boundsType": {
        const res = validateBoundsType(values.boundsType);
        return res.isValid ? undefined : res.error;
      }
      case "alignment": {
        const res = validateAlignment(values.alignment);
        return res.isValid ? undefined : res.error;
      }
      default:
        return undefined;
    }
  };

  const hasValidationErrors = useMemo(() => {
    return Object.values(validationErrors).some(Boolean);
  }, [validationErrors]);

  if (!spawn || !spawnAsset || !baseAsset || !effective) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">
            Asset Settings
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-600">
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
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Asset Settings
            </h2>
            <p className="text-sm text-gray-600">
              {baseAsset.name} · {type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              aria-label="Back to spawn settings"
            >
              Back
            </button>
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
              disabled={isSaving || hasValidationErrors}
              className={`px-3 py-1.5 rounded-md text-white ${
                isSaving || hasValidationErrors
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              aria-label="Save asset settings"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        {error && (
          <div
            className="mt-3 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded"
            role="alert"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className="mt-3 p-3 bg-green-50 border border-green-200 text-sm text-green-700 rounded"
            role="status"
          >
            {success}
          </div>
        )}
      </div>

      <div className="flex-1 p-4">
        <div className="max-w-2xl space-y-6">
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              Duration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>
          {isVisual && (
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Visual Properties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width (px)
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
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    aria-describedby="dimensions-help dimensions-error"
                  />
                  {validationErrors.dimensions && (
                    <p
                      id="dimensions-error"
                      className="text-xs text-red-600 mt-1"
                    >
                      {validationErrors.dimensions}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (px)
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
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    aria-describedby="dimensions-help"
                  />
                  <p
                    id="dimensions-help"
                    className="text-xs text-gray-500 mt-1"
                  >
                    Positive numbers only.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    X Position (px)
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
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    aria-describedby="position-help position-error"
                  />
                  {validationErrors.position && (
                    <p
                      id="position-error"
                      className="text-xs text-red-600 mt-1"
                    >
                      {validationErrors.position}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Y Position (px)
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
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    aria-describedby="position-help"
                  />
                  <p id="position-help" className="text-xs text-gray-500 mt-1">
                    Use non-negative values. Relative/centered behavior depends
                    on mode.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scale
                  </label>
                  <div className="flex-1">
                    {/* Linked/Unlinked Toggle */}
                    <div className="flex items-center gap-2 mb-2">
                      <label className="flex items-center gap-1 text-xs text-gray-600">
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
                                  : currentScale?.x ?? 1;
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
                                  : currentScale?.x ?? 1;
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
                            <label className="block text-xs text-gray-600 mb-1">
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
                                  parseFloat(e.target.value) || 0
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
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              aria-describedby="scale-help scale-error"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">
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
                                  parseFloat(e.target.value) || 0
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
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              aria-describedby="scale-help scale-error"
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
                              : draftValues.scale?.x ?? ""
                          }
                          onChange={(e) => {
                            const scaleValue = Math.max(
                              0,
                              parseFloat(e.target.value) || 0
                            );
                            setField("scale", {
                              x: scaleValue,
                              y: scaleValue,
                              linked: true,
                            });
                          }}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          aria-describedby="scale-help scale-error"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <p id="scale-help" className="text-xs text-gray-500 mt-1">
                  Enter a non-negative factor (1.0 = 100%). Toggle "Unlinked" to
                  scale X and Y independently.
                </p>
                {validationErrors.scale && (
                  <p id="scale-error" className="text-xs text-red-600 mt-1">
                    {validationErrors.scale}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position Mode
                </label>
                <select
                  value={draftValues.positionMode ?? "absolute"}
                  onChange={(e) =>
                    setField(
                      "positionMode",
                      e.target.value as MediaAssetProperties["positionMode"]
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="absolute">Absolute (px)</option>
                  <option value="relative">Relative (%)</option>
                  <option value="centered">Centered</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rotation (°)
                </label>
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={draftValues.rotation ?? 0}
                    onChange={(e) =>
                      setField("rotation", Number(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    aria-label="Rotation slider"
                    aria-describedby="rotation-help rotation-error"
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
                        Math.max(0, Math.min(360, Number(e.target.value) || 0))
                      )
                    }
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent mt-2"
                    aria-describedby="rotation-help rotation-error"
                  />
                </div>
                <p id="rotation-help" className="text-xs text-gray-500 mt-1">
                  Rotate the asset from 0° to 360°.
                </p>
                {validationErrors.rotation && (
                  <p id="rotation-error" className="text-xs text-red-600 mt-1">
                    {validationErrors.rotation}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crop (px)
                </label>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
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
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="crop-help crop-error"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
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
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="crop-help crop-error"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
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
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="crop-help crop-error"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
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
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="crop-help crop-error"
                    />
                  </div>
                </div>
                <p id="crop-help" className="text-xs text-gray-500 mt-1">
                  Crop the asset by removing pixels from the edges.
                </p>
                {validationErrors.crop && (
                  <p id="crop-error" className="text-xs text-red-600 mt-1">
                    {validationErrors.crop}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bounds Type
                </label>
                <select
                  value={draftValues.boundsType ?? ""}
                  onChange={(e) =>
                    setField(
                      "boundsType",
                      e.target.value
                        ? (e.target.value as BoundsType)
                        : undefined
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  aria-describedby="bounds-type-help bounds-type-error"
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
                <p id="bounds-type-help" className="text-xs text-gray-500 mt-1">
                  Select how the asset should be scaled within its bounds.
                </p>
                {validationErrors.boundsType && (
                  <p
                    id="bounds-type-error"
                    className="text-xs text-red-600 mt-1"
                  >
                    {validationErrors.boundsType}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alignment
                </label>
                <select
                  value={draftValues.alignment ?? ""}
                  onChange={(e) =>
                    setField(
                      "alignment",
                      e.target.value
                        ? (Number(e.target.value) as AlignmentOption)
                        : undefined
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  aria-describedby="alignment-help alignment-error"
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
                <p id="alignment-help" className="text-xs text-gray-500 mt-1">
                  Select the alignment position for the asset within its bounds.
                </p>
                {validationErrors.alignment && (
                  <p id="alignment-error" className="text-xs text-red-600 mt-1">
                    {validationErrors.alignment}
                  </p>
                )}
              </div>
            </section>
          )}

          {(type === "video" || isAudio) && (
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Playback Properties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Volume (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((draftValues.volume ?? 0.5) * 100)}
                      onChange={(e) =>
                        setField("volume", (Number(e.target.value) || 0) / 100)
                      }
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="volume-help volume-error"
                    />
                  </div>

                  {validationErrors.volume && (
                    <p id="volume-error" className="text-xs text-red-600 mt-1">
                      {validationErrors.volume}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!draftValues.loop}
                      onChange={(e) => setField("loop", e.target.checked)}
                    />
                    Loop
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!draftValues.autoplay}
                      onChange={(e) => setField("autoplay", e.target.checked)}
                    />
                    Autoplay
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
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
    </div>
  );
};

export default AssetSettingsForm;
