/**
 * Media asset types and interfaces for MediaSpawner
 */

/**
 * Core media asset interface representing a single media file with configurable properties
 */
export interface MediaAsset {
  /** Unique identifier for the asset */
  id: string;

  /** Type of media asset */
  type: "image" | "video" | "audio";

  /** Human-readable name for the asset */
  name: string;

  /** URL or local file reference path */
  path: string;

  /** Whether this asset is a URL (true) or local file (false) */
  isUrl: boolean;
}

/**
 * Properties that can be configured for media assets
 */
export interface MediaAssetProperties {
  /** Dimensions for images and videos */
  dimensions?: Dimensions;

  /** Position coordinates for images and videos */
  position?: Position;

  /** Scale factor for images and videos (1.0 = 100%) - supports both uniform and non-uniform scaling */
  scale?: number | ScaleObject;

  /** Positioning mode for images and videos */
  positionMode?: "absolute" | "relative" | "centered";

  /** Volume level for videos and audio (0-1) */
  volume?: number;

  /** Whether the asset should loop for videos and audio */
  loop?: boolean;

  /** Whether audio should start muted */
  muted?: boolean;

  /** Rotation angle for images and videos (0-360 degrees) */
  rotation?: number;

  /** Crop settings for images and videos */
  crop?: CropSettings;

  /** Alignment option for scene items */
  alignment?: AlignmentOption;

  /** Bounds type for scene item scaling */
  boundsType?: BoundsType;

  /** Bounds alignment for scene item scaling */
  boundsAlignment?: AlignmentOption;

  /** Audio monitoring type for OBS audio sources (audio/video only) */
  monitorType?: MonitorType;

  /** Generate random coordinates on each spawn execution (images/videos only). When enabled, uses absolute positioning and respects dimensions to keep asset on-screen. */
  randomCoordinates?: boolean;
}

/**
 * Dimensions interface for width and height
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Position interface for x and y coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Scale object interface for non-uniform scaling
 */
export interface ScaleObject {
  /** X-axis scale factor */
  x: number;
  /** Y-axis scale factor */
  y: number;
  /** Whether X and Y scales are linked (UI hint) */
  linked?: boolean;
}

/**
 * Crop settings interface for image/video cropping
 */
export interface CropSettings {
  /** Left crop amount in pixels */
  left: number;
  /** Top crop amount in pixels */
  top: number;
  /** Right crop amount in pixels */
  right: number;
  /** Bottom crop amount in pixels */
  bottom: number;
}

/**
 * OBS bounds type options for scene item scaling
 */
export type BoundsType =
  | "OBS_BOUNDS_NONE"
  | "OBS_BOUNDS_STRETCH"
  | "OBS_BOUNDS_SCALE_INNER"
  | "OBS_BOUNDS_SCALE_OUTER"
  | "OBS_BOUNDS_SCALE_TO_WIDTH"
  | "OBS_BOUNDS_SCALE_TO_HEIGHT"
  | "OBS_BOUNDS_MAX_ONLY";

/**
 * OBS alignment options for scene items
 */
export type AlignmentOption =
  | 0 // Top Left
  | 1 // Top Center
  | 2 // Top Right
  | 4 // Center Left
  | 5 // Center
  | 6 // Center Right
  | 8 // Bottom Left
  | 9 // Bottom Center
  | 10; // Bottom Right

/**
 * Audio monitoring types for OBS WebSocket
 */
export type MonitorType = "none" | "monitor-only" | "monitor-and-output";

/**
 * Asset group interface representing a collection of media assets with shared configuration
 */
export interface AssetGroup {
  /** Unique identifier for the asset group */
  id: string;

  /** Human-readable name for the group */
  name: string;

  /** Array of media assets in this group */
  assets: MediaAsset[];

  /** Randomization configuration for the group */
  randomization: RandomizationConfig;

  /** Display duration for the group in milliseconds */
  duration: number;
}

/**
 * Configuration interface representing a complete media spawner setup
 */
export interface Configuration {
  /** Unique identifier for the configuration */
  id: string;

  /** Human-readable name for the configuration */
  name: string;

  /** Optional description of the configuration */
  description?: string;

  /** Array of asset groups in this configuration */
  groups: AssetGroup[];

  /** Timestamp of last modification (Unix timestamp in milliseconds) */
  lastModified: number;
}

/**
 * Configuration for randomization behavior within an asset group
 */
export interface RandomizationConfig {
  /** Whether randomization is enabled for this group */
  enabled: boolean;

  /** How many assets to select from the group */
  assetSelection: "one" | "all";

  /** Position randomization configuration */
  position?: PositionRandomization;

  /** Dimensions randomization configuration */
  dimensions?: DimensionsRandomization;

  /** Volume randomization configuration */
  volume?: VolumeRandomization;
}

/**
 * Position randomization bounds
 */
export interface PositionRandomization {
  /** Whether position randomization is enabled */
  enabled: boolean;

  /** Boundary constraints for random positioning */
  bounds: PositionBounds;
}

/**
 * Position boundary constraints
 */
export interface PositionBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Dimensions randomization configuration
 */
export interface DimensionsRandomization {
  /** Whether dimensions randomization is enabled */
  enabled: boolean;

  /** Width constraints */
  width: NumberRange;

  /** Height constraints */
  height: NumberRange;
}

/**
 * Volume randomization configuration
 */
export interface VolumeRandomization {
  /** Whether volume randomization is enabled */
  enabled: boolean;

  /** Volume range (0-1) */
  range: NumberRange;
}

/**
 * Generic number range interface
 */
export interface NumberRange {
  min: number;
  max: number;
}

/**
 * Type guard to check if an asset is an image
 */
