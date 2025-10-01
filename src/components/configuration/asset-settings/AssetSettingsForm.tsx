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
        overrideEnabled: Partial<Record<keyof MediaAssetProperties, boolean>>;
        draftValues: Partial<MediaAssetProperties>;
      }
    | undefined;
  setCachedDraft?: (draft: {
    overrideEnabled: Partial<Record<keyof MediaAssetProperties, boolean>>;
    draftValues: Partial<MediaAssetProperties>;
  }) => void;
}

type FieldKey = keyof MediaAssetProperties;

const OVERRIDABLE_FIELDS: FieldKey[] = [
  "dimensions",
  "position",
  "scale",
  "positionMode",
  "rotation",
  "crop",
  "boundsType",
  "alignment",
  "volume",
  "loop",
  "autoplay",
  "muted",
];

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

  // Local draft state: override toggles and values
  const [overrideEnabled, setOverrideEnabled] = useState<
    Partial<Record<FieldKey, boolean>>
  >({});
  const [durationOverrideEnabled, setDurationOverrideEnabled] =
    useState<boolean>(false);
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

  const inheritedOnly = useMemo(() => {
    if (!spawn) return null;
    return resolveEffectiveProperties({
      spawn,
      overrides: undefined,
    });
  }, [spawn]);

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
      setOverrideEnabled(
        cached.overrideEnabled as Partial<Record<FieldKey, boolean>>
      );
    } else {
      setDraftValues(effective.effective);
      const toggles: Partial<Record<FieldKey, boolean>> = {};
      OVERRIDABLE_FIELDS.forEach((fieldKey) => {
        const props = spawnAsset.overrides?.properties as
          | Partial<MediaAssetProperties>
          | undefined;
        toggles[fieldKey] = props ? props[fieldKey] !== undefined : false;
      });
      setOverrideEnabled(toggles);
      const hasDurationOverride =
        typeof spawnAsset.overrides?.duration === "number";
      setDurationOverrideEnabled(!!hasDurationOverride);
      setDurationDraftMs(
        hasDurationOverride
          ? Math.max(0, Number(spawnAsset.overrides?.duration))
          : Math.max(0, Number(spawn.duration))
      );
    }
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
      setDraftValues((prev) => {
        const updated: Partial<MediaAssetProperties> = { ...prev };
        OVERRIDABLE_FIELDS.forEach((key) => {
          if (!overrideEnabled[key]) {
            (updated as Record<string, unknown>)[key] = nextEffective.effective[
              key as keyof MediaAssetProperties
            ] as unknown;
          }
        });
        return updated;
      });
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
  }, [spawnId, spawnAssetId, baseAsset, overrideEnabled, spawnAsset]);

  const setField = (key: FieldKey, value: MediaAssetProperties[FieldKey]) => {
    setDraftValues((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
    // Live-validate only when override is enabled for the field
    if (overrideEnabled[key]) {
      setValidationErrors((prev) => ({
        ...prev,
        [key]: getFieldError(key, { ...draftValues, [key]: value }),
      }));
    }
  };

  const setToggle = (key: FieldKey, enable: boolean) => {
    setOverrideEnabled((prev) => ({ ...prev, [key]: enable }));
    setUnsavedChanges(true);
    if (!enable && inheritedOnly) {
      setDraftValues((prev) => ({
        ...prev,
        [key]: inheritedOnly.effective[key],
      }));
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete (next as Record<string, unknown>)[key];
        return next;
      });
    } else if (enable) {
      setValidationErrors((prev) => ({
        ...prev,
        [key]: getFieldError(key, draftValues),
      }));
    }
  };

  const handleCancel = () => {
    if (!effective) return;
    setDraftValues(effective.effective);
    const toggles: Partial<Record<FieldKey, boolean>> = {};
    OVERRIDABLE_FIELDS.forEach((key) => {
      const props = spawnAsset?.overrides?.properties as
        | Partial<MediaAssetProperties>
        | undefined;
      toggles[key] = props ? props[key] !== undefined : false;
    });
    setOverrideEnabled(toggles);
    setUnsavedChanges(false);
    setSuccess(null);
    setError(null);
  };

  const handleResetAll = () => {
    if (!inheritedOnly) return;
    const nextToggles: Partial<Record<FieldKey, boolean>> = {};
    OVERRIDABLE_FIELDS.forEach((k) => {
      nextToggles[k] = false;
    });
    setOverrideEnabled(nextToggles);
    setDraftValues(inheritedOnly.effective);
    setDurationOverrideEnabled(false);
    setDurationDraftMs(Math.max(0, Number(spawn?.duration || 0)));
    setUnsavedChanges(true);
    setValidationErrors({});
  };

  const handleSave = async () => {
    if (!spawn || !spawnAsset) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Construct desired override payload limited to toggled-on fields
      const desired: Partial<MediaAssetProperties> = {};
      if (overrideEnabled.dimensions)
        desired.dimensions = draftValues.dimensions;
      if (overrideEnabled.position) desired.position = draftValues.position;
      if (overrideEnabled.scale) desired.scale = draftValues.scale;
      if (overrideEnabled.positionMode)
        desired.positionMode = draftValues.positionMode;
      if (overrideEnabled.volume) desired.volume = draftValues.volume;
      if (overrideEnabled.loop) desired.loop = draftValues.loop;
      if (overrideEnabled.autoplay) desired.autoplay = draftValues.autoplay;
      if (overrideEnabled.muted) desired.muted = draftValues.muted;

      const diff = buildOverridesDiff(desired);
      const updatedAssets: SpawnAsset[] = spawn.assets.map((sa) =>
        sa.id === spawnAsset.id
          ? {
              ...sa,
              overrides: {
                ...sa.overrides,
                properties: diff,
                duration: durationOverrideEnabled
                  ? Math.max(0, durationDraftMs)
                  : undefined,
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
          overrideEnabled,
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
        setCachedDraft({ overrideEnabled, draftValues });
      }
    };
  }, [overrideEnabled, draftValues, setCachedDraft]);

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
              onClick={handleResetAll}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              aria-label="Reset all fields to spawn defaults"
            >
              Reset
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={durationOverrideEnabled}
                    onChange={(e) => {
                      setDurationOverrideEnabled(e.target.checked);
                      setUnsavedChanges(true);
                      if (!e.target.checked && spawn) {
                        setDurationDraftMs(Math.max(1, Number(spawn.duration)));
                      }
                    }}
                    aria-label="Override duration"
                  />
                  <input
                    type="number"
                    min={0}
                    value={durationDraftMs}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setDurationDraftMs(val);
                      setUnsavedChanges(true);
                    }}
                    disabled={!durationOverrideEnabled}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {durationOverrideEnabled
                    ? "Overridden"
                    : "Inherited from Spawn"}
                </p>
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.dimensions}
                      onChange={(e) =>
                        setToggle("dimensions", e.target.checked)
                      }
                      aria-label="Override dimensions"
                    />
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
                      disabled={!overrideEnabled.dimensions}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="dimensions-help dimensions-error"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {overrideEnabled.dimensions
                      ? "Overridden"
                      : effective.sourceMap.dimensions === "none"
                      ? "Inherited from Spawn"
                      : "Not set"}
                  </p>
                  {overrideEnabled.dimensions &&
                    validationErrors.dimensions && (
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
                  <div className="flex items-center gap-2">
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
                      disabled={!overrideEnabled.dimensions}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="dimensions-help"
                    />
                  </div>
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.position}
                      onChange={(e) => setToggle("position", e.target.checked)}
                      aria-label="Override position"
                    />
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
                      disabled={!overrideEnabled.position}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="position-help position-error"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {overrideEnabled.position
                      ? "Overridden"
                      : effective.sourceMap.position === "none"
                      ? "Inherited from Spawn"
                      : "Not set"}
                  </p>
                  {overrideEnabled.position && validationErrors.position && (
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
                  <div className="flex items-center gap-2">
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
                      disabled={!overrideEnabled.position}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="position-help"
                    />
                  </div>
                  <p id="position-help" className="text-xs text-gray-500 mt-1">
                    Use non-negative values. Relative/centered behavior depends
                    on mode.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scale
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.scale}
                      onChange={(e) => setToggle("scale", e.target.checked)}
                      aria-label="Override scale"
                    />
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
                            disabled={!overrideEnabled.scale}
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
                                disabled={!overrideEnabled.scale}
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
                                disabled={!overrideEnabled.scale}
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
                            disabled={!overrideEnabled.scale}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            aria-describedby="scale-help scale-error"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <p id="scale-help" className="text-xs text-gray-500 mt-1">
                    Enter a non-negative factor (1.0 = 100%). Toggle "Unlinked"
                    to scale X and Y independently.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {overrideEnabled.scale
                      ? "Overridden"
                      : effective.sourceMap.scale === "none"
                      ? "Inherited from Spawn"
                      : "Not set"}
                  </p>
                  {overrideEnabled.scale && validationErrors.scale && (
                    <p id="scale-error" className="text-xs text-red-600 mt-1">
                      {validationErrors.scale}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position Mode
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.positionMode}
                      onChange={(e) =>
                        setToggle("positionMode", e.target.checked)
                      }
                      aria-label="Override position mode"
                    />
                    <select
                      value={draftValues.positionMode ?? "absolute"}
                      onChange={(e) =>
                        setField(
                          "positionMode",
                          e.target.value as MediaAssetProperties["positionMode"]
                        )
                      }
                      disabled={!overrideEnabled.positionMode}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="absolute">Absolute (px)</option>
                      <option value="relative">Relative (%)</option>
                      <option value="centered">Centered</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {overrideEnabled.positionMode
                      ? "Overridden"
                      : effective.sourceMap.positionMode === "none"
                      ? "Inherited from Spawn"
                      : "Not set"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rotation (°)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.rotation}
                      onChange={(e) => setToggle("rotation", e.target.checked)}
                      aria-label="Override rotation"
                    />
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
                        disabled={!overrideEnabled.rotation}
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
                            Math.max(
                              0,
                              Math.min(360, Number(e.target.value) || 0)
                            )
                          )
                        }
                        disabled={!overrideEnabled.rotation}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent mt-2"
                        aria-describedby="rotation-help rotation-error"
                      />
                    </div>
                  </div>
                  <p id="rotation-help" className="text-xs text-gray-500 mt-1">
                    Rotate the asset from 0° to 360°.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {overrideEnabled.rotation
                      ? "Overridden"
                      : effective.sourceMap.rotation === "none"
                      ? "Inherited from Spawn"
                      : "Not set"}
                  </p>
                  {overrideEnabled.rotation && validationErrors.rotation && (
                    <p
                      id="rotation-error"
                      className="text-xs text-red-600 mt-1"
                    >
                      {validationErrors.rotation}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crop (px)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.crop}
                      onChange={(e) => setToggle("crop", e.target.checked)}
                      aria-label="Override crop"
                    />
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
                          disabled={!overrideEnabled.crop}
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
                          disabled={!overrideEnabled.crop}
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
                          disabled={!overrideEnabled.crop}
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
                          disabled={!overrideEnabled.crop}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          aria-describedby="crop-help crop-error"
                        />
                      </div>
                    </div>
                  </div>
                  <p id="crop-help" className="text-xs text-gray-500 mt-1">
                    Crop the asset by removing pixels from the edges.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {overrideEnabled.crop
                      ? "Overridden"
                      : effective.sourceMap.crop === "none"
                      ? "Inherited from Spawn"
                      : "Not set"}
                  </p>
                  {overrideEnabled.crop && validationErrors.crop && (
                    <p id="crop-error" className="text-xs text-red-600 mt-1">
                      {validationErrors.crop}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bounds Type
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.boundsType}
                      onChange={(e) =>
                        setToggle("boundsType", e.target.checked)
                      }
                      aria-label="Override bounds type"
                    />
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
                      disabled={!overrideEnabled.boundsType}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="bounds-type-help bounds-type-error"
                    >
                      <option value="">Select bounds type...</option>
                      <option value="OBS_BOUNDS_NONE">None</option>
                      <option value="OBS_BOUNDS_STRETCH">Stretch</option>
                      <option value="OBS_BOUNDS_SCALE_INNER">
                        Scale Inner
                      </option>
                      <option value="OBS_BOUNDS_SCALE_OUTER">
                        Scale Outer
                      </option>
                      <option value="OBS_BOUNDS_SCALE_TO_WIDTH">
                        Scale to Width
                      </option>
                      <option value="OBS_BOUNDS_SCALE_TO_HEIGHT">
                        Scale to Height
                      </option>
                      <option value="OBS_BOUNDS_MAX_ONLY">Max Only</option>
                    </select>
                  </div>
                  <p
                    id="bounds-type-help"
                    className="text-xs text-gray-500 mt-1"
                  >
                    Select how the asset should be scaled within its bounds.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {overrideEnabled.boundsType
                      ? "Overridden"
                      : effective.sourceMap.boundsType === "none"
                      ? "Inherited from Spawn"
                      : "Not set"}
                  </p>
                  {overrideEnabled.boundsType &&
                    validationErrors.boundsType && (
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.alignment}
                      onChange={(e) => setToggle("alignment", e.target.checked)}
                      aria-label="Override alignment"
                    />
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
                      disabled={!overrideEnabled.alignment}
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
                  </div>
                  <p id="alignment-help" className="text-xs text-gray-500 mt-1">
                    Select the alignment position for the asset within its
                    bounds.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {overrideEnabled.alignment
                      ? "Overridden"
                      : effective.sourceMap.alignment === "none"
                      ? "Inherited from Spawn"
                      : "Not set"}
                  </p>
                  {overrideEnabled.alignment && validationErrors.alignment && (
                    <p
                      id="alignment-error"
                      className="text-xs text-red-600 mt-1"
                    >
                      {validationErrors.alignment}
                    </p>
                  )}
                </div>
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
                      type="checkbox"
                      checked={!!overrideEnabled.volume}
                      onChange={(e) => setToggle("volume", e.target.checked)}
                      aria-label="Override volume"
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((draftValues.volume ?? 0.5) * 100)}
                      onChange={(e) =>
                        setField("volume", (Number(e.target.value) || 0) / 100)
                      }
                      disabled={!overrideEnabled.volume}
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
                      disabled={!overrideEnabled.volume}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="volume-help volume-error"
                    />
                  </div>

                  {overrideEnabled.volume && validationErrors.volume && (
                    <p id="volume-error" className="text-xs text-red-600 mt-1">
                      {validationErrors.volume}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.loop && !!draftValues.loop}
                      onChange={(e) => {
                        if (!overrideEnabled.loop) setToggle("loop", true);
                        setField("loop", e.target.checked);
                      }}
                    />
                    Loop
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={
                        !!overrideEnabled.autoplay && !!draftValues.autoplay
                      }
                      onChange={(e) => {
                        if (!overrideEnabled.autoplay)
                          setToggle("autoplay", true);
                        setField("autoplay", e.target.checked);
                      }}
                    />
                    Autoplay
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!overrideEnabled.muted && !!draftValues.muted}
                      onChange={(e) => {
                        if (!overrideEnabled.muted) setToggle("muted", true);
                        setField("muted", e.target.checked);
                      }}
                    />
                    Muted
                  </label>
                </div>
              </div>
            </section>
          )}

          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-2">
              Summary
            </h3>
            <p className="text-xs text-gray-600">
              Fields without override toggled use inherited values from spawn
              defaults or the base asset.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AssetSettingsForm;
