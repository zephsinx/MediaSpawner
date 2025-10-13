import { describe, it, expect, beforeEach } from "vitest";
import type { MediaAssetProperties } from "../../types/media";
import type { Spawn } from "../../types/spawn";
import {
  resolveEffectiveProperties,
  buildOverridesDiff,
} from "../assetSettingsResolver";

// Base asset fallback removed; tests no longer rely on base asset properties

const spawnFactory = (): Spawn => ({
  id: "spawn-1",
  name: "Test Spawn",
  description: "",
  enabled: true,
  trigger: { type: "manual", config: {} },
  duration: 5000,
  assets: [],
  lastModified: Date.now(),
  order: 0,
});

describe("assetSettingsResolver", () => {
  beforeEach(() => {
    // nothing to reset
  });

  it("uses override over spawn default", () => {
    const spawn = spawnFactory();
    const { effective, sourceMap } = resolveEffectiveProperties({
      spawn,
      overrides: { volume: 0.8 },
    });
    expect(effective.volume).toBe(0.8);
    expect(sourceMap.volume).toBe("override");
  });

  it("returns undefined when no override present", () => {
    const spawn = spawnFactory();
    const { effective, sourceMap } = resolveEffectiveProperties({
      spawn,
      overrides: {},
    });
    expect(effective.volume).toBeUndefined();
    expect(sourceMap.volume).toBe("none");
  });

  it("returns undefined when neither override nor spawn default present", () => {
    const spawn = spawnFactory();
    const { effective, sourceMap } = resolveEffectiveProperties({
      spawn,
      overrides: {},
    });
    expect(effective.scale).toBeUndefined();
    expect(sourceMap.scale).toBe("none");
  });

  it("handles structured fields (dimensions, position)", () => {
    const spawn = spawnFactory();
    const { effective } = resolveEffectiveProperties({
      spawn,
      overrides: {},
    });
    expect(effective.dimensions).toBeUndefined();
  });

  it("buildOverridesDiff returns all non-undefined values", () => {
    const desired: Partial<MediaAssetProperties> = {
      volume: 0.7,
      scale: 1,
      muted: true,
    };
    const diff = buildOverridesDiff(desired);
    expect(diff).toEqual({ volume: 0.7, scale: 1, muted: true });
  });

  describe("new transform properties", () => {
    describe("rotation", () => {
      it("uses override over spawn default for rotation", () => {
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { rotation: 90 },
        });
        expect(effective.rotation).toBe(90);
        expect(sourceMap.rotation).toBe("override");
      });

      it("falls back to spawn default for rotation", () => {
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.rotation).toBeUndefined();
        expect(sourceMap.rotation).toBe("none");
      });

      it("returns undefined when no rotation set", () => {
        const spawn = spawnFactory();
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
        const spawn = spawnFactory();
        const overrideCrop = { left: 5, top: 15, right: 25, bottom: 35 };
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { crop: overrideCrop },
        });
        expect(effective.crop).toEqual(overrideCrop);
        expect(sourceMap.crop).toBe("override");
      });

      it("returns undefined when no crop set", () => {
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.crop).toBeUndefined();
        expect(sourceMap.crop).toBe("none");
      });

      it("returns undefined when no crop set", () => {
        const spawn = spawnFactory();
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
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { alignment: 5 },
        });
        expect(effective.alignment).toBe(5);
        expect(sourceMap.alignment).toBe("override");
      });

      it("falls back to spawn default for alignment", () => {
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.alignment).toBeUndefined();
        expect(sourceMap.alignment).toBe("none");
      });

      it("returns undefined when no alignment set", () => {
        const spawn = spawnFactory();
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
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { boundsType: "OBS_BOUNDS_SCALE_INNER" },
        });
        expect(effective.boundsType).toBe("OBS_BOUNDS_SCALE_INNER");
        expect(sourceMap.boundsType).toBe("override");
      });

      it("falls back to spawn default for boundsType", () => {
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.boundsType).toBeUndefined();
        expect(sourceMap.boundsType).toBe("none");
      });

      it("returns undefined when no boundsType set", () => {
        const spawn = spawnFactory();
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
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { boundsAlignment: 5 },
        });
        expect(effective.boundsAlignment).toBe(5);
        expect(sourceMap.boundsAlignment).toBe("override");
      });

      it("falls back to spawn default for boundsAlignment", () => {
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.boundsAlignment).toBeUndefined();
        expect(sourceMap.boundsAlignment).toBe("none");
      });

      it("returns undefined when no boundsAlignment set", () => {
        const spawn = spawnFactory();
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
    it("includes all new properties", () => {
      const desired: Partial<MediaAssetProperties> = {
        rotation: 90,
        crop: { left: 10, top: 20, right: 30, bottom: 40 },
        alignment: 5,
        boundsType: "OBS_BOUNDS_STRETCH",
        boundsAlignment: 5,
        volume: 0.5,
      };
      const diff = buildOverridesDiff(desired);
      expect(diff).toEqual({
        rotation: 90,
        crop: { left: 10, top: 20, right: 30, bottom: 40 },
        alignment: 5,
        boundsType: "OBS_BOUNDS_STRETCH",
        boundsAlignment: 5,
        volume: 0.5,
      });
    });

    it("includes all non-undefined properties", () => {
      const desired: Partial<MediaAssetProperties> = {
        rotation: 45,
        crop: { left: 10, top: 20, right: 30, bottom: 40 },
        alignment: 5,
        boundsType: "OBS_BOUNDS_STRETCH",
        boundsAlignment: 5,
        volume: 0.5,
      };
      const diff = buildOverridesDiff(desired);
      expect(diff).toEqual({
        rotation: 45,
        crop: { left: 10, top: 20, right: 30, bottom: 40 },
        alignment: 5,
        boundsType: "OBS_BOUNDS_STRETCH",
        boundsAlignment: 5,
        volume: 0.5,
      });
    });

    it("handles mixed properties correctly", () => {
      const desired: Partial<MediaAssetProperties> = {
        volume: 0.7,
        rotation: 0,
        alignment: 5,
        muted: true,
      };
      const diff = buildOverridesDiff(desired);
      expect(diff).toEqual({
        volume: 0.7,
        rotation: 0,
        alignment: 5,
        muted: true,
      });
    });

    describe("randomCoordinates", () => {
      it("resolves randomCoordinates from overrides", () => {
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { randomCoordinates: true },
        });
        expect(effective.randomCoordinates).toBe(true);
        expect(sourceMap.randomCoordinates).toBe("override");
      });

      it("marks randomCoordinates as none when not set", () => {
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: {},
        });
        expect(effective.randomCoordinates).toBeUndefined();
        expect(sourceMap.randomCoordinates).toBe("none");
      });

      it("resolves randomCoordinates false from overrides", () => {
        const spawn = spawnFactory();
        const { effective, sourceMap } = resolveEffectiveProperties({
          spawn,
          overrides: { randomCoordinates: false },
        });
        expect(effective.randomCoordinates).toBe(false);
        expect(sourceMap.randomCoordinates).toBe("override");
      });

      it("includes randomCoordinates in buildOverridesDiff when true", () => {
        const desired: Partial<MediaAssetProperties> = {
          randomCoordinates: true,
          volume: 0.8,
        };
        const diff = buildOverridesDiff(desired);
        expect(diff.randomCoordinates).toBe(true);
        expect(diff.volume).toBe(0.8);
      });

      it("includes randomCoordinates in buildOverridesDiff when false", () => {
        const desired: Partial<MediaAssetProperties> = {
          randomCoordinates: false,
        };
        const diff = buildOverridesDiff(desired);
        expect(diff.randomCoordinates).toBe(false);
      });
    });
  });
});
