/**
 * Spawn-centric data model types for MediaSpawner
 *
 * This module defines the core interfaces for the spawn-centric architecture,
 * replacing the previous configuration/asset group model with a more focused
 * approach where Spawns are the primary unit of work.
 */

import type { MediaAssetProperties } from "./media";

/**
 * Trigger configuration for spawns
 * Designed for future OBS integration and complex trigger scenarios
 */
export interface SpawnTrigger {
  /** Whether this spawn trigger is enabled */
  enabled: boolean;

  /** Type of trigger mechanism */
  type: "manual" | "timer" | "event" | "condition";

  /** Trigger-specific configuration (expanded based on type) */
  config: TriggerConfig;

  /** Priority level for trigger execution (lower = higher priority) */
  priority?: number;
}

/**
 * Trigger configuration variants
 */
export type TriggerConfig =
  | ManualTriggerConfig
  | TimerTriggerConfig
  | EventTriggerConfig
  | ConditionTriggerConfig;

/**
 * Manual trigger configuration (user-initiated)
 */
export interface ManualTriggerConfig {
  type: "manual";
  /** Hotkey or button binding for manual trigger */
  binding?: string;
}

/**
 * Timer-based trigger configuration
 */
export interface TimerTriggerConfig {
  type: "timer";
  /** Interval in milliseconds */
  interval: number;
  /** Whether to repeat the trigger */
  repeat: boolean;
  /** Maximum number of repetitions (undefined = infinite) */
  maxRepetitions?: number;
}

/**
 * Event-based trigger configuration
 */
export interface EventTriggerConfig {
  type: "event";
  /** Event type to listen for */
  eventType: string;
  /** Event-specific parameters */
  parameters?: Record<string, unknown>;
}

/**
 * Condition-based trigger configuration
 */
export interface ConditionTriggerConfig {
  type: "condition";
  /** Condition expression or rule */
  condition: string;
  /** How often to evaluate the condition (milliseconds) */
  evaluationInterval: number;
}

/**
 * Spawn-specific asset instance with inheritance and override capabilities
 *
 * This represents how an asset behaves within a specific spawn context,
 * allowing the same asset to have different settings in different spawns.
 */
export interface SpawnAsset {
  /** Unique identifier for this spawn asset instance */
  id: string;

  /** Reference to the base asset in the asset library */
  assetId: string;

  /** Spawn-specific properties that override inherited defaults */
  overrides: SpawnAssetOverrides;

  /** Whether this asset instance is enabled within the spawn */
  enabled: boolean;

  /** Order/position of this asset within the spawn */
  order: number;
}

/**
 * Properties that can be overridden per spawn asset instance
 */
export interface SpawnAssetOverrides {
  /** Override spawn's default duration for this specific asset */
  duration?: number;

  /** Override spawn's default trigger for this specific asset */
  trigger?: SpawnTrigger;

  /** Override asset's default properties */
  properties?: Partial<MediaAssetProperties>;

  /** Custom spawn-specific settings */
  customSettings?: Record<string, unknown>;
}

/**
 * Core spawn interface representing a collection of assets with shared behavior
 *
 * Spawns are the primary unit of work in the spawn-centric architecture.
 * Each spawn has default settings that its assets inherit, with the ability
 * for individual assets to override these defaults.
 */
export interface Spawn {
  /** Unique identifier for the spawn */
  id: string;

  /** Human-readable name for the spawn */
  name: string;

  /** Optional description of the spawn's purpose or behavior */
  description?: string;

  /** Whether this spawn is enabled and can be triggered */
  enabled: boolean;

  /** Default trigger configuration for this spawn */
  trigger: SpawnTrigger;

  /** Default duration for assets in this spawn (milliseconds) */
  duration: number;

  /** Array of spawn-specific asset instances */
  assets: SpawnAsset[];

  /** Timestamp of last modification (Unix timestamp in milliseconds) */
  lastModified: number;

  /** Order/priority of this spawn within its profile */
  order: number;
}

/**
 * Spawn profile interface representing an organizational container for spawns
 *
 * Profiles allow users to organize spawns into different projects or contexts.
 * Only one profile is active at a time, providing clear context boundaries.
 */
export interface SpawnProfile {
  /** Unique identifier for the profile */
  id: string;

  /** Human-readable name for the profile */
  name: string;

  /** Optional description of the profile's purpose */
  description?: string;

  /** Array of spawns in this profile */
  spawns: Spawn[];

  /** Timestamp of last modification (Unix timestamp in milliseconds) */
  lastModified: number;

  /** Whether this profile is currently active */
  isActive: boolean;
}

/**
 * Helper function to create a new spawn trigger with default settings
 */
export const createSpawnTrigger = (
  type: SpawnTrigger["type"] = "manual",
  config?: TriggerConfig
): SpawnTrigger => {
  return {
    enabled: true,
    type,
    config: config || getDefaultTriggerConfig(type),
    priority: 0,
  };
};

/**
 * Get default trigger configuration based on trigger type
 */
