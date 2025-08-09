/**
 * Service for managing individual spawns with localStorage persistence
 *
 * This service provides CRUD operations for spawns within the active profile,
 * working through SpawnProfileService since spawns are stored within profiles.
 */

import type { Spawn, SpawnProfile } from "../types/spawn";
import {
  createSpawn,
  validateSpawn,
  validateSpawnProfile,
} from "../types/spawn";
import { CacheService, CACHE_KEYS } from "./cacheService";
import { SpawnProfileService } from "./spawnProfileService";

/**
 * Result of spawn operations
 */
export interface SpawnOperationResult {
  success: boolean;
  spawn?: Spawn;
  error?: string;
}

/**
 * Service for managing individual spawns
 */
export class SpawnService {
  /**
   * Create a new spawn in the active profile
   */
  static async createSpawn(
    name: string,
    description?: string
  ): Promise<SpawnOperationResult> {
    try {
      const activeProfile = SpawnProfileService.getActiveProfile();
      if (!activeProfile) {
        return {
          success: false,
          error:
            "No active profile found. Please create or select a profile first.",
        };
      }

      // Validate spawn name
      if (!name || name.trim() === "") {
        return {
          success: false,
          error: "Spawn name is required",
        };
      }

      // Check for name uniqueness within the profile
      if (activeProfile.spawns.some((spawn) => spawn.name === name.trim())) {
        return {
          success: false,
          error: `Spawn with name "${name}" already exists in this profile`,
        };
      }

      // Create new spawn with default settings
      const newSpawn = createSpawn(name.trim(), description?.trim());

      // Set order to be last in the profile
      newSpawn.order = activeProfile.spawns.length;

      // Validate the new spawn
      const validation = validateSpawn(newSpawn);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid spawn data: ${validation.errors.join(", ")}`,
        };
      }

      // Add spawn to active profile
      const updatedSpawns = [...activeProfile.spawns, newSpawn];
      const updateResult = this.updateProfileSpawns(
        activeProfile.id,
        updatedSpawns
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || "Failed to save spawn to profile",
        };
      }

      return {
        success: true,
        spawn: newSpawn,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create spawn",
      };
    }
  }

  /**
   * Get a specific spawn by ID from the active profile
   */
  static async getSpawn(id: string): Promise<Spawn | null> {
    try {
      const activeProfile = SpawnProfileService.getActiveProfile();
      if (!activeProfile) {
        return null;
      }

      return activeProfile.spawns.find((spawn) => spawn.id === id) || null;
    } catch (error) {
      console.error("Failed to get spawn:", error);
      return null;
    }
  }

  /**
   * Update an existing spawn in the active profile
   */
  static async updateSpawn(
    id: string,
    updates: Partial<
      Pick<
        Spawn,
        "name" | "description" | "trigger" | "duration" | "assets" | "enabled"
      >
    >
  ): Promise<SpawnOperationResult> {
    try {
      const activeProfile = SpawnProfileService.getActiveProfile();
      if (!activeProfile) {
        return {
          success: false,
          error:
            "No active profile found. Please create or select a profile first.",
        };
      }

      const spawnIndex = activeProfile.spawns.findIndex(
        (spawn) => spawn.id === id
      );
      if (spawnIndex === -1) {
        return {
          success: false,
          error: `Spawn with ID "${id}" not found in active profile`,
        };
      }

      const currentSpawn = activeProfile.spawns[spawnIndex];

      // Check for name uniqueness if name is being updated
      if (updates.name && updates.name !== currentSpawn.name) {
        if (
          activeProfile.spawns.some(
            (spawn) => spawn.id !== id && spawn.name === updates.name!.trim()
          )
        ) {
          return {
            success: false,
            error: `Spawn with name "${updates.name}" already exists in this profile`,
          };
        }
      }

      // Create updated spawn
      const updatedSpawn = {
        ...currentSpawn,
        ...updates,
        lastModified: Date.now(),
      };

      // Validate the updated spawn
      const validation = validateSpawn(updatedSpawn);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid spawn data: ${validation.errors.join(", ")}`,
        };
      }

      // Update spawn in profile
      const updatedSpawns = [...activeProfile.spawns];
      updatedSpawns[spawnIndex] = updatedSpawn;

