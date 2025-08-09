/**
 * Service for managing spawn profiles with localStorage persistence
 *
 * This service replaces the ConfigurationService and provides spawn profile
 * management with active profile tracking and proper context switching.
 */

import type { SpawnProfile } from "../types/spawn";
import { createSpawnProfile, validateSpawnProfile } from "../types/spawn";
import { CacheService, CACHE_KEYS } from "./cacheService";
import { SettingsService } from "./settingsService";

const PROFILES_STORAGE_KEY = "mediaspawner_spawn_profiles";
const DEFAULT_PROFILE_NAME = "Default Profile";

/**
 * Result of profile operations
 */
export interface ProfileOperationResult {
  success: boolean;
  profile?: SpawnProfile;
  profiles?: SpawnProfile[];
  error?: string;
}

/**
 * Service for managing spawn profiles
 */
export class SpawnProfileService {
  /**
   * Get all spawn profiles with caching
   */
  static getAllProfiles(): SpawnProfile[] {
    return CacheService.get(CACHE_KEYS.PROFILES, () => {
      try {
        const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
        if (!stored) {
          return [];
        }

        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
          console.warn("Invalid profiles data found in localStorage, clearing");
          this.clearProfiles();
          return [];
        }

        // Validate each profile
        const validProfiles: SpawnProfile[] = [];
        for (const profile of parsed) {
          const validation = validateSpawnProfile(profile);
          if (validation.isValid) {
            validProfiles.push(profile);
          } else {
            console.warn(
              `Invalid profile found, skipping: ${validation.errors.join(", ")}`
            );
          }
        }

        return validProfiles;
      } catch (error) {
        console.error("Failed to load profiles from localStorage:", error);
        this.clearProfiles();
        return [];
      }
    });
  }

  /**
   * Get a specific profile by ID
   */
  static getProfile(id: string): SpawnProfile | null {
    const profiles = this.getAllProfiles();
    return profiles.find((profile) => profile.id === id) || null;
  }

  /**
   * Get the currently active profile
   */
  static getActiveProfile(): SpawnProfile | null {
    const activeProfileId = this.getActiveProfileId();
    if (!activeProfileId) {
      return null;
    }

    const profile = this.getProfile(activeProfileId);
    if (!profile) {
      // Active profile no longer exists, clear the setting
      this.clearActiveProfile();
      return null;
    }

    return profile;
  }

  /**
   * Get the active profile ID from settings
   */
  static getActiveProfileId(): string | undefined {
    const settings = SettingsService.getSettings();
    return settings.activeProfileId;
  }

  /**
   * Create a new spawn profile
   */
  static createProfile(
    name: string,
    description?: string
  ): ProfileOperationResult {
    try {
      const profiles = this.getAllProfiles();

      // Check for name uniqueness
      if (profiles.some((profile) => profile.name === name)) {
        return {
          success: false,
          error: `Profile with name "${name}" already exists`,
        };
      }

      const newProfile = createSpawnProfile(name, description);
      profiles.push(newProfile);

      const saveResult = this.saveProfiles(profiles);
      if (!saveResult.success) {
        return saveResult;
      }

      // If this is the first profile, make it active
      if (profiles.length === 1) {
        const setActiveResult = this.setActiveProfile(newProfile.id);
        if (!setActiveResult.success) {
          console.warn(
            "Failed to set first profile as active:",
            setActiveResult.error
          );
        }
      }

      return {
        success: true,
        profile: newProfile,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create profile",
      };
    }
  }

  /**
   * Update an existing profile
   */
  static updateProfile(
    id: string,
    updates: Partial<Pick<SpawnProfile, "name" | "description">>
  ): ProfileOperationResult {
    try {
      const profiles = this.getAllProfiles();
      const profileIndex = profiles.findIndex((profile) => profile.id === id);

      if (profileIndex === -1) {
        return {
          success: false,
          error: `Profile with ID "${id}" not found`,
        };
      }

      const currentProfile = profiles[profileIndex];

      // Check for name uniqueness if name is being updated
      if (updates.name && updates.name !== currentProfile.name) {
        if (
          profiles.some(
            (profile) => profile.id !== id && profile.name === updates.name
          )
        ) {
          return {
            success: false,
            error: `Profile with name "${updates.name}" already exists`,
          };
        }
      }

      const updatedProfile = {
        ...currentProfile,
        ...updates,
        lastModified: Date.now(),
      };

      // Validate the updated profile
      const validation = validateSpawnProfile(updatedProfile);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid profile data: ${validation.errors.join(", ")}`,
        };
      }

      profiles[profileIndex] = updatedProfile;

      const saveResult = this.saveProfiles(profiles);
      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
        profile: updatedProfile,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      };
    }
  }

  /**
   * Delete a profile
   */
  static deleteProfile(id: string): ProfileOperationResult {
    try {
      const profiles = this.getAllProfiles();
      const profileIndex = profiles.findIndex((profile) => profile.id === id);

      if (profileIndex === -1) {
        return {
          success: false,
          error: `Profile with ID "${id}" not found`,
        };
      }

      const profileToDelete = profiles[profileIndex];

      // Don't allow deletion of the active profile
      if (profileToDelete.isActive) {
        return {
          success: false,
          error:
            "Cannot delete the active profile. Please switch to a different profile first.",
        };
      }

      profiles.splice(profileIndex, 1);

      const saveResult = this.saveProfiles(profiles);
      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete profile",
      };
    }
  }

  /**
   * Set the active profile
   */
  static setActiveProfile(id: string): ProfileOperationResult {
    try {
      const profiles = this.getAllProfiles();
      const targetProfile = profiles.find((profile) => profile.id === id);

      if (!targetProfile) {
        return {
          success: false,
          error: `Profile with ID "${id}" not found`,
        };
      }

      // Update all profiles to set the correct active state
      const updatedProfiles = profiles.map((profile) => ({
        ...profile,
        isActive: profile.id === id,
      }));

      const saveResult = this.saveProfiles(updatedProfiles);
      if (!saveResult.success) {
        return saveResult;
      }

      // Update settings to track active profile ID
      const settingsResult = SettingsService.updateSettings({
        activeProfileId: id,
      });
      if (!settingsResult.success) {
        console.warn(
          "Failed to update active profile in settings:",
          settingsResult.error
        );
      }

      return {
        success: true,
        profile: updatedProfiles.find((profile) => profile.id === id)!,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to set active profile",
      };
    }
  }

  /**
   * Clear the active profile setting
   */
  static clearActiveProfile(): void {
    try {
      SettingsService.updateSettings({ activeProfileId: undefined });
    } catch (error) {
      console.error("Failed to clear active profile:", error);
    }
  }

  /**
   * Ensure there's a default profile available
   */
  static ensureDefaultProfile(): ProfileOperationResult {
    const profiles = this.getAllProfiles();

    if (profiles.length === 0) {
      return this.createProfile(DEFAULT_PROFILE_NAME, "Default spawn profile");
    }

    // If no active profile, set the first one as active
    const activeProfile = this.getActiveProfile();
    if (!activeProfile) {
      const firstProfile = profiles[0];
      return this.setActiveProfile(firstProfile.id);
    }

    return {
      success: true,
      profile: activeProfile,
    };
  }

  /**
   * Get profiles with active profile information
   */
  static getProfilesWithActiveInfo(): {
    profiles: SpawnProfile[];
    activeProfileId: string | undefined;
  } {
    const profiles = this.getAllProfiles();
    const activeProfileId = this.getActiveProfileId();

    return {
      profiles,
      activeProfileId,
    };
  }

  /**
   * Save profiles to localStorage
   */
  private static saveProfiles(
    profiles: SpawnProfile[]
  ): ProfileOperationResult {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      CacheService.invalidate(CACHE_KEYS.PROFILES);

      return {
        success: true,
        profiles,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to save profiles",
      };
    }
  }

  /**
   * Clear all profiles from localStorage
   */
  static clearProfiles(): void {
    try {
      localStorage.removeItem(PROFILES_STORAGE_KEY);
      CacheService.invalidate(CACHE_KEYS.PROFILES);
      this.clearActiveProfile();
    } catch (error) {
      console.error("Failed to clear profiles:", error);
    }
  }

  /**
   * Get profile statistics
   */
  static getProfileStats(): {
    totalProfiles: number;
    activeProfileId: string | undefined;
    hasActiveProfile: boolean;
    profilesWithSpawns: number;
    totalSpawns: number;
  } {
    const profiles = this.getAllProfiles();
    const activeProfileId = this.getActiveProfileId();

    const profilesWithSpawns = profiles.filter(
      (profile) => profile.spawns.length > 0
    ).length;
    const totalSpawns = profiles.reduce(
      (sum, profile) => sum + profile.spawns.length,
      0
    );

    return {
      totalProfiles: profiles.length,
      activeProfileId,
      hasActiveProfile:
        !!activeProfileId && !!profiles.find((p) => p.id === activeProfileId),
      profilesWithSpawns,
      totalSpawns,
    };
  }
}
