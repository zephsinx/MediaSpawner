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
  duration: 0,
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

  describe("new transform properties", () => {
    describe("rotation", () => {
      it("uses override over spawn default for rotation", () => {
        const spawn = spawnFactory({ rotation: 45 });
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { rotation: 90 },
        });
        expect(effective.rotation).toBe(90);
        expect(sourceMap.rotation).toBe("override");
      });

      it("falls back to spawn default for rotation", () => {
        const spawn = spawnFactory({ rotation: 180 });
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.rotation).toBe(180);
        expect(sourceMap.rotation).toBe("spawn-default");
      });

      it("returns undefined when no rotation set", () => {
        const spawn = spawnFactory({});
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.rotation).toBeUndefined();
        expect(sourceMap.rotation).toBe("none");
      });
    });

    describe("crop", () => {
      it("uses override over spawn default for crop", () => {
        const spawn = spawnFactory({
          crop: { left: 10, top: 20, right: 30, bottom: 40 },
        });
        const overrideCrop = { left: 5, top: 15, right: 25, bottom: 35 };
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { crop: overrideCrop },
        });
        expect(effective.crop).toEqual(overrideCrop);
        expect(sourceMap.crop).toBe("override");
      });

      it("falls back to spawn default for crop", () => {
        const spawnCrop = { left: 10, top: 20, right: 30, bottom: 40 };
        const spawn = spawnFactory({ crop: spawnCrop });
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.crop).toEqual(spawnCrop);
        expect(sourceMap.crop).toBe("spawn-default");
      });

      it("returns undefined when no crop set", () => {
        const spawn = spawnFactory({});
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.crop).toBeUndefined();
        expect(sourceMap.crop).toBe("none");
      });
    });

    describe("alignment", () => {
      it("uses override over spawn default for alignment", () => {
        const spawn = spawnFactory({ alignment: 0 });
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { alignment: 5 },
        });
        expect(effective.alignment).toBe(5);
        expect(sourceMap.alignment).toBe("override");
      });

      it("falls back to spawn default for alignment", () => {
        const spawn = spawnFactory({ alignment: 9 });
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.alignment).toBe(9);
        expect(sourceMap.alignment).toBe("spawn-default");
      });

      it("returns undefined when no alignment set", () => {
        const spawn = spawnFactory({});
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.alignment).toBeUndefined();
        expect(sourceMap.alignment).toBe("none");
      });
    });

    describe("boundsType", () => {
      it("uses override over spawn default for boundsType", () => {
        const spawn = spawnFactory({ boundsType: "OBS_BOUNDS_STRETCH" });
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { boundsType: "OBS_BOUNDS_SCALE_INNER" },
        });
        expect(effective.boundsType).toBe("OBS_BOUNDS_SCALE_INNER");
        expect(sourceMap.boundsType).toBe("override");
      });

      it("falls back to spawn default for boundsType", () => {
        const spawn = spawnFactory({ boundsType: "OBS_BOUNDS_NONE" });
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.boundsType).toBe("OBS_BOUNDS_NONE");
        expect(sourceMap.boundsType).toBe("spawn-default");
      });

      it("returns undefined when no boundsType set", () => {
        const spawn = spawnFactory({});
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.boundsType).toBeUndefined();
        expect(sourceMap.boundsType).toBe("none");
      });
    });

    describe("boundsAlignment", () => {
      it("uses override over spawn default for boundsAlignment", () => {
        const spawn = spawnFactory({ boundsAlignment: 0 });
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { boundsAlignment: 5 },
        });
        expect(effective.boundsAlignment).toBe(5);
        expect(sourceMap.boundsAlignment).toBe("override");
      });

      it("falls back to spawn default for boundsAlignment", () => {
        const spawn = spawnFactory({ boundsAlignment: 10 });
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.boundsAlignment).toBe(10);
        expect(sourceMap.boundsAlignment).toBe("spawn-default");
      });

      it("returns undefined when no boundsAlignment set", () => {
        const spawn = spawnFactory({});
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.boundsAlignment).toBeUndefined();
        expect(sourceMap.boundsAlignment).toBe("none");
      });
    });
  });

  describe("buildOverridesDiff with new properties", () => {
    it("includes new properties in diff when different from spawn defaults", () => {
      const spawnDefaults: Partial<MediaAssetProperties> = {
        rotation: 0,
        crop: { left: 0, top: 0, right: 0, bottom: 0 },
        alignment: 0,
        boundsType: "OBS_BOUNDS_NONE",
        boundsAlignment: 0,
      };
      const desired: Partial<MediaAssetProperties> = {
        rotation: 90, // different
        crop: { left: 10, top: 20, right: 30, bottom: 40 }, // different
        alignment: 5, // different
        boundsType: "OBS_BOUNDS_STRETCH", // different
        boundsAlignment: 5, // different
        volume: 0.5, // different (default undefined)
      };
      const diff = buildOverridesDiff(spawnDefaults, desired);
      expect(diff).toEqual({
        rotation: 90,
        crop: { left: 10, top: 20, right: 30, bottom: 40 },
        alignment: 5,
        boundsType: "OBS_BOUNDS_STRETCH",
        boundsAlignment: 5,
        volume: 0.5,
      });
    });

    it("omits new properties when same as spawn defaults", () => {
      const spawnDefaults: Partial<MediaAssetProperties> = {
        rotation: 45,
        crop: { left: 10, top: 20, right: 30, bottom: 40 },
        alignment: 5,
        boundsType: "OBS_BOUNDS_STRETCH",
        boundsAlignment: 5,
      };
      const desired: Partial<MediaAssetProperties> = {
        rotation: 45, // same as default
        crop: { left: 10, top: 20, right: 30, bottom: 40 }, // same as default
        alignment: 5, // same as default
        boundsType: "OBS_BOUNDS_STRETCH", // same as default
        boundsAlignment: 5, // same as default
        volume: 0.5, // different (default undefined)
      };
      const diff = buildOverridesDiff(spawnDefaults, desired);
      expect(diff).toEqual({ volume: 0.5 });
      expect(diff.rotation).toBeUndefined();
      expect(diff.crop).toBeUndefined();
      expect(diff.alignment).toBeUndefined();
      expect(diff.boundsType).toBeUndefined();
      expect(diff.boundsAlignment).toBeUndefined();
    });

    it("handles mixed new and old properties correctly", () => {
      const spawnDefaults: Partial<MediaAssetProperties> = {
        volume: 0.5,
        rotation: 0,
        alignment: 0,
      };
      const desired: Partial<MediaAssetProperties> = {
        volume: 0.7, // different
        rotation: 0, // same as default
        alignment: 5, // different
        muted: true, // different (default undefined)
      };
      const diff = buildOverridesDiff(spawnDefaults, desired);
      expect(diff).toEqual({
        volume: 0.7,
        alignment: 5,
        muted: true,
      });
      expect(diff.rotation).toBeUndefined();
    });
  });
});
