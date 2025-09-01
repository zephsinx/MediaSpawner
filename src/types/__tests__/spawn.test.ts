import {
  createSpawnTrigger,
  getDefaultTriggerConfig,
  createSpawnAsset,
  createSpawn,
  createSpawnProfile,
  validateSpawn,
  validateSpawnProfile,
  hasSpawnAssets,
  getEnabledAssetCount,
  hasEnabledAssets,
  getSortedSpawnAssets,
  hasSpawns,
  getEnabledSpawnCount,
  updateSpawnTimestamp,
  updateSpawnProfileTimestamp,
} from "../spawn";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Spawn Types", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1234567890000);
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(
      () => "00000000-0000-0000-0000-000000000000"
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Factory Functions", () => {
    it("createSpawnTrigger creates manual trigger by default", () => {
      const trigger = createSpawnTrigger();
      expect(trigger.type).toBe("manual");
      expect(trigger.config).toEqual({});
    });

    it("getDefaultTriggerConfig returns correct configs", () => {
      expect(getDefaultTriggerConfig("manual")).toEqual({});
      expect(getDefaultTriggerConfig("twitch.cheer")).toEqual({});
    });

    it("createSpawnAsset creates asset with defaults", () => {
      const asset = createSpawnAsset("asset-1", 2);
      expect(asset.id).toBe("00000000-0000-0000-0000-000000000000");
      expect(asset.assetId).toBe("asset-1");
      expect(asset.enabled).toBe(true);
      expect(asset.order).toBe(2);
      expect(asset.overrides).toEqual({});
    });

    it("createSpawn creates spawn with defaults", () => {
      const spawn = createSpawn("Test Spawn", "desc");
      expect(spawn.id).toBe("00000000-0000-0000-0000-000000000000");
      expect(spawn.name).toBe("Test Spawn");
      expect(spawn.description).toBe("desc");
      expect(spawn.enabled).toBe(true);
      expect(spawn.duration).toBe(0);
      expect(spawn.trigger.type).toBe("manual");
      expect(spawn.assets).toEqual([]);
      expect(spawn.lastModified).toBe(1234567890000);
      expect(spawn.order).toBe(0);
    });

    it("createSpawnProfile creates profile with defaults", () => {
      const profile = createSpawnProfile("Profile", "desc");
      expect(profile.id).toBe("00000000-0000-0000-0000-000000000000");
      expect(profile.name).toBe("Profile");
      expect(profile.description).toBe("desc");
      expect(profile.spawns).toEqual([]);
      expect(profile.lastModified).toBe(1234567890000);
      expect(profile.isActive).toBe(false);
    });
  });

  describe("Validation Functions", () => {
    it("validateSpawn returns valid for correct spawn", () => {
      const spawn = createSpawn("Valid");
      expect(validateSpawn(spawn).isValid).toBe(true);
    });

    it("validateSpawn returns errors for missing/invalid fields", () => {
      const spawn = {
        id: "",
        name: "",
        duration: -1,
        order: -1,
        enabled: true,
        trigger: undefined,
        assets: [],
        lastModified: 0,
      } as Partial<import("../spawn").Spawn>;
      const result = validateSpawn(spawn as import("../spawn").Spawn);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("validateSpawnProfile returns valid for correct profile", () => {
      const profile = createSpawnProfile("Valid");
      expect(validateSpawnProfile(profile).isValid).toBe(true);
    });

    it("validateSpawnProfile returns errors for missing/invalid fields", () => {
      const profile = {
        id: "",
        name: "",
        spawns: [{ id: "" }],
        lastModified: 0,
        isActive: false,
      } as Partial<import("../spawn").SpawnProfile>;
      const result = validateSpawnProfile(
        profile as import("../spawn").SpawnProfile
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Utility Functions", () => {
    it("hasSpawnAssets returns true if spawn has assets", () => {
      const spawn = createSpawn("Test", "", [createSpawnAsset("a", 0)]);
      expect(hasSpawnAssets(spawn)).toBe(true);
    });
    it("hasSpawnAssets returns false if spawn has no assets", () => {
      const spawn = createSpawn("Test");
      expect(hasSpawnAssets(spawn)).toBe(false);
    });
    it("getEnabledAssetCount counts only enabled assets", () => {
      const a = createSpawnAsset("a", 0);
      const b = { ...createSpawnAsset("b", 1), enabled: false };
      const spawn = createSpawn("Test", "", [a, b]);
      expect(getEnabledAssetCount(spawn)).toBe(1);
    });
    it("hasEnabledAssets returns true if any asset is enabled", () => {
      const a = createSpawnAsset("a", 0);
      const b = { ...createSpawnAsset("b", 1), enabled: false };
      const spawn = createSpawn("Test", "", [a, b]);
      expect(hasEnabledAssets(spawn)).toBe(true);
    });
    it("hasEnabledAssets returns false if no asset is enabled", () => {
      const a = { ...createSpawnAsset("a", 0), enabled: false };
      const spawn = createSpawn("Test", "", [a]);
      expect(hasEnabledAssets(spawn)).toBe(false);
    });
    it("getSortedSpawnAssets sorts by order", () => {
      const a = createSpawnAsset("a", 2);
      const b = createSpawnAsset("b", 1);
      const spawn = createSpawn("Test", "", [a, b]);
      const sorted = getSortedSpawnAssets(spawn);
      expect(sorted[0].order).toBe(1);
      expect(sorted[1].order).toBe(2);
    });
    it("hasSpawns returns true if profile has spawns", () => {
      const s = createSpawn("A");
      const p = createSpawnProfile("P", "", [s]);
      expect(hasSpawns(p)).toBe(true);
    });
    it("hasSpawns returns false if profile has no spawns", () => {
      const p = createSpawnProfile("P");
      expect(hasSpawns(p)).toBe(false);
    });
    it("getEnabledSpawnCount counts only enabled spawns", () => {
      const a = createSpawn("A");
      const b = { ...createSpawn("B"), enabled: false };
      const p = createSpawnProfile("P", "", [a, b]);
      expect(getEnabledSpawnCount(p)).toBe(1);
    });
    it("updateSpawnTimestamp updates lastModified", () => {
      const s = createSpawn("A");
      const updated = updateSpawnTimestamp(s);
      expect(updated.lastModified).toBe(1234567890000);
      expect(updated).not.toBe(s);
    });
    it("updateSpawnProfileTimestamp updates lastModified", () => {
      const p = createSpawnProfile("P");
      const updated = updateSpawnProfileTimestamp(p);
      expect(updated.lastModified).toBe(1234567890000);
      expect(updated).not.toBe(p);
    });
  });

  // Removed legacy type guard tests; triggers now follow MS-50 union model
});
