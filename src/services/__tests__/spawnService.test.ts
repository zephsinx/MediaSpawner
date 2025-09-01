import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Spawn, SpawnProfile } from "../../types/spawn";
import { getLocalStorageMock } from "./testUtils";

// Mock dependencies before importing the service
vi.mock("../spawnProfileService", () => ({
  SpawnProfileService: {
    getActiveProfile: vi.fn(),
    getAllProfiles: vi.fn(),
  },
}));

vi.mock("../cacheService", () => ({
  CacheService: {
    invalidate: vi.fn(),
  },
  CACHE_KEYS: {
    PROFILES: "profiles",
  },
}));

vi.mock("../../types/spawn", () => ({
  createSpawn: vi.fn(),
  validateSpawn: vi.fn(),
  validateSpawnProfile: vi.fn(),
}));

// Import after mocking
import { SpawnService } from "../spawnService";
import { SpawnProfileService } from "../spawnProfileService";
import { CacheService, CACHE_KEYS } from "../cacheService";
import {
  createSpawn,
  validateSpawn,
  validateSpawnProfile,
} from "../../types/spawn";

const mockSpawnProfileService = vi.mocked(SpawnProfileService);
const mockCacheService = vi.mocked(CacheService);
const mockCreateSpawn = vi.mocked(createSpawn);
const mockValidateSpawn = vi.mocked(validateSpawn);
const mockValidateSpawnProfile = vi.mocked(validateSpawnProfile);

