import type { MediaAssetProperties } from "../types/media";
import type { Spawn } from "../types/spawn";

export interface EffectivePropertiesResult {
  effective: MediaAssetProperties;
  sourceMap: Partial<
    Record<keyof MediaAssetProperties, "override" | "spawn-default" | "none">
  >;
}

export function resolveEffectiveProperties(args: {
  spawn: Spawn;
  overrides?: Partial<MediaAssetProperties> | undefined;
}): EffectivePropertiesResult {
  const { spawn, overrides } = args;
  const result: Partial<MediaAssetProperties> = {};
  const sourceMap: EffectivePropertiesResult["sourceMap"] = {};

  const consider = <K extends keyof MediaAssetProperties>(
    key: K,
    mergeFn?: (values: {
      overrideVal: MediaAssetProperties[K] | undefined;
      spawnVal: MediaAssetProperties[K] | undefined;
      baseVal: MediaAssetProperties[K] | undefined;
    }) => MediaAssetProperties[K] | undefined
  ) => {
    const overrideVal: MediaAssetProperties[K] | undefined = overrides?.[key];
    const spawnVal: MediaAssetProperties[K] | undefined =
      spawn.defaultProperties?.[key];

    let chosen: MediaAssetProperties[K] | undefined;
    if (mergeFn) {
      // merge without base asset fallback
      chosen = mergeFn({
        overrideVal,
        spawnVal,
        baseVal: undefined as unknown as MediaAssetProperties[K],
      });
      if (chosen === overrideVal) sourceMap[key] = "override";
      else if (chosen === spawnVal) sourceMap[key] = "spawn-default";
      else sourceMap[key] = "none";
    } else {
      if (overrideVal !== undefined) {
        sourceMap[key] = "override";
        chosen = overrideVal;
      } else if (spawnVal !== undefined) {
        sourceMap[key] = "spawn-default";
        chosen = spawnVal;
      } else {
        sourceMap[key] = "none";
        chosen = undefined as unknown as MediaAssetProperties[K];
      }
    }
    (result as Record<string, unknown>)[key as string] = chosen as unknown;
  };

  // Simple scalar fields
  consider("scale");
  consider("positionMode");
  consider("volume");
  consider("loop");
  consider("autoplay");
  consider("muted");

  // Structured fields with deep merge fallback (first defined wins)
  consider("dimensions", ({ overrideVal, spawnVal }) => {
    return overrideVal ?? spawnVal ?? undefined;
  });
  consider("position", ({ overrideVal, spawnVal }) => {
    return overrideVal ?? spawnVal ?? undefined;
  });

  return { effective: result as MediaAssetProperties, sourceMap };
}

export function buildOverridesDiff(
  effective: MediaAssetProperties, // kept for future use
  spawnDefaults: Partial<MediaAssetProperties> | undefined,
  desired: Partial<MediaAssetProperties>
): Partial<MediaAssetProperties> {
  const overrides: Partial<MediaAssetProperties> = {};

  const assignIfDifferent = <K extends keyof MediaAssetProperties>(key: K) => {
    const baseVal = spawnDefaults?.[key];
    const desiredVal = desired[key];
    if (desiredVal !== undefined) {
      if (JSON.stringify(desiredVal) !== JSON.stringify(baseVal)) {
        (overrides as Partial<MediaAssetProperties>)[key] = desiredVal;
      }
    }
  };

  assignIfDifferent("dimensions");
  assignIfDifferent("position");
  assignIfDifferent("scale");
  assignIfDifferent("positionMode");
  assignIfDifferent("volume");
  assignIfDifferent("loop");
  assignIfDifferent("autoplay");
  assignIfDifferent("muted");

  return overrides;
}
