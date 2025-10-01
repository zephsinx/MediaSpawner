/**
 * Data transformation utilities for converting between internal MediaSpawner data types
 * and the schema-compliant format required for Streamer.bot integration.
 *
 * These utilities handle complex data transformation while maintaining type safety
 * and data integrity throughout the conversion process.
 */

import type {
  SpawnProfile,
  Spawn,
  SpawnAsset,
  MediaAsset,
  Trigger,
  RandomizationBucket,
  MediaAssetProperties,
} from "../types";

/**
 * Exported data types matching the schema format
 */
export interface ExportedSpawnProfile {
  id: string;
  name: string;
  description?: string;
  workingDirectory: string;
  spawns: ExportedSpawn[];
  lastModified: string;
}

export interface ExportedSpawn {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: ExportedTrigger;
  duration: number;
  assets: ExportedSpawnAsset[];
  randomizationBuckets?: ExportedRandomizationBucket[];
}

export interface ExportedSpawnAsset {
  assetId: string;
  id: string;
  enabled: boolean;
  order: number;
  overrides?: {
    duration?: number;
    properties?: ExportedAssetSettings;
  };
}

export interface ExportedAsset {
  id: string;
  name: string;
  path: string;
  isUrl: boolean;
  type: "image" | "video" | "audio";
}

export interface ExportedTrigger {
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface ExportedRandomizationBucket {
  id: string;
  name: string;
  selection: "one" | "n";
  n?: number;
  weighted?: boolean;
  noImmediateRepeat?: boolean;
  members: Array<{
    spawnAssetId: string;
    weight?: number;
  }>;
}

export interface ExportedAssetSettings {
  volume?: number;
  width?: number;
  height?: number;
  scale?: number;
  positionMode?: "absolute" | "relative" | "centered";
  x?: number;
  y?: number;
  loop?: boolean;
  autoplay?: boolean;
  muted?: boolean;
}

/**
 * Transform internal spawn profile to exported format
 */
export function transformProfileToSchema(
  profile: SpawnProfile,
  workingDirectory: string
): ExportedSpawnProfile {
  return {
    id: profile.id,
    name: profile.name,
    description: profile.description || undefined,
    workingDirectory,
    spawns: profile.spawns.map((spawn) => transformSpawnToSchema(spawn)),
    lastModified: new Date(profile.lastModified).toISOString(),
  };
}

/**
 * Transform internal spawn to exported format
 */
export function transformSpawnToSchema(spawn: Spawn): ExportedSpawn {
  return {
    id: spawn.id,
    name: spawn.name,
    description: spawn.description || undefined,
    enabled: spawn.enabled,
    trigger: transformTriggerToSchema(spawn.trigger),
    duration: spawn.duration,
    assets: spawn.assets.map((asset) => transformSpawnAssetToSchema(asset)),
    randomizationBuckets: spawn.randomizationBuckets?.map((bucket) =>
      transformRandomizationBucketToSchema(bucket)
    ),
  };
}

/**
 * Transform internal spawn asset to exported format
 */
export function transformSpawnAssetToSchema(
  asset: SpawnAsset
): ExportedSpawnAsset {
  return {
    assetId: asset.assetId,
    id: asset.id,
    enabled: asset.enabled,
    order: asset.order,
    overrides:
      asset.overrides.duration || asset.overrides.properties
        ? {
            duration: asset.overrides.duration,
            properties: asset.overrides.properties
              ? transformAssetSettingsToSchema(asset.overrides.properties)
              : undefined,
          }
        : undefined,
  };
}

/**
 * Transform internal asset to exported format
 */
export function transformAssetToSchema(asset: MediaAsset): ExportedAsset {
  return {
    id: asset.id,
    name: asset.name,
    path: asset.path,
    isUrl: asset.isUrl,
    type: asset.type,
  };
}

/**
 * Transform internal trigger to exported format
 */
export function transformTriggerToSchema(trigger: Trigger): ExportedTrigger {
  return {
    type: trigger.type,
    enabled: trigger.enabled ?? true,
    config: trigger.config || {},
  };
}

/**
 * Transform internal randomization bucket to exported format
 */
export function transformRandomizationBucketToSchema(
  bucket: RandomizationBucket
): ExportedRandomizationBucket {
  return {
    id: bucket.id,
    name: bucket.name,
    selection: bucket.selection,
    n: bucket.n,
    weighted: bucket.weighted || undefined,
    noImmediateRepeat: bucket.noImmediateRepeat || undefined,
    members: bucket.members.map((member) => ({
      spawnAssetId: member.spawnAssetId,
      weight: member.weight || undefined,
    })),
  };
}

/**
 * Transform internal asset settings to exported format
 */
export function transformAssetSettingsToSchema(
  settings: Partial<MediaAssetProperties>
): ExportedAssetSettings {
  // Handle scale conversion for backward compatibility
  let scaleValue: number | undefined;
  if (typeof settings.scale === "number") {
    scaleValue = settings.scale;
  } else if (settings.scale && typeof settings.scale === "object") {
    // For ScaleObject, use the x value for backward compatibility
    scaleValue = settings.scale.x;
  }

  return {
    volume: settings.volume,
    width: settings.dimensions?.width,
    height: settings.dimensions?.height,
    scale: scaleValue,
    positionMode: settings.positionMode,
    x: settings.position?.x,
    y: settings.position?.y,
    loop: settings.loop,
    autoplay: settings.autoplay,
    muted: settings.muted,
  };
}

/**
 * Transform imported profile back to internal format
 */
export function transformProfileFromSchema(
  profile: ExportedSpawnProfile
): SpawnProfile {
  return {
    id: profile.id,
    name: profile.name,
    description: profile.description,
    spawns: profile.spawns.map((spawn) => transformSpawnFromSchema(spawn)),
    lastModified: new Date(profile.lastModified).getTime(),
    isActive: false, // Imported profiles are not active by default
  };
}

/**
 * Transform imported spawn back to internal format
 */
export function transformSpawnFromSchema(spawn: ExportedSpawn): Spawn {
  // Handle legacy data that may still contain defaultProperties by ignoring it
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultProperties: _ } = spawn as ExportedSpawn & {
    defaultProperties?: unknown;
  };