      const updateResult = this.updateProfileSpawns(
        activeProfile.id,
        updatedSpawns
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || "Failed to update spawn in profile",
        };
      }

      return {
        success: true,
        spawn: updatedSpawn,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update spawn",
      };
    }
  }

  /**
   * Delete a spawn from the active profile
   */
  static async deleteSpawn(id: string): Promise<SpawnOperationResult> {
    try {
      const activeProfile = SpawnProfileService.getActiveProfile();
      if (!activeProfile) {
        return {
          success: false,
          error:
            "No active profile found. Please create or select a profile first.",
        };
      }

      const spawnIndex = activeProfile.spawns.findIndex(
        (spawn) => spawn.id === id
      );
      if (spawnIndex === -1) {
        return {
          success: false,
          error: `Spawn with ID "${id}" not found in active profile`,
        };
      }

      const spawnToDelete = activeProfile.spawns[spawnIndex];

      // Remove spawn from profile
      const updatedSpawns = activeProfile.spawns.filter(
        (spawn) => spawn.id !== id
      );

      // Reorder remaining spawns to maintain sequential order
      updatedSpawns.forEach((spawn, index) => {
        spawn.order = index;
      });

      const updateResult = this.updateProfileSpawns(
        activeProfile.id,
        updatedSpawns
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || "Failed to delete spawn from profile",
        };
      }

      return {
        success: true,
        spawn: spawnToDelete,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete spawn",
      };
    }
  }

  /**
   * Enable a spawn in the active profile
   */
  static async enableSpawn(id: string): Promise<SpawnOperationResult> {
    try {
      const activeProfile = SpawnProfileService.getActiveProfile();
      if (!activeProfile) {
        return {
          success: false,
          error:
            "No active profile found. Please create or select a profile first.",
        };
      }

      const spawnIndex = activeProfile.spawns.findIndex(
        (spawn) => spawn.id === id
      );
      if (spawnIndex === -1) {
        return {
          success: false,
          error: `Spawn with ID "${id}" not found in active profile`,
        };
      }

      const currentSpawn = activeProfile.spawns[spawnIndex];
      if (currentSpawn.enabled) {
        return {
          success: true,
          spawn: currentSpawn,
        };
      }

      // Enable the spawn
      const updatedSpawn = {
        ...currentSpawn,
        enabled: true,
        lastModified: Date.now(),
      };

      const updatedSpawns = [...activeProfile.spawns];
      updatedSpawns[spawnIndex] = updatedSpawn;

      const updateResult = this.updateProfileSpawns(
        activeProfile.id,
        updatedSpawns
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || "Failed to enable spawn",
        };
      }

      return {
        success: true,
        spawn: updatedSpawn,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to enable spawn",
      };
    }
  }

  /**
   * Disable a spawn in the active profile
   */
  static async disableSpawn(id: string): Promise<SpawnOperationResult> {
    try {
      const activeProfile = SpawnProfileService.getActiveProfile();
      if (!activeProfile) {
        return {
          success: false,
          error:
            "No active profile found. Please create or select a profile first.",
        };
      }

      const spawnIndex = activeProfile.spawns.findIndex(
        (spawn) => spawn.id === id
      );
      if (spawnIndex === -1) {
        return {
          success: false,
          error: `Spawn with ID "${id}" not found in active profile`,
        };
      }

      const currentSpawn = activeProfile.spawns[spawnIndex];
      if (!currentSpawn.enabled) {
        return {
          success: true,
          spawn: currentSpawn,
        };
      }

      // Disable the spawn
      const updatedSpawn = {
        ...currentSpawn,
        enabled: false,
        lastModified: Date.now(),
      };

      const updatedSpawns = [...activeProfile.spawns];
      updatedSpawns[spawnIndex] = updatedSpawn;

      const updateResult = this.updateProfileSpawns(
        activeProfile.id,
        updatedSpawns
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || "Failed to disable spawn",
        };
      }

      return {
        success: true,
        spawn: updatedSpawn,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to disable spawn",
      };
    }
  }

  /**
   * Get all spawns from the active profile
   */
  static async getAllSpawns(): Promise<Spawn[]> {
    try {
      const activeProfile = SpawnProfileService.getActiveProfile();
      return activeProfile?.spawns || [];
    } catch (error) {
      console.error("Failed to get all spawns:", error);
      return [];
    }
  }

  /**
   * Get all enabled spawns from the active profile
   */
  static async getEnabledSpawns(): Promise<Spawn[]> {
    try {
      const activeProfile = SpawnProfileService.getActiveProfile();
      return activeProfile?.spawns.filter((spawn) => spawn.enabled) || [];
    } catch (error) {
      console.error("Failed to get enabled spawns:", error);
      return [];
    }
  }

  /**
   * Get spawn statistics for the active profile
   */
  static async getSpawnStats(): Promise<{
    totalSpawns: number;
    enabledSpawns: number;
    disabledSpawns: number;
    hasActiveProfile: boolean;
  }> {
    try {
      const activeProfile = SpawnProfileService.getActiveProfile();
      if (!activeProfile) {
        return {
          totalSpawns: 0,
          enabledSpawns: 0,
          disabledSpawns: 0,
          hasActiveProfile: false,
        };
      }

      const totalSpawns = activeProfile.spawns.length;
      const enabledSpawns = activeProfile.spawns.filter(
        (spawn) => spawn.enabled
      ).length;

      return {
        totalSpawns,
        enabledSpawns,
        disabledSpawns: totalSpawns - enabledSpawns,
        hasActiveProfile: true,
      };
    } catch (error) {
      console.error("Failed to get spawn stats:", error);
      return {
        totalSpawns: 0,
        enabledSpawns: 0,
        disabledSpawns: 0,
        hasActiveProfile: false,
      };
    }
  }

  /**
   * Private method to update spawns in a profile
   * This bypasses the SpawnProfileService.updateProfile limitation
   */
  private static updateProfileSpawns(
    profileId: string,
    spawns: Spawn[]
  ): SpawnOperationResult {
    try {
      const profiles = SpawnProfileService.getAllProfiles();
      const profileIndex = profiles.findIndex(
        (profile) => profile.id === profileId
      );

      if (profileIndex === -1) {
        return {
          success: false,
          error: `Profile with ID "${profileId}" not found`,
        };
      }

      const currentProfile = profiles[profileIndex];
      const updatedProfile: SpawnProfile = {
        ...currentProfile,
        spawns,
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

      // Update the profile in the array
      profiles[profileIndex] = updatedProfile;

      // Save to localStorage
      const PROFILES_STORAGE_KEY = "mediaspawner_spawn_profiles";
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));

      // Invalidate cache to ensure fresh data
      CacheService.invalidate(CACHE_KEYS.PROFILES);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update profile spawns",
      };
    }
  }
}
