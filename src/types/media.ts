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
  width?: number;
  height?: number;
}

/**
 * Position interface for x and y coordinates
 */
export interface Position {
  x?: number;
  y?: number;
}

/**
 * Scale object interface for non-uniform scaling
 */
export interface ScaleObject {
  /** X-axis scale factor */
  x?: number;
  /** Y-axis scale factor */
  y?: number;
  /** Whether X and Y scales are linked (UI hint) */
  linked?: boolean;
}

/**
 * Crop settings interface for image/video cropping
 */
export interface CropSettings {
  /** Left crop amount in pixels */
  left?: number;
  /** Top crop amount in pixels */
  top?: number;
  /** Right crop amount in pixels */
  right?: number;
  /** Bottom crop amount in pixels */
  bottom?: number;
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