export const isImageAsset = (asset: MediaAsset): boolean => {
  return asset.type === "image";
};

/**
 * Type guard to check if an asset is a video
 */
export const isVideoAsset = (asset: MediaAsset): boolean => {
  return asset.type === "video";
};

/**
 * Type guard to check if an asset is audio
 */
export const isAudioAsset = (asset: MediaAsset): boolean => {
  return asset.type === "audio";
};

/**
 * Check if a path is a URL
 */
export const isUrlPath = (path: string): boolean => {
  return path.startsWith("http://") || path.startsWith("https://");
};

/**
 * Extract filename from a path (local or URL)
 */
export const extractFilename = (path: string): string => {
  // Extract filename from URL or local path
  const filename = path.split(/[/\\]/).pop() || "";
  return filename.split("?")[0]; // Remove query parameters from URLs
};

/**
 * Process path for storage based on whether it's a URL or local file
 * URLs (http/https) are stored as full URLs, local files store only the filename
 */
export const processAssetPath = (
  path: string,
): { storedPath: string; isUrl: boolean } => {
  const isUrl = isUrlPath(path);

  if (isUrl) {
    // Store full URL for web assets
    return { storedPath: path, isUrl: true };
  } else {
    // Store filename only for local files (relative to working directory)
    const filename = extractFilename(path);
    return { storedPath: filename, isUrl: false };
  }
};

/**
 * Helper function to create a new media asset with default properties
 */
export const createMediaAsset = (
  type: MediaAsset["type"],
  name: string,
  path: string,
  id?: string,
): MediaAsset => {
  const { storedPath, isUrl } = processAssetPath(path);

  return {
    id: id || crypto.randomUUID(),
    type,
    name,
    path: storedPath,
    isUrl,
  };
};

/**
 * Get default properties for a given asset type
 */
// Removed base asset default properties: assets no longer carry behavioral properties

/**
 * Helper function to create a new asset group with default configuration
 */
export const createAssetGroup = (
  name: string,
  assets: MediaAsset[] = [],
  id?: string,
): AssetGroup => {
  return {
    id: id || crypto.randomUUID(),
    name,
    assets,
    randomization: getDefaultRandomizationConfig(),
    duration: 5000, // Default 5 seconds
  };
};

/**
 * Get default randomization configuration
 */
export const getDefaultRandomizationConfig = (): RandomizationConfig => {
  return {
    enabled: false,
    assetSelection: "one",
    position: {
      enabled: false,
      bounds: {
        minX: 0,
        maxX: 1920, // Assume 1080p default
        minY: 0,
        maxY: 1080,
      },
    },
    dimensions: {
      enabled: false,
      width: { min: 50, max: 500 },
      height: { min: 50, max: 500 },
    },
    volume: {
      enabled: false,
      range: { min: 0, max: 1 },
    },
  };
};

/**
 * Check if an asset group has any assets
 */
export const hasAssets = (group: AssetGroup): boolean => {
  return group.assets.length > 0;
};

/**
 * Get all unique asset types in a group
 */
export const getAssetTypesInGroup = (
  group: AssetGroup,
): MediaAsset["type"][] => {
  const types = new Set(group.assets.map((asset) => asset.type));
  return Array.from(types);
};

/**
 * Check if randomization is configured for any property
 */
export const hasRandomizationEnabled = (group: AssetGroup): boolean => {
  const { randomization } = group;
  return (
    randomization.enabled &&
    (randomization.position?.enabled === true ||
      randomization.dimensions?.enabled === true ||
      randomization.volume?.enabled === true)
  );
};

/**
 * Helper function to create a new configuration
 */
export const createConfiguration = (
  name: string,
  description?: string,
  groups: AssetGroup[] = [],
  id?: string,
): Configuration => {
  return {
    id: id || crypto.randomUUID(),
    name,
    description,
    groups,
    lastModified: Date.now(),
  };
};

/**
 * Update the lastModified timestamp for a configuration
 */
export const updateConfigurationTimestamp = (
  config: Configuration,
): Configuration => {
  return {
    ...config,
    lastModified: Date.now(),
  };
};

/**
 * Check if a configuration has any asset groups
 */
export const hasGroups = (config: Configuration): boolean => {
  return config.groups.length > 0;
};

/**
 * Get total number of assets across all groups in a configuration
 */
export const getTotalAssetCount = (config: Configuration): number => {
  return config.groups.reduce((total, group) => total + group.assets.length, 0);
};

/**
 * Get all unique asset types across all groups in a configuration
 */
export const getAssetTypesInConfiguration = (
  config: Configuration,
): MediaAsset["type"][] => {
  const allTypes = config.groups.flatMap((group) =>
    group.assets.map((asset) => asset.type),
  );
  const uniqueTypes = new Set(allTypes);
  return Array.from(uniqueTypes);
};

/**
 * Check if any group in the configuration has randomization enabled
 */
export const hasAnyRandomization = (config: Configuration): boolean => {
  return config.groups.some((group) => hasRandomizationEnabled(group));
};

/**
 * Get the total estimated duration of a configuration (sum of all group durations)
 */
export const getConfigurationDuration = (config: Configuration): number => {
  return config.groups.reduce((total, group) => total + group.duration, 0);
};

/**
 * Clone a configuration with a new ID and updated timestamp
 */
export const cloneConfiguration = (
  config: Configuration,
  newName?: string,
): Configuration => {
  return {
    ...config,
    id: crypto.randomUUID(),
    name: newName || `${config.name} (Copy)`,
    lastModified: Date.now(),
    groups: config.groups.map((group) => ({
      ...group,
      id: crypto.randomUUID(),
      assets: group.assets.map((asset) => ({
        ...asset,
        id: crypto.randomUUID(),
      })),
    })),
  };
};
