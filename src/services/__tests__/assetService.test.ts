import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { MediaAsset } from "../../types/media";
import { createLocalStorageMock, setupLocalStorageMock } from "./testUtils";

// Mock dependencies before importing the service
vi.mock("../cacheService", () => ({
  CacheService: {
    get: vi.fn(),
    invalidate: vi.fn(),
  },
  CACHE_KEYS: {
    ASSETS: "assets",
  },
}));

vi.mock("../spawnService", () => ({
  SpawnService: {
    getSpawn: vi.fn(),
  },
}));

// Import after mocking
import { AssetService } from "../assetService";
import { CacheService, CACHE_KEYS } from "../cacheService";
import { SpawnService } from "../spawnService";
import type { Spawn } from "../../types/spawn";

const mockCacheService = vi.mocked(CacheService);
const mockSpawnService = vi.mocked(SpawnService);

describe("AssetService getResolvedAssetSettings (inline overrides)", () => {
  const mockAsset: MediaAsset = {
    id: "asset-1",
    type: "video",
    name: "Test Video",
    path: "/path/to/video.mp4",
    isUrl: false,
  };

  const baseSpawn = {
    id: "spawn-1",
    name: "Test Spawn",
    enabled: true,
    trigger: { type: "manual" as const, config: {} },
    duration: 0,
    defaultProperties: {},
    assets: [] as Array<{
      id: string;
      assetId: string;
      overrides: { duration?: number; properties?: Record<string, unknown> };
      enabled: boolean;
      order: number;
    }>,
    lastModified: 1234567890000,
    order: 0,
  };

  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1234567890000);

    localStorageMock = createLocalStorageMock();
    setupLocalStorageMock(localStorageMock);

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();

    mockCacheService.get.mockImplementation((_key, fetcher) => fetcher());
    mockCacheService.invalidate.mockImplementation(() => {});
    vi.spyOn(AssetService, "getAssetById").mockReturnValue(mockAsset);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns spawn defaults when no overrides exist", async () => {
    const spawn = {
      ...baseSpawn,
      assets: [
        {
          id: "sa-1",
          assetId: "asset-1",
          overrides: {},
          enabled: true,
          order: 0,
        },
      ],
    };
    mockSpawnService.getSpawn.mockResolvedValue(spawn as unknown as Spawn);

    const result = await AssetService.getResolvedAssetSettings(
      "spawn-1",
      "sa-1"
    );

    expect(result).toEqual({
      duration: 0,
      trigger: spawn.trigger,
      properties: {},
    });
  });

  it("returns per-instance overrides when present", async () => {
    const spawn = {
      ...baseSpawn,
      assets: [
        {
          id: "sa-1",
          assetId: "asset-1",
          overrides: {
            duration: 3000,
            properties: { volume: 1.0, loop: true },
          },
          enabled: true,
          order: 0,
        },
      ],
    };
    mockSpawnService.getSpawn.mockResolvedValue(spawn as unknown as Spawn);

    const result = await AssetService.getResolvedAssetSettings(
      "spawn-1",
      "sa-1"
    );

    expect(result).toEqual({
      duration: 3000,
      trigger: spawn.trigger,
      properties: { volume: 1.0, loop: true },
    });
  });

  it("returns null when spawn doesn't exist", async () => {
    mockSpawnService.getSpawn.mockResolvedValue(null);
    const result = await AssetService.getResolvedAssetSettings(
      "invalid-spawn",
      "sa-1"
    );
    expect(result).toBeNull();
  });

  it("resolves correctly for duplicate base asset instances", async () => {
    const spawn = {
      ...baseSpawn,
      assets: [
        {
          id: "sa-1",
          assetId: "asset-1",
          overrides: { duration: 2000 },
          enabled: true,
          order: 0,
        },
        {
          id: "sa-2",
          assetId: "asset-1",
          overrides: { duration: 7000 },
          enabled: true,
          order: 1,
        },
      ],
    };
    mockSpawnService.getSpawn.mockResolvedValue(spawn as unknown as Spawn);

    const r1 = await AssetService.getResolvedAssetSettings("spawn-1", "sa-1");
    const r2 = await AssetService.getResolvedAssetSettings("spawn-1", "sa-2");

    expect(r1?.duration).toBe(2000);
    expect(r2?.duration).toBe(7000);
    expect(r1?.trigger).toEqual(spawn.trigger);
    expect(r2?.trigger).toEqual(spawn.trigger);
  });
});

describe("AssetService integration: assets list", () => {
  const mockAsset: MediaAsset = {
    id: "asset-1",
    type: "video",
    name: "Test Video",
    path: "/path/to/video.mp4",
    isUrl: false,
  };

  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    setupLocalStorageMock(localStorageMock);
    vi.clearAllMocks();
    mockCacheService.get.mockImplementation((_key, fetcher) => fetcher());
  });

  it("returns assets via cache layer", () => {
    const assets = [mockAsset];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(assets));
    const result = AssetService.getAssets();
    expect(result).toEqual(assets);
    expect(mockCacheService.get).toHaveBeenCalledWith(
      CACHE_KEYS.ASSETS,
      expect.any(Function)
    );
  });
});
