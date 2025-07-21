import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { MediaAsset, MediaAssetProperties } from "../../types/media";
import type { SpawnAssetOverrides, SpawnTrigger } from "../../types/spawn";
import { createLocalStorageMock, setupLocalStorageMock } from "./testUtils";

// Mock dependencies before importing the service
vi.mock("../cacheService", () => ({
  CacheService: {
    get: vi.fn(),
    invalidate: vi.fn(),
    invalidateSpawnAssetSettings: vi.fn(),
    invalidateAllSpawnAssetSettings: vi.fn(),
  },
  CACHE_KEYS: {
    ASSETS: "assets",
  },
  getSpawnAssetCacheKey: vi.fn(),
}));

vi.mock("../spawnService", () => ({
  SpawnService: {
    getSpawn: vi.fn(),
  },
}));

// Import after mocking
import { AssetService } from "../assetService";
import {
  CacheService,
  CACHE_KEYS,
  getSpawnAssetCacheKey,
} from "../cacheService";
import { SpawnService } from "../spawnService";

const mockCacheService = vi.mocked(CacheService);
const mockSpawnService = vi.mocked(SpawnService);
const mockGetSpawnAssetCacheKey = vi.mocked(getSpawnAssetCacheKey);

describe("AssetService Spawn-Specific Settings", () => {
  // Test data
  const mockAsset: MediaAsset = {
    id: "asset-1",
    type: "video",
    name: "Test Video",
    path: "/path/to/video.mp4",
    isUrl: false,
    properties: {
      volume: 0.8,
      dimensions: { width: 1920, height: 1080 },
      loop: false,
    },
  };

  const mockSpawn = {
    id: "spawn-1",
    name: "Test Spawn",
    enabled: true,
    trigger: {
      enabled: true,
      type: "manual" as const,
      config: { type: "manual" as const },
    },
    duration: 5000,
    assets: [],
    lastModified: 1234567890000,
    order: 0,
  };

  const mockSpawnAssetSettings: SpawnAssetOverrides = {
    duration: 3000,
    properties: {
      volume: 1.0,
      loop: true,
    },
  };

  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1234567890000);

    // Setup localStorage mock
    localStorageMock = createLocalStorageMock();
    setupLocalStorageMock(localStorageMock);

    // Mock console methods
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementations
    mockCacheService.get.mockImplementation((_key, fetcher) => fetcher());
    mockCacheService.invalidate.mockImplementation(() => {});
    mockCacheService.invalidateSpawnAssetSettings.mockImplementation(() => {});
    mockCacheService.invalidateAllSpawnAssetSettings.mockImplementation(
      () => {}
    );
    mockGetSpawnAssetCacheKey.mockImplementation(
      (spawnId, assetId) => `cache:${spawnId}:${assetId}`
    );
    mockSpawnService.getSpawn.mockReturnValue(mockSpawn);

    // Default localStorage behavior
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getSpawnAssetSettings", () => {
    it("returns correct settings when they exist", () => {
      const settingsData = {
        spawns: {
          "spawn-1": {
            assets: {
              "asset-1": mockSpawnAssetSettings,
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(settingsData));

      const result = AssetService.getSpawnAssetSettings("spawn-1", "asset-1");

      expect(result).toEqual(mockSpawnAssetSettings);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_asset_settings"
      );
    });

    it("returns null when settings don't exist", () => {
      const settingsData = {
        spawns: {
          "spawn-2": {
            assets: {
              "asset-2": mockSpawnAssetSettings,
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(settingsData));

      const result = AssetService.getSpawnAssetSettings("spawn-1", "asset-1");

      expect(result).toBeNull();
    });

    it("returns null when localStorage is empty", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = AssetService.getSpawnAssetSettings("spawn-1", "asset-1");

      expect(result).toBeNull();
    });

    it("handles JSON parsing errors gracefully", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      const result = AssetService.getSpawnAssetSettings("spawn-1", "asset-1");

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to load spawn asset settings:",
        expect.any(Error)
      );
    });

    it("returns null when localStorage throws error", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = AssetService.getSpawnAssetSettings("spawn-1", "asset-1");

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to load spawn asset settings:",
        expect.any(Error)
      );
    });
  });

  describe("setSpawnAssetSettings", () => {
    beforeEach(() => {
      // Mock AssetService.getAssetById to return the mock asset
      vi.spyOn(AssetService, "getAssetById").mockReturnValue(mockAsset);
    });

    it("successfully saves settings when spawn and asset exist", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = AssetService.setSpawnAssetSettings(
        "spawn-1",
        "asset-1",
        mockSpawnAssetSettings
      );

      expect(result.success).toBe(true);
      expect(result.settings).toEqual(mockSpawnAssetSettings);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_asset_settings",
        JSON.stringify({
          spawns: {
            "spawn-1": {
              assets: {
                "asset-1": mockSpawnAssetSettings,
              },
            },
          },
        })
      );
    });

    it("returns error when spawn doesn't exist", () => {
      mockSpawnService.getSpawn.mockReturnValue(null);

      const result = AssetService.setSpawnAssetSettings(
        "invalid-spawn",
        "asset-1",
        mockSpawnAssetSettings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Spawn with ID "invalid-spawn" not found');
    });

    it("returns error when asset doesn't exist", () => {
      vi.spyOn(AssetService, "getAssetById").mockReturnValue(undefined);

      const result = AssetService.setSpawnAssetSettings(
        "spawn-1",
        "invalid-asset",
        mockSpawnAssetSettings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Asset with ID "invalid-asset" not found');
    });

    it("handles localStorage write errors", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("localStorage write error");
      });

      const result = AssetService.setSpawnAssetSettings(
        "spawn-1",
        "asset-1",
        mockSpawnAssetSettings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("localStorage write error");
    });

    it("updates existing settings correctly", () => {
      const existingSettings = {
        spawns: {
          "spawn-1": {
            assets: {
              "asset-1": { duration: 2000 },
            },
          },
          "spawn-2": {
            assets: {
              "asset-2": { duration: 4000 },
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSettings)
      );

      const newSettings: SpawnAssetOverrides = {
        duration: 3000,
        properties: { volume: 0.9 },
      };
      const result = AssetService.setSpawnAssetSettings(
        "spawn-1",
        "asset-1",
        newSettings
      );

      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_asset_settings",
        JSON.stringify({
          spawns: {
            "spawn-1": {
              assets: {
                "asset-1": newSettings,
              },
            },
            "spawn-2": {
              assets: {
                "asset-2": { duration: 4000 },
              },
            },
          },
        })
      );
    });

    it("handles JSON parsing errors in existing settings", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      const result = AssetService.setSpawnAssetSettings(
        "spawn-1",
        "asset-1",
        mockSpawnAssetSettings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Unexpected token 'i', \"invalid json\" is not valid JSON"
      );
    });
  });

  describe("getResolvedAssetSettings", () => {
    beforeEach(() => {
      vi.spyOn(AssetService, "getAssetById").mockReturnValue(mockAsset);
      vi.spyOn(AssetService, "getSpawnAssetSettings").mockReturnValue(null);
    });

    it("returns spawn defaults when no overrides exist", () => {
      const result = AssetService.getResolvedAssetSettings(
        "spawn-1",
        "asset-1"
      );

      expect(result).toEqual({
        duration: 5000, // From spawn default
        trigger: mockSpawn.trigger, // From spawn default
        properties: mockAsset.properties, // From asset default
      });
    });

    it("returns overrides when they exist (highest priority)", () => {
      vi.spyOn(AssetService, "getSpawnAssetSettings").mockReturnValue(
        mockSpawnAssetSettings
      );

      const result = AssetService.getResolvedAssetSettings(
        "spawn-1",
        "asset-1"
      );

      expect(result).toEqual({
        duration: 3000, // From override
        trigger: mockSpawn.trigger, // From spawn default (no override)
        properties: {
          ...mockAsset.properties, // Base asset properties
          volume: 1.0, // From override
          loop: true, // From override
        },
      });
    });

    it("returns null when spawn doesn't exist", () => {
      mockSpawnService.getSpawn.mockReturnValue(null);

      const result = AssetService.getResolvedAssetSettings(
        "invalid-spawn",
        "asset-1"
      );

      expect(result).toBeNull();
    });

    it("returns null when asset doesn't exist", () => {
      vi.spyOn(AssetService, "getAssetById").mockReturnValue(undefined);

      const result = AssetService.getResolvedAssetSettings(
        "spawn-1",
        "invalid-asset"
      );

      expect(result).toBeNull();
    });

    it("handles missing spawn defaults gracefully", () => {
      const spawnWithoutDefaults = {
        ...mockSpawn,
        duration: undefined as unknown as number,
        trigger: undefined as unknown as SpawnTrigger,
      };
      mockSpawnService.getSpawn.mockReturnValue(spawnWithoutDefaults);

      const result = AssetService.getResolvedAssetSettings(
        "spawn-1",
        "asset-1"
      );

      expect(result).toEqual({
        duration: undefined,
        trigger: undefined,
        properties: mockAsset.properties,
      });
    });

    it("handles missing asset defaults gracefully", () => {
      const assetWithoutDefaults = {
        ...mockAsset,
        properties: undefined as unknown as MediaAssetProperties,
      };
      vi.spyOn(AssetService, "getAssetById").mockReturnValue(
        assetWithoutDefaults
      );

      const result = AssetService.getResolvedAssetSettings(
        "spawn-1",
        "asset-1"
      );

      expect(result).toEqual({
        duration: 5000,
        trigger: mockSpawn.trigger,
        properties: {},
      });
    });

    it("handles errors gracefully", () => {
      mockSpawnService.getSpawn.mockImplementation(() => {
        throw new Error("Spawn service error");
      });

      const result = AssetService.getResolvedAssetSettings(
        "spawn-1",
        "asset-1"
      );

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to resolve asset settings:",
        expect.any(Error)
      );
    });
  });

  describe("removeSpawnAssetSettings", () => {
    it("successfully removes existing settings", () => {
      const existingSettings = {
        spawns: {
          "spawn-1": {
            assets: {
              "asset-1": mockSpawnAssetSettings,
            },
          },
          "spawn-2": {
            assets: {
              "asset-2": { duration: 4000 },
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSettings)
      );

      const result = AssetService.removeSpawnAssetSettings(
        "spawn-1",
        "asset-1"
      );

      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_asset_settings",
        JSON.stringify({
          spawns: {
            "spawn-2": {
              assets: {
                "asset-2": { duration: 4000 },
              },
            },
          },
        })
      );
    });

    it("returns success when settings don't exist", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = AssetService.removeSpawnAssetSettings(
        "spawn-1",
        "asset-1"
      );

      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("handles localStorage errors gracefully", () => {
      // Provide existing data so the method actually tries to remove something
      const existingSettings = {
        spawns: {
          "spawn-1": {
            assets: {
              "asset-1": { duration: 3000 },
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify(existingSettings)
      );

      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = AssetService.removeSpawnAssetSettings(
        "spawn-1",
        "asset-1"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("localStorage error");
    });

    it("handles JSON parsing errors", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      const result = AssetService.removeSpawnAssetSettings(
        "spawn-1",
        "asset-1"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Unexpected token 'i', \"invalid json\" is not valid JSON"
      );
    });
  });

  describe("getSpawnAssetSettingsForSpawn", () => {
    it("returns all settings for a specific spawn", () => {
      const allSettings = {
        spawns: {
          "spawn-1": {
            assets: {
              "asset-1": { duration: 3000 },
              "asset-2": { duration: 4000 },
            },
          },
          "spawn-2": {
            assets: {
              "asset-1": { duration: 5000 },
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(allSettings));

      const result = AssetService.getSpawnAssetSettingsForSpawn("spawn-1");

      expect(result).toEqual({
        "asset-1": { duration: 3000 },
        "asset-2": { duration: 4000 },
      });
    });

    it("returns empty object when no settings exist", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = AssetService.getSpawnAssetSettingsForSpawn("spawn-1");

      expect(result).toEqual({});
    });

    it("handles localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = AssetService.getSpawnAssetSettingsForSpawn("spawn-1");

      expect(result).toEqual({});
      expect(console.error).toHaveBeenCalledWith(
        "Failed to get spawn asset settings for spawn:",
        expect.any(Error)
      );
    });
  });

  describe("getSpawnAssetSettingsForAsset", () => {
    it("returns all settings for a specific asset", () => {
      const allSettings = {
        spawns: {
          "spawn-1": {
            assets: {
              "asset-1": { duration: 3000 },
              "asset-2": { duration: 5000 },
            },
          },
          "spawn-2": {
            assets: {
              "asset-1": { duration: 4000 },
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(allSettings));

      const result = AssetService.getSpawnAssetSettingsForAsset("asset-1");

      expect(result).toEqual({
        "spawn-1": { duration: 3000 },
        "spawn-2": { duration: 4000 },
      });
    });

    it("returns empty object when no settings exist", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = AssetService.getSpawnAssetSettingsForAsset("asset-1");

      expect(result).toEqual({});
    });

    it("handles localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = AssetService.getSpawnAssetSettingsForAsset("asset-1");

      expect(result).toEqual({});
      expect(console.error).toHaveBeenCalledWith(
        "Failed to get spawn asset settings for asset:",
        expect.any(Error)
      );
    });
  });

  describe("clearSpawnAssetSettings", () => {
    it("clears all spawn asset settings", () => {
      AssetService.clearSpawnAssetSettings();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_asset_settings"
      );
    });

    it("handles localStorage errors gracefully", () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      // Should not throw
      expect(() => AssetService.clearSpawnAssetSettings()).not.toThrow();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to clear spawn asset settings:",
        expect.any(Error)
      );
    });
  });

  describe("cleanupOrphanedSpawnAssetSettings", () => {
    beforeEach(() => {
      vi.spyOn(AssetService, "getAssetById").mockReturnValue(mockAsset);
    });

    it("removes settings for deleted spawns", () => {
      const allSettings = {
        spawns: {
          "spawn-1": {
            assets: {
              "asset-1": { duration: 3000 },
            },
          },
          "spawn-2": {
            assets: {
              "asset-1": { duration: 4000 },
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(allSettings));
      mockSpawnService.getSpawn
        .mockReturnValueOnce(mockSpawn) // spawn-1 exists
        .mockReturnValueOnce(null); // spawn-2 doesn't exist

      const result = AssetService.cleanupOrphanedSpawnAssetSettings();

      expect(result.removedSettings).toBe(1);
      expect(result.remainingSettings).toBe(1);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_asset_settings",
        JSON.stringify({
          spawns: {
            "spawn-1": {
              assets: {
                "asset-1": { duration: 3000 },
              },
            },
          },
        })
      );
    });

    it("removes settings for deleted assets", () => {
      const allSettings = {
        spawns: {
          "spawn-1": {
            assets: {
              "asset-1": { duration: 3000 },
              "asset-2": { duration: 4000 },
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(allSettings));
      vi.spyOn(AssetService, "getAssetById")
        .mockReturnValueOnce(mockAsset) // asset-1 exists
        .mockReturnValueOnce(undefined); // asset-2 doesn't exist

      const result = AssetService.cleanupOrphanedSpawnAssetSettings();

      expect(result.removedSettings).toBe(1);
      expect(result.remainingSettings).toBe(1);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_asset_settings",
        JSON.stringify({
          spawns: {
            "spawn-1": {
              assets: {
                "asset-1": { duration: 3000 },
              },
            },
          },
        })
      );
    });

    it("keeps settings for valid spawn-asset combinations", () => {
      const allSettings = {
        spawns: {
          "spawn-1": {
            assets: {
              "asset-1": { duration: 3000 },
            },
          },
          "spawn-2": {
            assets: {
              "asset-2": { duration: 4000 },
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(allSettings));

      const result = AssetService.cleanupOrphanedSpawnAssetSettings();

      expect(result.removedSettings).toBe(0);
      expect(result.remainingSettings).toBe(2);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_asset_settings",
        JSON.stringify(allSettings)
      );
    });

    it("returns correct counts when no settings exist", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = AssetService.cleanupOrphanedSpawnAssetSettings();

      expect(result.removedSettings).toBe(0);
      expect(result.remainingSettings).toBe(0);
    });

    it("handles localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = AssetService.cleanupOrphanedSpawnAssetSettings();

      expect(result.removedSettings).toBe(0);
      expect(result.remainingSettings).toBe(0);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to cleanup orphaned spawn asset settings:",
        expect.any(Error)
      );
    });

    it("handles JSON parsing errors", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      const result = AssetService.cleanupOrphanedSpawnAssetSettings();

      expect(result.removedSettings).toBe(0);
      expect(result.remainingSettings).toBe(0);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to cleanup orphaned spawn asset settings:",
        expect.any(Error)
      );
    });
  });

  describe("Integration", () => {
    it("maintains backward compatibility with existing AssetService methods", () => {
      // Test that existing methods still work
      const assets = [mockAsset];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(assets));

      const result = AssetService.getAssets();

      expect(result).toEqual(assets);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        CACHE_KEYS.ASSETS,
        expect.any(Function)
      );
    });

    it("works correctly with SpawnService.getSpawn()", () => {
      vi.spyOn(AssetService, "getAssetById").mockReturnValue(mockAsset);
      vi.spyOn(AssetService, "getSpawnAssetSettings").mockReturnValue(null);

      AssetService.getResolvedAssetSettings("spawn-1", "asset-1");

      expect(mockSpawnService.getSpawn).toHaveBeenCalledWith("spawn-1");
    });

    it("works correctly with AssetService.getAssetById()", () => {
      vi.spyOn(AssetService, "getAssetById").mockReturnValue(mockAsset);
      vi.spyOn(AssetService, "getSpawnAssetSettings").mockReturnValue(null);

      AssetService.getResolvedAssetSettings("spawn-1", "asset-1");

      expect(AssetService.getAssetById).toHaveBeenCalledWith("asset-1");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty settings objects", () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ spawns: {} }));

      const result = AssetService.getSpawnAssetSettings("spawn-1", "asset-1");

      expect(result).toBeNull();
    });

    it("handles malformed localStorage data", () => {
      localStorageMock.getItem.mockReturnValue("null");

      const result = AssetService.getSpawnAssetSettings("spawn-1", "asset-1");

      expect(result).toBeNull();
    });
  });
});
