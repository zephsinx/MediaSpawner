import { describe, it, expect, beforeEach } from "vitest";
import type { MediaAsset, MediaAssetProperties } from "../../types/media";
import type { Spawn } from "../../types/spawn";
import {
  resolveEffectiveProperties,
  buildOverridesDiff,
} from "../assetSettingsResolver";

const baseAssetFactory = (
  props: Partial<MediaAssetProperties> = {}
): MediaAsset => ({
  id: "asset-1",
  type: "video",
  name: "Base Video",
  path: "video.mp4",
  isUrl: false,
  properties: {
    dimensions: { width: 200, height: 100 },
    position: { x: 10, y: 20 },
    scale: 1,
    positionMode: "absolute",
    volume: 0.3,
    loop: false,
    autoplay: false,
    muted: false,
    ...props,
  },
});

const spawnFactory = (defaults: Partial<MediaAssetProperties> = {}): Spawn => ({
  id: "spawn-1",
  name: "Test Spawn",
  description: "",
  enabled: true,
  trigger: { enabled: true, type: "manual", config: { type: "manual" } },
  duration: 5000,
  assets: [],
  defaultProperties: defaults,
  lastModified: Date.now(),
  order: 0,
});

describe("assetSettingsResolver", () => {
  beforeEach(() => {
    // nothing to reset
  });

  it("uses override over spawn default and base asset", () => {
    const base = baseAssetFactory({ volume: 0.2 });
    const spawn = spawnFactory({ volume: 0.4 });
    const { effective, sourceMap } = resolveEffectiveProperties({
      base,
      spawn,
      overrides: { volume: 0.8 },
    });
    expect(effective.volume).toBe(0.8);
    expect(sourceMap.volume).toBe("override");
  });

  it("falls back to spawn default when no override present", () => {
    const base = baseAssetFactory({ volume: 0.2 });
    const spawn = spawnFactory({ volume: 0.5 });
    const { effective, sourceMap } = resolveEffectiveProperties({
      base,
      spawn,
      overrides: {},
    });
    expect(effective.volume).toBe(0.5);
    expect(sourceMap.volume).toBe("spawn-default");
  });

  it("falls back to base asset when neither override nor spawn default present", () => {
    const base = baseAssetFactory({ scale: 1.25 });
    const spawn = spawnFactory({});
    const { effective, sourceMap } = resolveEffectiveProperties({
      base,
      spawn,
      overrides: {},
    });
    expect(effective.scale).toBe(1.25);
    expect(sourceMap.scale).toBe("base-asset");
  });

  it("handles structured fields (dimensions, position)", () => {
    const base = baseAssetFactory({ dimensions: { width: 300, height: 150 } });
    const spawn = spawnFactory({});
    const { effective } = resolveEffectiveProperties({
      base,
      spawn,
      overrides: {},
    });
    expect(effective.dimensions).toEqual({ width: 300, height: 150 });
  });

  it("buildOverridesDiff returns only keys different from spawn defaults", () => {
    const spawnDefaults: Partial<MediaAssetProperties> = {
      volume: 0.5,
      scale: 1,
      positionMode: "absolute",
    };
    const desired: Partial<MediaAssetProperties> = {
      volume: 0.7, // different
      scale: 1, // same as default, should be omitted
      muted: true, // different (default undefined)
    };
    const diff = buildOverridesDiff({}, spawnDefaults, desired);
    expect(diff).toEqual({ volume: 0.7, muted: true });
    expect(diff.scale).toBeUndefined();
  });
});