export const getDefaultTriggerConfig = (
  type: SpawnTrigger["type"]
): TriggerConfig => {
  switch (type) {
    case "manual":
      return { type: "manual" };
    case "timer":
      return {
        type: "timer",
        interval: 5000, // 5 seconds
        repeat: false,
      };
    case "event":
      return {
        type: "event",
        eventType: "default",
      };
    case "condition":
      return {
        type: "condition",
        condition: "true",
        evaluationInterval: 1000, // 1 second
      };
  }
};

/**
 * Helper function to create a new spawn asset instance
 */
export const createSpawnAsset = (
  assetId: string,
  order: number,
  overrides?: Partial<SpawnAssetOverrides>,
  id?: string
): SpawnAsset => {
  return {
    id: id || crypto.randomUUID(),
    assetId,
    overrides: overrides || {},
    enabled: true,
    order,
  };
};

/**
 * Helper function to create a new spawn with default settings
 */
export const createSpawn = (
  name: string,
  description?: string,
  assets: SpawnAsset[] = [],
  id?: string
): Spawn => {
  return {
    id: id || crypto.randomUUID(),
    name,
    description,
    enabled: true,
    trigger: createSpawnTrigger(),
    duration: 5000, // 5 seconds default
    assets,
    lastModified: Date.now(),
    order: 0,
  };
};

/**
 * Helper function to create a new spawn profile
 */
export const createSpawnProfile = (
  name: string,
  description?: string,
  spawns: Spawn[] = [],
  id?: string
): SpawnProfile => {
  return {
    id: id || crypto.randomUUID(),
    name,
    description,
    spawns,
    lastModified: Date.now(),
    isActive: false,
  };
};

/**
 * Check if a spawn has any assets
 */
export const hasSpawnAssets = (spawn: Spawn): boolean => {
  return spawn.assets.length > 0;
};

/**
 * Get the number of enabled assets in a spawn
 */
export const getEnabledAssetCount = (spawn: Spawn): number => {
  return spawn.assets.filter((asset) => asset.enabled).length;
};

/**
 * Check if a spawn has any enabled assets
 */
export const hasEnabledAssets = (spawn: Spawn): boolean => {
  return getEnabledAssetCount(spawn) > 0;
};

/**
 * Get spawn assets sorted by their order
 */
export const getSortedSpawnAssets = (spawn: Spawn): SpawnAsset[] => {
  return [...spawn.assets].sort((a, b) => a.order - b.order);
};

/**
 * Check if a spawn profile has any spawns
 */
export const hasSpawns = (profile: SpawnProfile): boolean => {
  return profile.spawns.length > 0;
};

/**
 * Get the number of enabled spawns in a profile
 */
export const getEnabledSpawnCount = (profile: SpawnProfile): number => {
  return profile.spawns.filter((spawn) => spawn.enabled).length;
};

/**
 * Update the last modified timestamp of a spawn
 */
export const updateSpawnTimestamp = (spawn: Spawn): Spawn => {
  return {
    ...spawn,
    lastModified: Date.now(),
  };
};

/**
 * Update the last modified timestamp of a spawn profile
 */
export const updateSpawnProfileTimestamp = (
  profile: SpawnProfile
): SpawnProfile => {
  return {
    ...profile,
    lastModified: Date.now(),
  };
};

/**
 * Type guard to check if a trigger config is manual
 */
export const isManualTrigger = (
  config: TriggerConfig
): config is ManualTriggerConfig => {
  return config.type === "manual";
};

/**
 * Type guard to check if a trigger config is timer-based
 */
export const isTimerTrigger = (
  config: TriggerConfig
): config is TimerTriggerConfig => {
  return config.type === "timer";
};

/**
 * Type guard to check if a trigger config is event-based
 */
export const isEventTrigger = (
  config: TriggerConfig
): config is EventTriggerConfig => {
  return config.type === "event";
};

/**
 * Type guard to check if a trigger config is condition-based
 */
export const isConditionTrigger = (
  config: TriggerConfig
): config is ConditionTriggerConfig => {
  return config.type === "condition";
};

/**
 * Validate spawn data integrity
 */
export const validateSpawn = (
  spawn: Spawn
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!spawn.id || spawn.id.trim() === "") {
    errors.push("Spawn must have a valid ID");
  }

  if (!spawn.name || spawn.name.trim() === "") {
    errors.push("Spawn must have a name");
  }

  if (spawn.duration < 0) {
    errors.push("Spawn duration must be non-negative");
  }

  if (spawn.order < 0) {
    errors.push("Spawn order must be non-negative");
  }

  if (!spawn.trigger) {
    errors.push("Spawn must have a trigger configuration");
  }

  if (spawn.trigger && !spawn.trigger.config) {
    errors.push("Spawn trigger must have configuration");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate spawn profile data integrity
 */
export const validateSpawnProfile = (
  profile: SpawnProfile
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!profile.id || profile.id.trim() === "") {
    errors.push("Profile must have a valid ID");
  }

  if (!profile.name || profile.name.trim() === "") {
    errors.push("Profile must have a name");
  }

  if (profile.spawns.some((spawn) => !spawn.id || spawn.id.trim() === "")) {
    errors.push("All spawns in profile must have valid IDs");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
