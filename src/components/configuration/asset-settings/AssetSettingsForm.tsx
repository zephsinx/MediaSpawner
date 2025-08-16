import React, { useEffect, useMemo, useRef, useState } from "react";
import { AssetService } from "../../../services/assetService";
import { SpawnService } from "../../../services/spawnService";
import type { MediaAsset, MediaAssetProperties } from "../../../types/media";
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
    if (!spawn || !spawnAsset || !baseAsset) return null;
    return resolveEffectiveProperties({
      base: baseAsset,
      spawn,
      overrides: spawnAsset.overrides?.properties,
    });
  }, [spawn, spawnAsset, baseAsset]);

  const inheritedOnly = useMemo(() => {
    if (!spawn || !baseAsset) return null;
    return resolveEffectiveProperties({
      base: baseAsset,
      spawn,
      overrides: undefined,
    });
  }, [spawn, baseAsset]);

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
      if (!nextSpawn || !spawnAsset || !baseAsset) return;
      const nextSpawnAsset =
        nextSpawn.assets.find((a) => a.id === spawnAssetId) || null;
      if (!nextSpawnAsset) return;
      setSpawn(nextSpawn);
      setSpawnAsset(nextSpawnAsset);
      const nextEffective = resolveEffectiveProperties({
        base: baseAsset,
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

      const diff = buildOverridesDiff(
        effective?.effective || {},
        spawn.defaultProperties,
        desired
      );
      const updatedAssets: SpawnAsset[] = spawn.assets.map((sa) =>
        sa.id === spawnAsset.id
          ? {
              ...sa,
              overrides: {
                ...sa.overrides,
                properties: diff,
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
        const res = validateScaleValue(values.scale as number | undefined);
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
                      : effective.sourceMap.dimensions === "spawn-default"
                      ? "Inherited from Spawn Defaults"
                      : "Inherited from Asset"}
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
                      : effective.sourceMap.position === "spawn-default"
                      ? "Inherited from Spawn Defaults"
                      : "Inherited from Asset"}
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
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={draftValues.scale ?? ""}
                      onChange={(e) =>
                        setField(
                          "scale",
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      disabled={!overrideEnabled.scale}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      aria-describedby="scale-help scale-error"
                    />
                  </div>
                  <p id="scale-help" className="text-xs text-gray-500 mt-1">
                    Enter a non-negative factor (1.0 = 100%).
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {overrideEnabled.scale
                      ? "Overridden"
                      : effective.sourceMap.scale === "spawn-default"
                      ? "Inherited from Spawn Defaults"
                      : "Inherited from Asset"}
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
                      : effective.sourceMap.positionMode === "spawn-default"
                      ? "Inherited from Spawn Defaults"
                      : "Inherited from Asset"}
                  </p>
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
