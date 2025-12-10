import type { MediaAssetProperties } from "./media";
import moment from "moment-timezone/builds/moment-timezone-with-data-1970-2030";

export type Trigger = { enabled?: boolean } & (
  | { type: "manual"; config: Record<string, never> }
  | {
      type: "time.atDateTime";
      config: { isoDateTime: string; timezone: string };
    }
  | {
      type: "time.dailyAt";
      config: { time: string; timezone: string };
    }
  | {
      type: "time.weeklyAt";
      config: { daysOfWeek: number[]; time: string; timezone: string };
    }
  | {
      type: "time.monthlyOn";
      config: { dayOfMonth: number; time: string; timezone: string };
    }
  | {
      type: "time.everyNMinutes";
      config: {
        intervalMinutes: number;
        timezone: string;
        anchor?:
          | { kind: "topOfHour" }
          | { kind: "custom"; isoDateTime: string; timezone: string };
      };
    }
  | {
      type: "time.minuteOfHour";
      config: { minute: number; timezone: string };
    }
  | {
      type: "streamerbot.command";
      config: {
        commandId?: string;
        aliases?: string[];
        caseSensitive?: boolean;
        ignoreInternal?: boolean;
        ignoreBotAccount?: boolean;
      };
    }
  | { type: "twitch.follow"; config: Record<string, never> }
  | {
      type: "twitch.cheer";
      config: { bits?: number; bitsComparator?: "lt" | "eq" | "gt" };
    }
  | {
      type: "twitch.subscription";
      config: {
        tier?: "1000" | "2000" | "3000";
        months?: number;
        monthsComparator?: "lt" | "eq" | "gt";
      };
    }
  | {
      type: "twitch.giftSub";
      config: { minCount?: number; tier?: "1000" | "2000" | "3000" };
    }
  | {
      type: "twitch.channelPointReward";
      config: {
        rewardIdentifier?: string;
        useViewerInput?: boolean;
        statuses?: string[];
      };
    }
);

export type TriggerType = Trigger["type"];

export const getDefaultTrigger = (type: TriggerType): Trigger => {
  switch (type) {
    case "manual":
      return {
        type: "manual",
        enabled: true,
        config: {} as Record<string, never>,
      };
    case "time.atDateTime": {
      const now = new Date();
      const oneHourMs = 60 * 60 * 1000;
      const future = new Date(now.getTime() + oneHourMs).toISOString();
      return {
        type: "time.atDateTime",
        enabled: true,
        config: { isoDateTime: future, timezone: moment.tz.guess() },
      };
    }
    case "time.dailyAt":
      return {
        type: "time.dailyAt",
        enabled: true,
        config: { time: "09:00", timezone: moment.tz.guess() },
      };
    case "time.weeklyAt":
      return {
        type: "time.weeklyAt",
        enabled: true,
        config: { daysOfWeek: [1], time: "09:00", timezone: moment.tz.guess() },
      };
    case "time.monthlyOn":
      return {
        type: "time.monthlyOn",
        enabled: true,
        config: { dayOfMonth: 1, time: "09:00", timezone: moment.tz.guess() },
      };
    case "time.everyNMinutes":
      return {
        type: "time.everyNMinutes",
        enabled: true,
        config: {
          intervalMinutes: 15,
          timezone: moment.tz.guess(),
          anchor: { kind: "topOfHour" },
        },
      };
    case "time.minuteOfHour":
      return {
        type: "time.minuteOfHour",
        enabled: true,
        config: { minute: 0, timezone: moment.tz.guess() },
      };
    case "streamerbot.command":
      return {
        type: "streamerbot.command",
        enabled: true,
        config: {
          aliases: [""],
          caseSensitive: false,
          ignoreInternal: false,
          ignoreBotAccount: true,
        },
      };
    case "twitch.follow":
      return {
        type: "twitch.follow",
        enabled: true,
        config: {} as Record<string, never>,
      };
    case "twitch.subscription":
      return {
        type: "twitch.subscription",
        enabled: true,
        config: {} as Record<string, never>,
      };
    case "twitch.giftSub":
      return {
        type: "twitch.giftSub",
        enabled: true,
        config: {} as Record<string, never>,
      };
    case "twitch.channelPointReward":
      return {
        type: "twitch.channelPointReward",
        enabled: true,
        config: {
          rewardIdentifier: "",
          useViewerInput: false,
          statuses: ["fulfilled"],
        },
      };
    case "twitch.cheer":
      return {
        type: "twitch.cheer",
        enabled: true,
        config: {},
      };
  }
};

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

  /** Override asset's default properties */
  properties?: Partial<MediaAssetProperties>;

  /** Custom spawn-specific settings */
  customSettings?: Record<string, unknown>;
}