  return {
    id: spawn.id,
    name: spawn.name,
    description: spawn.description,
    enabled: spawn.enabled,
    trigger: transformTriggerFromSchema(spawn.trigger),
    duration: spawn.duration,
    assets: spawn.assets.map((asset) => transformSpawnAssetFromSchema(asset)),
    randomizationBuckets: spawn.randomizationBuckets?.map((bucket) =>
      transformRandomizationBucketFromSchema(bucket)
    ),
    lastModified: Date.now(),
    order: 0, // Will be set by the service when adding to profile
  };
}

/**
 * Transform imported spawn asset back to internal format
 */
export function transformSpawnAssetFromSchema(
  asset: ExportedSpawnAsset
): SpawnAsset {
  return {
    assetId: asset.assetId,
    id: asset.id,
    enabled: asset.enabled,
    order: asset.order,
    overrides: asset.overrides
      ? {
          duration: asset.overrides.duration,
          properties: asset.overrides.properties
            ? transformAssetSettingsFromSchema(asset.overrides.properties)
            : undefined,
        }
      : {},
  };
}

/**
 * Transform imported asset back to internal format
 */
export function transformAssetFromSchema(asset: ExportedAsset): MediaAsset {
  return {
    id: asset.id,
    name: asset.name,
    path: asset.path,
    isUrl: asset.isUrl,
    type: asset.type,
  };
}

/**
 * Transform imported trigger back to internal format
 */
export function transformTriggerFromSchema(trigger: ExportedTrigger): Trigger {
  return {
    type: trigger.type as Trigger["type"],
    enabled: trigger.enabled,
    config: trigger.config as Trigger["config"],
  } as Trigger;
}

/**
 * Transform imported randomization bucket back to internal format
 */
export function transformRandomizationBucketFromSchema(
  bucket: ExportedRandomizationBucket
): RandomizationBucket {
  return {
    id: bucket.id,
    name: bucket.name,
    selection: bucket.selection,
    n: bucket.n,
    weighted: bucket.weighted,
    noImmediateRepeat: bucket.noImmediateRepeat,
    members: bucket.members.map((member) => ({
      spawnAssetId: member.spawnAssetId,
      weight: member.weight,
    })),
  };
}

/**
 * Transform imported asset settings back to internal format
 */
export function transformAssetSettingsFromSchema(
  settings: ExportedAssetSettings
): Partial<MediaAssetProperties> {
  const result: Partial<MediaAssetProperties> = {};

  if (settings.volume !== undefined) result.volume = settings.volume;
  if (settings.scale !== undefined) result.scale = settings.scale;
  if (settings.positionMode !== undefined)
    result.positionMode = settings.positionMode;
  if (settings.loop !== undefined) result.loop = settings.loop;
  if (settings.autoplay !== undefined) result.autoplay = settings.autoplay;
  if (settings.muted !== undefined) result.muted = settings.muted;

  if (settings.width !== undefined || settings.height !== undefined) {
    result.dimensions = {
      width: settings.width ?? 100,
      height: settings.height ?? 100,
    };
  }

  if (settings.x !== undefined || settings.y !== undefined) {
    result.position = {
      x: settings.x ?? 0,
      y: settings.y ?? 0,
    };
  }

  return result;
}

/**
 * Normalize working directory path for consistent handling
 */
export function normalizeWorkingDirectory(path: string): string {
  if (!path) return "";

  // Normalize path separators and remove trailing slashes
  const normalized = path.replace(/[\\/]+/g, "/").replace(/\/$/, "");

  // Ensure absolute paths start with proper separator
  if (
    normalized &&
    !normalized.startsWith("/") &&
    !normalized.match(/^[A-Za-z]:/)
  ) {
    return "/" + normalized;
  }

  return normalized;
}

/**
 * Convert Unix timestamp to ISO string
 */
export function timestampToIsoString(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Convert ISO string to Unix timestamp
 */
export function isoStringToTimestamp(isoString: string): number {
  return new Date(isoString).getTime();
}

/**
 * Validate that a timestamp is valid
 */
export function isValidTimestamp(timestamp: number): boolean {
  return !isNaN(timestamp) && isFinite(timestamp) && timestamp > 0;
}

/**
 * Validate that an ISO string is valid
 */
export function isValidIsoString(isoString: string): boolean {
  const date = new Date(isoString);
  return !isNaN(date.getTime()) && date.toISOString() === isoString;
}