describe("SpawnService", () => {
  // Test data
  const mockSpawn: Spawn = {
    id: "spawn-1",
    name: "Test Spawn",
    description: "Test description",
    enabled: true,
    trigger: {
      type: "manual",
      config: {},
    },
    duration: 0,
    assets: [],
    lastModified: 1234567890000,
    order: 0,
  };

  const mockActiveProfile: SpawnProfile = {
    id: "profile-1",
    name: "Test Profile",
    description: "Test profile description",
    spawns: [mockSpawn],
    lastModified: 1234567890000,
    isActive: true,
  };

  const mockEmptyProfile: SpawnProfile = {
    id: "profile-1",
    name: "Test Profile",
    description: "Test profile description",
    spawns: [],
    lastModified: 1234567890000,
    isActive: true,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1234567890000);

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Mock console methods
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock crypto.randomUUID
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(
      () => "00000000-0000-0000-0000-000000000000"
    );

    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementations
    mockSpawnProfileService.getActiveProfile.mockReturnValue(mockActiveProfile);
    mockSpawnProfileService.getAllProfiles.mockReturnValue([mockActiveProfile]);
    mockCacheService.invalidate.mockImplementation(() => {});
    mockCreateSpawn.mockImplementation((name, description) => ({
      id: "00000000-0000-0000-0000-000000000000",
      name: name || "New Spawn",
      description: description || "",
      enabled: true,
      trigger: {
        type: "manual",
        config: {},
      },
      duration: 0,
      assets: [],
      lastModified: 1234567890000,
      order: 0,
    }));
    mockValidateSpawn.mockReturnValue({ isValid: true, errors: [] });
    mockValidateSpawnProfile.mockReturnValue({ isValid: true, errors: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("createSpawn", () => {
    it("creates spawn successfully with name and description", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const result = await SpawnService.createSpawn(
        "New Spawn",
        "New description"
      );

      expect(result.success).toBe(true);
      expect(result.spawn).toBeDefined();
      expect(result.spawn?.name).toBe("New Spawn");
      expect(result.spawn?.description).toBe("New description");
      expect(mockCreateSpawn).toHaveBeenCalledWith(
        "New Spawn",
        "New description"
      );
      expect(mockValidateSpawn).toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalled();
      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        CACHE_KEYS.PROFILES
      );
    });

    it("creates spawn successfully with name only", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const result = await SpawnService.createSpawn("New Spawn");

      expect(result.success).toBe(true);
      expect(mockCreateSpawn).toHaveBeenCalledWith("New Spawn", undefined);
    });

    it("fails when no active profile exists", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(null);

      const result = await SpawnService.createSpawn("New Spawn");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "No active profile found. Please create or select a profile first."
      );
    });

    it("fails when spawn name is empty", async () => {
      const result = await SpawnService.createSpawn("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Spawn name is required");
    });

    it("fails when spawn name is whitespace only", async () => {
      const result = await SpawnService.createSpawn("   ");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Spawn name is required");
    });

    it("fails when spawn name already exists in profile", async () => {
      const result = await SpawnService.createSpawn("Test Spawn");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Spawn with name "Test Spawn" already exists in this profile'
      );
    });

    it("fails when spawn validation fails", async () => {
      mockValidateSpawn.mockReturnValue({
        isValid: false,
        errors: ["Invalid spawn data"],
      });

      const result = await SpawnService.createSpawn("New Spawn");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid spawn data: Invalid spawn data");
    });

    it("fails when localStorage.setItem throws error", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = await SpawnService.createSpawn("New Spawn");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("fails when profile validation fails", async () => {
      mockValidateSpawnProfile.mockReturnValue({
        isValid: false,
        errors: ["Invalid profile"],
      });

      const result = await SpawnService.createSpawn("New Spawn");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid profile data: Invalid profile");
    });

    it("handles general exceptions", async () => {
      mockSpawnProfileService.getActiveProfile.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await SpawnService.createSpawn("New Spawn");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error");
    });
  });

  describe("getSpawn", () => {
    it("returns spawn when found in active profile", async () => {
      const result = await SpawnService.getSpawn("spawn-1");

      expect(result).toEqual(mockSpawn);
    });

    it("returns null when spawn not found", async () => {
      const result = await SpawnService.getSpawn("non-existent");

      expect(result).toBeNull();
    });

    it("returns null when no active profile", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(null);

      const result = await SpawnService.getSpawn("spawn-1");

      expect(result).toBeNull();
    });

    it("handles exceptions gracefully", async () => {
      mockSpawnProfileService.getActiveProfile.mockImplementation(() => {
        throw new Error("Profile error");
      });

      const result = await SpawnService.getSpawn("spawn-1");

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to get spawn:",
        expect.any(Error)
      );
    });
  });

  describe("updateSpawn", () => {
    it("updates spawn name successfully", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const result = await SpawnService.updateSpawn("spawn-1", {
        name: "Updated Name",
      });

      expect(result.success).toBe(true);
      expect(result.spawn?.name).toBe("Updated Name");
      expect(result.spawn?.lastModified).toBe(1234567890000);
    });

    it("updates spawn description successfully", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const result = await SpawnService.updateSpawn("spawn-1", {
        description: "Updated description",
      });

      expect(result.success).toBe(true);
      expect(result.spawn?.description).toBe("Updated description");
    });

    it("updates spawn trigger successfully", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const newTrigger = {
        type: "twitch.cheer" as const,
        config: { bits: 100 },
      };

      const result = await SpawnService.updateSpawn("spawn-1", {
        trigger: newTrigger,
      });

      expect(result.success).toBe(true);
      expect(result.spawn?.trigger).toEqual(newTrigger);
    });

    it("updates spawn duration successfully", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const result = await SpawnService.updateSpawn("spawn-1", {
        duration: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.spawn?.duration).toBe(10000);
    });

    it("fails when no active profile exists", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(null);

      const result = await SpawnService.updateSpawn("spawn-1", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "No active profile found. Please create or select a profile first."
      );
    });

    it("fails when spawn not found", async () => {
      const result = await SpawnService.updateSpawn("non-existent", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Spawn with ID "non-existent" not found in active profile'
      );
    });

    it("fails when name conflicts with existing spawn", async () => {
      // Add another spawn to the profile
      const secondSpawn = { ...mockSpawn, id: "spawn-2", name: "Second Spawn" };
      mockSpawnProfileService.getActiveProfile.mockReturnValue({
        ...mockActiveProfile,
        spawns: [mockSpawn, secondSpawn],
      });

      const result = await SpawnService.updateSpawn("spawn-1", {
        name: "Second Spawn",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Spawn with name "Second Spawn" already exists in this profile'
      );
    });

    it("allows updating to same name", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const result = await SpawnService.updateSpawn("spawn-1", {
        name: "Test Spawn",
      });

      expect(result.success).toBe(true);
    });

    it("fails when validation fails", async () => {
      mockValidateSpawn.mockReturnValue({
        isValid: false,
        errors: ["Invalid duration"],
      });

      const result = await SpawnService.updateSpawn("spawn-1", {
        duration: -1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid spawn data: Invalid duration");
    });

    it("fails when localStorage.setItem throws error", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = await SpawnService.updateSpawn("spawn-1", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("handles general exceptions", async () => {
      mockSpawnProfileService.getActiveProfile.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await SpawnService.updateSpawn("spawn-1", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error");
    });
  });

  describe("deleteSpawn", () => {
    it("deletes spawn successfully", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const result = await SpawnService.deleteSpawn("spawn-1");

      expect(result.success).toBe(true);
      expect(result.spawn).toEqual(mockSpawn);
      expect(localStorage.setItem).toHaveBeenCalled();
      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        CACHE_KEYS.PROFILES
      );
    });

    it("reorders remaining spawns correctly", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const secondSpawn = {
        ...mockSpawn,
        id: "spawn-2",
        name: "Second Spawn",
        order: 1,
      };
      const thirdSpawn = {
        ...mockSpawn,
        id: "spawn-3",
        name: "Third Spawn",
        order: 2,
      };
      mockSpawnProfileService.getActiveProfile.mockReturnValue({
        ...mockActiveProfile,
        spawns: [mockSpawn, secondSpawn, thirdSpawn],
      });

      await SpawnService.deleteSpawn("spawn-1");

      // Verify the saved data has reordered spawns
      const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
      const updatedProfile = savedData[0];
      expect(updatedProfile.spawns[0].order).toBe(0); // Second spawn now has order 0
      expect(updatedProfile.spawns[1].order).toBe(1); // Third spawn now has order 1
    });

    it("fails when no active profile exists", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(null);

      const result = await SpawnService.deleteSpawn("spawn-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "No active profile found. Please create or select a profile first."
      );
    });

    it("fails when spawn not found", async () => {
      const result = await SpawnService.deleteSpawn("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Spawn with ID "non-existent" not found in active profile'
      );
    });

    it("fails when localStorage.setItem throws error", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = await SpawnService.deleteSpawn("spawn-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("handles general exceptions", async () => {
      mockSpawnProfileService.getActiveProfile.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await SpawnService.deleteSpawn("spawn-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error");
    });
  });

  describe("enableSpawn", () => {
    it("enables disabled spawn successfully", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const disabledSpawn = { ...mockSpawn, enabled: false };
      mockSpawnProfileService.getActiveProfile.mockReturnValue({
        ...mockActiveProfile,
        spawns: [disabledSpawn],
      });

      const result = await SpawnService.enableSpawn("spawn-1");

      expect(result.success).toBe(true);
      expect(result.spawn?.enabled).toBe(true);
      expect(result.spawn?.lastModified).toBe(1234567890000);
    });

    it("returns success when spawn already enabled", async () => {
      const result = await SpawnService.enableSpawn("spawn-1");

      expect(result.success).toBe(true);
      expect(result.spawn).toEqual(mockSpawn);
    });

    it("fails when no active profile exists", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(null);

      const result = await SpawnService.enableSpawn("spawn-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "No active profile found. Please create or select a profile first."
      );
    });

    it("fails when spawn not found", async () => {
      const result = await SpawnService.enableSpawn("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Spawn with ID "non-existent" not found in active profile'
      );
    });

    it("fails when localStorage.setItem throws error", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const disabledSpawn = { ...mockSpawn, enabled: false };
      mockSpawnProfileService.getActiveProfile.mockReturnValue({
        ...mockActiveProfile,
        spawns: [disabledSpawn],
      });

      const result = await SpawnService.enableSpawn("spawn-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("handles general exceptions", async () => {
      mockSpawnProfileService.getActiveProfile.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await SpawnService.enableSpawn("spawn-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error");
    });
  });

  describe("disableSpawn", () => {
    it("disables enabled spawn successfully", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      const result = await SpawnService.disableSpawn("spawn-1");

      expect(result.success).toBe(true);
      expect(result.spawn?.enabled).toBe(false);
      expect(result.spawn?.lastModified).toBe(1234567890000);
    });

    it("returns success when spawn already disabled", async () => {
      const disabledSpawn = { ...mockSpawn, enabled: false };
      mockSpawnProfileService.getActiveProfile.mockReturnValue({
        ...mockActiveProfile,
        spawns: [disabledSpawn],
      });

      const result = await SpawnService.disableSpawn("spawn-1");

      expect(result.success).toBe(true);
      expect(result.spawn).toEqual(disabledSpawn);
    });

    it("fails when no active profile exists", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(null);

      const result = await SpawnService.disableSpawn("spawn-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "No active profile found. Please create or select a profile first."
      );
    });

    it("fails when spawn not found", async () => {
      const result = await SpawnService.disableSpawn("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Spawn with ID "non-existent" not found in active profile'
      );
    });

    it("fails when localStorage.setItem throws error", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = await SpawnService.disableSpawn("spawn-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("handles general exceptions", async () => {
      mockSpawnProfileService.getActiveProfile.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await SpawnService.disableSpawn("spawn-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error");
    });
  });

  describe("getAllSpawns", () => {
    it("returns all spawns from active profile", async () => {
      const result = await SpawnService.getAllSpawns();

      expect(result).toEqual([mockSpawn]);
    });

    it("returns empty array when no active profile", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(null);

      const result = await SpawnService.getAllSpawns();

      expect(result).toEqual([]);
    });

    it("returns empty array when active profile has no spawns", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(
        mockEmptyProfile
      );

      const result = await SpawnService.getAllSpawns();

      expect(result).toEqual([]);
    });

    it("handles exceptions gracefully", async () => {
      mockSpawnProfileService.getActiveProfile.mockImplementation(() => {
        throw new Error("Profile error");
      });

      const result = await SpawnService.getAllSpawns();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to get all spawns:",
        expect.any(Error)
      );
    });
  });

  describe("getEnabledSpawns", () => {
    it("returns only enabled spawns", async () => {
      const disabledSpawn = {
        ...mockSpawn,
        id: "spawn-2",
        name: "Disabled Spawn",
        enabled: false,
      };
      mockSpawnProfileService.getActiveProfile.mockReturnValue({
        ...mockActiveProfile,
        spawns: [mockSpawn, disabledSpawn],
      });

      const result = await SpawnService.getEnabledSpawns();

      expect(result).toEqual([mockSpawn]);
      expect(result).toHaveLength(1);
    });

    it("returns empty array when no enabled spawns", async () => {
      const disabledSpawn = { ...mockSpawn, enabled: false };
      mockSpawnProfileService.getActiveProfile.mockReturnValue({
        ...mockActiveProfile,
        spawns: [disabledSpawn],
      });

      const result = await SpawnService.getEnabledSpawns();

      expect(result).toEqual([]);
    });

    it("returns empty array when no active profile", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(null);

      const result = await SpawnService.getEnabledSpawns();

      expect(result).toEqual([]);
    });

    it("handles exceptions gracefully", async () => {
      mockSpawnProfileService.getActiveProfile.mockImplementation(() => {
        throw new Error("Profile error");
      });

      const result = await SpawnService.getEnabledSpawns();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to get enabled spawns:",
        expect.any(Error)
      );
    });
  });

  describe("getSpawnStats", () => {
    it("returns correct statistics for profile with spawns", async () => {
      const disabledSpawn = {
        ...mockSpawn,
        id: "spawn-2",
        name: "Disabled Spawn",
        enabled: false,
      };
      mockSpawnProfileService.getActiveProfile.mockReturnValue({
        ...mockActiveProfile,
        spawns: [mockSpawn, disabledSpawn],
      });

      const result = await SpawnService.getSpawnStats();

      expect(result).toEqual({
        totalSpawns: 2,
        enabledSpawns: 1,
        disabledSpawns: 1,
        hasActiveProfile: true,
      });
    });

    it("returns correct statistics for empty profile", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(
        mockEmptyProfile
      );

      const result = await SpawnService.getSpawnStats();

      expect(result).toEqual({
        totalSpawns: 0,
        enabledSpawns: 0,
        disabledSpawns: 0,
        hasActiveProfile: true,
      });
    });

    it("returns correct statistics when no active profile", async () => {
      mockSpawnProfileService.getActiveProfile.mockReturnValue(null);

      const result = await SpawnService.getSpawnStats();

      expect(result).toEqual({
        totalSpawns: 0,
        enabledSpawns: 0,
        disabledSpawns: 0,
        hasActiveProfile: false,
      });
    });

    it("handles exceptions gracefully", async () => {
      mockSpawnProfileService.getActiveProfile.mockImplementation(() => {
        throw new Error("Profile error");
      });

      const result = await SpawnService.getSpawnStats();

      expect(result).toEqual({
        totalSpawns: 0,
        enabledSpawns: 0,
        disabledSpawns: 0,
        hasActiveProfile: false,
      });
      expect(console.error).toHaveBeenCalledWith(
        "Failed to get spawn stats:",
        expect.any(Error)
      );
    });
  });

  describe("edge cases for private updateProfileSpawns method", () => {
    it("fails when profile ID not found in profiles array", async () => {
      // Mock getAllProfiles to return a different profile than the active one
      mockSpawnProfileService.getAllProfiles.mockReturnValue([
        { ...mockActiveProfile, id: "different-profile-id" },
      ]);

      const result = await SpawnService.createSpawn("New Spawn");

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile with ID "profile-1" not found');
    });

    it("fails when profiles array is empty", async () => {
      // Mock getAllProfiles to return empty array
      mockSpawnProfileService.getAllProfiles.mockReturnValue([]);

      const result = await SpawnService.createSpawn("New Spawn");

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile with ID "profile-1" not found');
    });

    it("fails when profile validation fails in updateProfileSpawns", async () => {
      const localStorage = getLocalStorageMock();
      localStorage.setItem.mockImplementation(() => {});

      // Mock profile validation to fail
      mockValidateSpawnProfile.mockReturnValue({
        isValid: false,
        errors: ["Invalid profile data"],
      });

      const result = await SpawnService.createSpawn("New Spawn");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid profile data: Invalid profile data");
    });
  });
});