/**
 * Bucket-based randomization configuration for selective asset spawning.
 * Keeping this separate from assets preserves existing override semantics while
 * allowing flexible selection rules without nesting the asset list.
 */
export interface RandomizationBucketMember {
  /** Reference to a spawn asset included in the bucket */
  spawnAssetId: string;
  /** Optional weight used when weighted selection is enabled */
  weight?: number;
}

export interface RandomizationBucket {
  /** Unique identifier for the bucket */
  id: string;
  /** Human-readable name for the bucket */
  name: string;
  /** Selection strategy for this bucket */
  selection: "one" | "n";
  /** Number of members to select when selection is "n" */
  n?: number;
  /** Whether to use weights when selecting */
  weighted?: boolean;
  /** Hint to avoid selecting the same member(s) consecutively */
  noImmediateRepeat?: boolean;
  /** Members of this bucket, each referencing a spawn asset */
  members: RandomizationBucketMember[];
}

/**
 * Core spawn interface representing a collection of assets with shared behavior
 *
 * Spawns are the primary unit of work in the spawn-centric architecture.
 * Each spawn has a default duration that its assets inherit, with the ability
 * for individual assets to override this default.
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
  trigger: Trigger;

  /** Default duration for assets in this spawn (milliseconds) */
  duration: number;

  /** Array of spawn-specific asset instances */
  assets: SpawnAsset[];

  /** Optional randomization buckets for selective member selection */
  randomizationBuckets?: RandomizationBucket[];

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

  /** Optional working directory override for this profile */
  workingDirectory?: string;

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
export const createSpawnTrigger = (type: TriggerType = "manual"): Trigger => {
  return getDefaultTrigger(type);
};

/**
 * Get default trigger configuration based on trigger type
 */
export const getDefaultTriggerConfig = (
  type: TriggerType,
): Trigger["config"] => {
  return getDefaultTrigger(type).config;
};

/**
 * Helper function to create a new spawn asset instance
 */
export const createSpawnAsset = (
  assetId: string,
  order: number,
  overrides?: Partial<SpawnAssetOverrides>,
  id?: string,
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
  id?: string,
): Spawn => {
  return {
    id: id || crypto.randomUUID(),
    name,
    description,
    enabled: true,
    trigger: createSpawnTrigger(),
    duration: 5000,
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
  id?: string,
  workingDirectory?: string,
): SpawnProfile => {
  return {
    id: id || crypto.randomUUID(),
    name,
    description,
    workingDirectory,
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
  profile: SpawnProfile,
): SpawnProfile => {
  return {
    ...profile,
    lastModified: Date.now(),
  };
};

// Legacy type guards removed; triggers now follow the MS-50 union model

/**
 * Validate spawn data integrity
 */
export const validateSpawn = (
  spawn: Spawn,
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

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate spawn profile data integrity
 */
export const validateSpawnProfile = (
  profile: SpawnProfile,
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

  // Validate working directory if provided
  if (profile.workingDirectory && profile.workingDirectory.trim() !== "") {
    const path = profile.workingDirectory.trim();
    // Check for invalid characters in Windows paths
    const invalidChars = /[<>"|?*]/;
    if (invalidChars.test(path)) {
      errors.push("Working directory contains invalid characters");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
