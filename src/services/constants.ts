/**
 * Centralized storage key constants for MediaSpawner
 *
 * All localStorage keys used across the application should be defined here
 * to ensure consistency and avoid duplication.
 */

export const STORAGE_KEYS = {
  PROFILES: "mediaspawner_spawn_profiles",
  ASSETS: "mediaspawner_assets",
  SETTINGS: "mediaspawner_settings",
  SYNC_STATUS: "mediaspawner_sync_status",
  PROFILE_SPAWN_SELECTIONS: "mediaspawner_profile_spawn_selections",
  PROFILES_INITIALIZED: "mediaspawner_profiles_initialized",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
