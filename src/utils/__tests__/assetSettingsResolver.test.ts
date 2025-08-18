import { describe, it, expect, beforeEach } from "vitest";
import type { MediaAssetProperties } from "../../types/media";
import type { Spawn } from "../../types/spawn";
import {
  resolveEffectiveProperties,
  buildOverridesDiff,
} from "../assetSettingsResolver";

// Base asset fallback removed; tests no longer rely on base asset properties

const spawnFactory = (defaults: Partial<MediaAssetProperties> = {}): Spawn => ({
  id: "spawn-1",
  name: "Test Spawn",
  description: "",
  enabled: true,
  trigger: { type: "manual", config: {} },
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

  it("uses override over spawn default", () => {
    const spawn = spawnFactory({ volume: 0.4 });
    const { effective, sourceMap } = resolveEffectiveProperties({
      spawn,
      overrides: { volume: 0.8 },
    });
    expect(effective.volume).toBe(0.8);
    expect(sourceMap.volume).toBe("override");
  });

  it("falls back to spawn default when no override present", () => {
    const spawn = spawnFactory({ volume: 0.5 });
    const { effective, sourceMap } = resolveEffectiveProperties({
      spawn,
      overrides: {},
    });
    expect(effective.volume).toBe(0.5);
    expect(sourceMap.volume).toBe("spawn-default");
  });

  it("returns undefined when neither override nor spawn default present", () => {
    const spawn = spawnFactory({});
    const { effective, sourceMap } = resolveEffectiveProperties({
      spawn,
      overrides: {},
    });
    expect(effective.scale).toBeUndefined();
    expect(sourceMap.scale).toBe("none");
  });

  it("handles structured fields (dimensions, position)", () => {
    const spawn = spawnFactory({});
    const { effective } = resolveEffectiveProperties({
      spawn,
      overrides: {},
    });
    expect(effective.dimensions).toBeUndefined();
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
    const diff = buildOverridesDiff(spawnDefaults, desired);
    expect(diff).toEqual({ volume: 0.7, muted: true });
    expect(diff.scale).toBeUndefined();
  });
});
