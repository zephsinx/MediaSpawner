import type { MediaAssetProperties } from "../types/media";
import type { Spawn } from "../types/spawn";

export interface EffectivePropertiesResult {
  effective: MediaAssetProperties;
  sourceMap: Partial<Record<keyof MediaAssetProperties, "override" | "none">>;
}

export function resolveEffectiveProperties(args: {
  spawn: Spawn;
  overrides?: Partial<MediaAssetProperties> | undefined;
}): EffectivePropertiesResult {
  const { overrides } = args;
  const result: Partial<MediaAssetProperties> = {};
  const sourceMap: EffectivePropertiesResult["sourceMap"] = {};

  const consider = <K extends keyof MediaAssetProperties>(
    key: K,
    mergeFn?: (values: {
      overrideVal: MediaAssetProperties[K] | undefined;
    }) => MediaAssetProperties[K] | undefined,
  ) => {
    const overrideVal: MediaAssetProperties[K] | undefined = overrides?.[key];

    let chosen: MediaAssetProperties[K] | undefined;
    if (mergeFn) {
      chosen = mergeFn({
        overrideVal,
      });
      if (overrideVal !== undefined && chosen === overrideVal)
        sourceMap[key] = "override";
      else sourceMap[key] = "none";
    } else {
      if (overrideVal !== undefined) {
        sourceMap[key] = "override";
        chosen = overrideVal;
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
  consider("rotation");
  consider("alignment");
  consider("boundsType");
  consider("boundsAlignment");
  consider("volume");
  consider("loop");
  consider("autoplay");
  consider("muted");
  consider("monitorType");
  consider("randomCoordinates");

  // Structured fields with deep merge fallback (first defined wins)
  consider("dimensions", ({ overrideVal }) => {
    return overrideVal ?? undefined;
  });
  consider("position", ({ overrideVal }) => {
    return overrideVal ?? undefined;
  });
  consider("crop", ({ overrideVal }) => {
    return overrideVal ?? undefined;
  });

  return { effective: result as MediaAssetProperties, sourceMap };
}

export function buildOverridesDiff(
  desired: Partial<MediaAssetProperties>,
): Partial<MediaAssetProperties> {
  const overrides: Partial<MediaAssetProperties> = {};

  const assignIfDifferent = <K extends keyof MediaAssetProperties>(key: K) => {
    const desiredVal = desired[key];
    if (desiredVal !== undefined) {
      (overrides as Partial<MediaAssetProperties>)[key] = desiredVal;
    }
  };

  assignIfDifferent("dimensions");
  assignIfDifferent("position");
  assignIfDifferent("scale");
  assignIfDifferent("positionMode");
  assignIfDifferent("rotation");
  assignIfDifferent("crop");
  assignIfDifferent("alignment");
  assignIfDifferent("boundsType");
  assignIfDifferent("boundsAlignment");
  assignIfDifferent("volume");
  assignIfDifferent("loop");
  assignIfDifferent("autoplay");
  assignIfDifferent("muted");
  assignIfDifferent("monitorType");
  assignIfDifferent("randomCoordinates");

  return overrides;
}
