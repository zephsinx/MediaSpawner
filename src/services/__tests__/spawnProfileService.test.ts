import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SpawnProfile } from "../../types/spawn";
import { getLocalStorageMock } from "./testUtils";

// Mock dependencies before importing the service
vi.mock("../cacheService", () => ({
  CacheService: {
    get: vi.fn(),
    invalidate: vi.fn(),
  },
  CACHE_KEYS: {
    PROFILES: "profiles",
  },
}));

vi.mock("../settingsService", () => ({
  SettingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

vi.mock("../../types/spawn", () => ({
  createSpawnProfile: vi.fn(),
  validateSpawnProfile: vi.fn(),
}));

// Import after mocking
import { SpawnProfileService } from "../spawnProfileService";
import { CacheService, CACHE_KEYS } from "../cacheService";
import { SettingsService } from "../settingsService";
import { createSpawnProfile, validateSpawnProfile } from "../../types/spawn";

const mockCacheService = vi.mocked(CacheService);
const mockSettingsService = vi.mocked(SettingsService);
const mockCreateSpawnProfile = vi.mocked(createSpawnProfile);
const mockValidateSpawnProfile = vi.mocked(validateSpawnProfile);

describe("SpawnProfileService", () => {
  // Test data
  const validProfile: SpawnProfile = {
    id: "profile-1",
    name: "Test Profile",
    description: "Test description",
    spawns: [],
    lastModified: 1234567890000,
    isActive: false,
  };

  const activeProfile: SpawnProfile = {
    ...validProfile,
    id: "profile-2",
    name: "Active Profile",
    isActive: true,
  };

  const invalidProfile = {
    id: "",
    name: "",
    spawns: [{ id: "" }],
    lastModified: 0,
    isActive: false,
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
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock crypto.randomUUID
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(
      () => "00000000-0000-0000-0000-000000000000"
    );

    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementations
    mockCacheService.get.mockImplementation((_key, fetcher) => fetcher());
    mockCacheService.invalidate.mockImplementation(() => {});
    mockSettingsService.getSettings.mockReturnValue({ workingDirectory: "" });
    mockSettingsService.updateSettings.mockReturnValue({ success: true });
    mockCreateSpawnProfile.mockImplementation((name, description) => ({
      id: "00000000-0000-0000-0000-000000000000",
      name,
      description,
      spawns: [],
      lastModified: 1234567890000,
      isActive: false,
    }));
    mockValidateSpawnProfile.mockReturnValue({ isValid: true, errors: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("getAllProfiles", () => {
    it("returns empty array when no profiles exist", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(null);

      const result = SpawnProfileService.getAllProfiles();

      expect(result).toEqual([]);
      expect(localStorage.getItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_profiles"
      );
    });

    it("returns profiles when valid data exists", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));

      const result = SpawnProfileService.getAllProfiles();

      expect(result).toEqual([validProfile]);
      expect(mockValidateSpawnProfile).toHaveBeenCalledWith(validProfile);
    });

    it("filters out invalid profiles and logs warnings", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(
        JSON.stringify([validProfile, invalidProfile])
      );

      mockValidateSpawnProfile
        .mockReturnValueOnce({ isValid: true, errors: [] })
        .mockReturnValueOnce({ isValid: false, errors: ["Invalid ID"] });

      const result = SpawnProfileService.getAllProfiles();

      expect(result).toEqual([validProfile]);
      expect(console.warn).toHaveBeenCalledWith(
        "Invalid profile found, skipping: Invalid ID"
      );
    });

    it("handles non-array data in localStorage", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify({ profiles: [] }));

      const result = SpawnProfileService.getAllProfiles();

      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        "Invalid profiles data found in localStorage, clearing"
      );
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_profiles"
      );
    });

    it("handles JSON parse errors", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue("invalid json");

      const result = SpawnProfileService.getAllProfiles();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to load profiles from localStorage:",
        expect.any(Error)
      );
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_profiles"
      );
    });

    it("handles localStorage.getItem errors", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const result = SpawnProfileService.getAllProfiles();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to load profiles from localStorage:",
        expect.any(Error)
      );
    });
  });

  describe("getProfile", () => {
    it("returns profile when found", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));

      const result = SpawnProfileService.getProfile("profile-1");

      expect(result).toEqual(validProfile);
    });

    it("returns null when profile not found", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));

      const result = SpawnProfileService.getProfile("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getActiveProfile", () => {
    it("returns active profile when exists", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(
        JSON.stringify([validProfile, activeProfile])
      );
      mockSettingsService.getSettings.mockReturnValue({
        workingDirectory: "",
        activeProfileId: "profile-2",
      });

      const result = SpawnProfileService.getActiveProfile();

      expect(result).toEqual(activeProfile);
    });

    it("returns null when no active profile ID", () => {
      mockSettingsService.getSettings.mockReturnValue({ workingDirectory: "" });

      const result = SpawnProfileService.getActiveProfile();

      expect(result).toBeNull();
    });

    it("returns null and clears setting when active profile not found", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      mockSettingsService.getSettings.mockReturnValue({
        workingDirectory: "",
        activeProfileId: "non-existent",
      });

      const result = SpawnProfileService.getActiveProfile();

      expect(result).toBeNull();
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        activeProfileId: undefined,
      });
    });
  });

  describe("getActiveProfileId", () => {
    it("returns active profile ID from settings", () => {
      mockSettingsService.getSettings.mockReturnValue({
        workingDirectory: "",
        activeProfileId: "profile-1",
      });

      const result = SpawnProfileService.getActiveProfileId();

      expect(result).toBe("profile-1");
    });

    it("returns undefined when no active profile", () => {
      mockSettingsService.getSettings.mockReturnValue({ workingDirectory: "" });

      const result = SpawnProfileService.getActiveProfileId();

      expect(result).toBeUndefined();
    });
  });

  describe("createProfile", () => {
    it("creates profile successfully with name and description", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([]));
      localStorage.setItem.mockImplementation(() => {});

      const result = SpawnProfileService.createProfile(
        "New Profile",
        "Description"
      );

      expect(result.success).toBe(true);
      expect(result.profile).toBeDefined();
      expect(mockCreateSpawnProfile).toHaveBeenCalledWith(
        "New Profile",
        "Description"
      );
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it("creates profile successfully with name only", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([]));
      localStorage.setItem.mockImplementation(() => {});

      const result = SpawnProfileService.createProfile("New Profile");

      expect(result.success).toBe(true);
      expect(mockCreateSpawnProfile).toHaveBeenCalledWith(
        "New Profile",
        undefined
      );
    });

    it("fails when profile name already exists", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));

      const result = SpawnProfileService.createProfile("Test Profile");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Profile with name "Test Profile" already exists'
      );
    });

    it("sets first profile as active automatically", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([]));

      // Track localStorage state changes
      let storedData = JSON.stringify([]);
      localStorage.setItem.mockImplementation((key, value) => {
        if (key === "mediaspawner_spawn_profiles") {
          storedData = value;
        }
      });
      localStorage.getItem.mockImplementation((key) => {
        if (key === "mediaspawner_spawn_profiles") {
          return storedData;
        }
        return null;
      });

      // Mock CacheService to return current localStorage state
      mockCacheService.get.mockImplementation((key, fetcher) => {
        if (key === CACHE_KEYS.PROFILES) {
          const stored = localStorage.getItem("mediaspawner_spawn_profiles");
          if (stored) {
            return JSON.parse(stored);
          }
          return fetcher();
        }
        return fetcher();
      });

      const result = SpawnProfileService.createProfile("First Profile");

      expect(result.success).toBe(true);
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        activeProfileId: "00000000-0000-0000-0000-000000000000",
      });
    });

    it("handles localStorage.setItem errors", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([]));
      localStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = SpawnProfileService.createProfile("New Profile");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("handles general errors", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockImplementation(() => {
        throw new Error("General error");
      });

      // Mock CacheService to throw the error directly instead of calling fetcher
      mockCacheService.get.mockImplementation(() => {
        throw new Error("General error");
      });

      const result = SpawnProfileService.createProfile("New Profile");

      expect(result.success).toBe(false);
      expect(result.error).toBe("General error");
    });
  });

  describe("updateProfile", () => {
    it("updates profile name successfully", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {});

      const result = SpawnProfileService.updateProfile("profile-1", {
        name: "Updated Name",
      });

      expect(result.success).toBe(true);
      expect(result.profile?.name).toBe("Updated Name");
      expect(result.profile?.lastModified).toBe(1234567890000);
    });

    it("updates profile description successfully", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {});

      const result = SpawnProfileService.updateProfile("profile-1", {
        description: "Updated description",
      });

      expect(result.success).toBe(true);
      expect(result.profile?.description).toBe("Updated description");
    });

    it("fails when profile not found", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));

      const result = SpawnProfileService.updateProfile("non-existent", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile with ID "non-existent" not found');
    });

    it("fails when name conflicts with existing profile", () => {
      const localStorage = getLocalStorageMock();
      const profile2 = { ...validProfile, id: "profile-2", name: "Profile 2" };
      localStorage.getItem.mockReturnValue(
        JSON.stringify([validProfile, profile2])
      );

      const result = SpawnProfileService.updateProfile("profile-1", {
        name: "Profile 2",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile with name "Profile 2" already exists');
    });

    it("allows updating to same name", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {});

      const result = SpawnProfileService.updateProfile("profile-1", {
        name: "Test Profile",
      });

      expect(result.success).toBe(true);
    });

    it("fails when validation fails after update", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {});

      // Mock CacheService to return the profile data from localStorage
      mockCacheService.get.mockImplementation((key, fetcher) => {
        if (key === CACHE_KEYS.PROFILES) {
          const stored = localStorage.getItem("mediaspawner_spawn_profiles");
          if (stored) {
            return JSON.parse(stored);
          }
          return fetcher();
        }
        return fetcher();
      });

      mockValidateSpawnProfile.mockReturnValue({
        isValid: false,
        errors: ["Invalid data"],
      });

      const result = SpawnProfileService.updateProfile("profile-1", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid profile data: Invalid data");
    });

    it("handles localStorage errors", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = SpawnProfileService.updateProfile("profile-1", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("handles general exceptions during update", () => {
      // Mock getAllProfiles to throw an exception
      mockCacheService.get.mockImplementation(() => {
        throw new Error("Unexpected error during update");
      });

      const result = SpawnProfileService.updateProfile("profile-1", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error during update");
    });
  });

  describe("deleteProfile", () => {
    it("deletes non-active profile successfully", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(
        JSON.stringify([validProfile, activeProfile])
      );
      localStorage.setItem.mockImplementation(() => {});

      const result = SpawnProfileService.deleteProfile("profile-1");

      expect(result.success).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_profiles",
        JSON.stringify([activeProfile])
      );
    });

    it("fails when deleting active profile", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([activeProfile]));

      const result = SpawnProfileService.deleteProfile("profile-2");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Cannot delete the active profile. Please switch to a different profile first."
      );
    });

    it("fails when profile not found", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));

      const result = SpawnProfileService.deleteProfile("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile with ID "non-existent" not found');
    });

    it("handles localStorage errors", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = SpawnProfileService.deleteProfile("profile-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("handles general exceptions during delete", () => {
      // Mock getAllProfiles to throw an exception
      mockCacheService.get.mockImplementation(() => {
        throw new Error("Unexpected error during delete");
      });

      const result = SpawnProfileService.deleteProfile("profile-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error during delete");
    });
  });

  describe("setActiveProfile", () => {
    it("sets profile as active successfully", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(
        JSON.stringify([validProfile, activeProfile])
      );
      localStorage.setItem.mockImplementation(() => {});

      const result = SpawnProfileService.setActiveProfile("profile-1");

      expect(result.success).toBe(true);
      expect(result.profile?.isActive).toBe(true);
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        activeProfileId: "profile-1",
      });
    });

    it("updates all profiles isActive flags", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(
        JSON.stringify([validProfile, activeProfile])
      );
      localStorage.setItem.mockImplementation(() => {});

      SpawnProfileService.setActiveProfile("profile-1");

      const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
      expect(savedData[0].isActive).toBe(true);
      expect(savedData[1].isActive).toBe(false);
    });

    it("fails when profile not found", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));

      const result = SpawnProfileService.setActiveProfile("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile with ID "non-existent" not found');
    });

    it("handles settings update failure", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {});
      mockSettingsService.updateSettings.mockReturnValue({
        success: false,
        error: "Settings error",
      });

      const result = SpawnProfileService.setActiveProfile("profile-1");

      expect(result.success).toBe(true); // Profile update still succeeds
      expect(console.warn).toHaveBeenCalledWith(
        "Failed to update active profile in settings:",
        "Settings error"
      );
    });

    it("handles localStorage errors", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = SpawnProfileService.setActiveProfile("profile-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage error");
    });

    it("handles general exceptions during setActiveProfile", () => {
      // Mock getAllProfiles to throw an exception
      mockCacheService.get.mockImplementation(() => {
        throw new Error("Unexpected error during setActiveProfile");
      });

      const result = SpawnProfileService.setActiveProfile("profile-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unexpected error during setActiveProfile");
    });

    it("handles settings service exceptions", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {});

      // Mock SettingsService to throw an exception
      mockSettingsService.updateSettings.mockImplementation(() => {
        throw new Error("Settings service error");
      });

      const result = SpawnProfileService.setActiveProfile("profile-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Settings service error");
    });
  });

  describe("clearActiveProfile", () => {
    it("clears active profile setting", () => {
      SpawnProfileService.clearActiveProfile();

      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        activeProfileId: undefined,
      });
    });

    it("handles settings service errors", () => {
      mockSettingsService.updateSettings.mockImplementation(() => {
        throw new Error("Settings error");
      });

      expect(() => SpawnProfileService.clearActiveProfile()).not.toThrow();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to clear active profile:",
        expect.any(Error)
      );
    });
  });

  describe("ensureDefaultProfile", () => {
    it("creates default profile when no profiles exist", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([]));
      localStorage.setItem.mockImplementation(() => {});

      const result = SpawnProfileService.ensureDefaultProfile();

      expect(result.success).toBe(true);
      expect(mockCreateSpawnProfile).toHaveBeenCalledWith(
        "Default Profile",
        "Default spawn profile"
      );
    });

    it("sets first profile as active when no active profile", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      localStorage.setItem.mockImplementation(() => {});
      mockSettingsService.getSettings.mockReturnValue({ workingDirectory: "" });

      const result = SpawnProfileService.ensureDefaultProfile();

      expect(result.success).toBe(true);
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        activeProfileId: "profile-1",
      });
    });

    it("returns existing active profile when available", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(
        JSON.stringify([validProfile, activeProfile])
      );
      mockSettingsService.getSettings.mockReturnValue({
        workingDirectory: "",
        activeProfileId: "profile-2",
      });

      const result = SpawnProfileService.ensureDefaultProfile();

      expect(result.success).toBe(true);
      expect(result.profile).toEqual(activeProfile);
    });
  });

  describe("getProfilesWithActiveInfo", () => {
    it("returns profiles with active profile ID", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(
        JSON.stringify([validProfile, activeProfile])
      );
      mockSettingsService.getSettings.mockReturnValue({
        workingDirectory: "",
        activeProfileId: "profile-2",
      });

      const result = SpawnProfileService.getProfilesWithActiveInfo();

      expect(result.profiles).toEqual([validProfile, activeProfile]);
      expect(result.activeProfileId).toBe("profile-2");
    });
  });

  describe("clearProfiles", () => {
    it("clears all profiles and active profile", () => {
      const localStorage = getLocalStorageMock();
      localStorage.removeItem.mockImplementation(() => {});

      SpawnProfileService.clearProfiles();

      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "mediaspawner_spawn_profiles"
      );
      expect(mockCacheService.invalidate).toHaveBeenCalledWith(
        CACHE_KEYS.PROFILES
      );
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
        activeProfileId: undefined,
      });
    });

    it("handles localStorage errors", () => {
      const localStorage = getLocalStorageMock();
      localStorage.removeItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      expect(() => SpawnProfileService.clearProfiles()).not.toThrow();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to clear profiles:",
        expect.any(Error)
      );
    });
  });

  describe("getProfileStats", () => {
    it("returns correct statistics for empty profiles", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([]));
      mockSettingsService.getSettings.mockReturnValue({ workingDirectory: "" });

      const result = SpawnProfileService.getProfileStats();

      expect(result).toEqual({
        totalProfiles: 0,
        activeProfileId: undefined,
        hasActiveProfile: false,
        profilesWithSpawns: 0,
        totalSpawns: 0,
      });
    });

    it("returns correct statistics for profiles with spawns", () => {
      const localStorage = getLocalStorageMock();
      const profileWithSpawns = {
        ...validProfile,
        spawns: [{ id: "spawn-1" }, { id: "spawn-2" }],
      };
      const profileWithoutSpawns = { ...validProfile, id: "profile-3" };
      localStorage.getItem.mockReturnValue(
        JSON.stringify([profileWithSpawns, profileWithoutSpawns])
      );
      mockSettingsService.getSettings.mockReturnValue({
        workingDirectory: "",
        activeProfileId: "profile-1",
      });

      const result = SpawnProfileService.getProfileStats();

      expect(result).toEqual({
        totalProfiles: 2,
        activeProfileId: "profile-1",
        hasActiveProfile: true,
        profilesWithSpawns: 1,
        totalSpawns: 2,
      });
    });

    it("handles missing active profile", () => {
      const localStorage = getLocalStorageMock();
      localStorage.getItem.mockReturnValue(JSON.stringify([validProfile]));
      mockSettingsService.getSettings.mockReturnValue({
        workingDirectory: "",
        activeProfileId: "non-existent",
      });

      const result = SpawnProfileService.getProfileStats();

      expect(result.hasActiveProfile).toBe(false);
    });
  });
});
