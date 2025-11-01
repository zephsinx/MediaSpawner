import type { MediaAsset } from "../types/media";

/**
 * File extension mappings for different asset types
 */
const ASSET_TYPE_EXTENSIONS = {
  image: [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "ico",
    "tiff",
    "tif",
  ],
  video: [
    "mp4",
    "webm",
    "mov",
    "avi",
    "mkv",
    "flv",
    "wmv",
    "m4v",
    "3gp",
    "ogv",
  ],
  audio: ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma", "opus", "m4r"],
} as const;

/**
 * MIME type mappings for different asset types
 */
const ASSET_TYPE_MIMES = {
  image: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/svg+xml",
    "image/x-icon",
    "image/tiff",
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/x-flv",
    "video/x-ms-wmv",
    "video/3gpp",
    "video/ogg",
  ],
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/ogg",
    "audio/mp4",
    "audio/aac",
    "audio/x-flac",
    "audio/x-ms-wma",
    "audio/opus",
  ],
} as const;

function extractExtension(path: string): string {
  try {
    const url = new URL(path);
    if (url.protocol === "http:" || url.protocol === "https:") {
      const pathname = url.pathname;
      const lastDot = pathname.lastIndexOf(".");
      if (lastDot !== -1) {
        const afterDot = pathname.substring(lastDot + 1);
        const slashIndex = afterDot.indexOf("/");
        if (slashIndex !== -1) {
          return afterDot.substring(0, slashIndex).toLowerCase();
        }
        return afterDot.toLowerCase();
      }
    }
  } catch {
    // continue to file path logic on error
  }

  const cleanPath = path.split("?")[0].split("#")[0];

  const lastDot = cleanPath.lastIndexOf(".");
  const lastSlash = Math.max(
    cleanPath.lastIndexOf("/"),
    cleanPath.lastIndexOf("\\"),
  );

  if (lastDot > lastSlash && lastDot !== -1) {
    return cleanPath.slice(lastDot + 1).toLowerCase();
  }
  return "";
}

/**
 * Detect asset type from file path based on extension
 */
export function detectAssetTypeFromPath(path: string): MediaAsset["type"] {
  const extension = extractExtension(path);

  if ((ASSET_TYPE_EXTENSIONS.image as readonly string[]).includes(extension)) {
    return "image";
  }
  if ((ASSET_TYPE_EXTENSIONS.video as readonly string[]).includes(extension)) {
    return "video";
  }
  if ((ASSET_TYPE_EXTENSIONS.audio as readonly string[]).includes(extension)) {
    return "audio";
  }

  // Default fallback to image
  return "image";
}

/**
 * Detect asset type from MIME type
 */
export function detectAssetTypeFromMime(mimeType: string): MediaAsset["type"] {
  const normalizedMime = mimeType.toLowerCase().split(";")[0].trim();

  if ((ASSET_TYPE_MIMES.image as readonly string[]).includes(normalizedMime)) {
    return "image";
  }
  if ((ASSET_TYPE_MIMES.video as readonly string[]).includes(normalizedMime)) {
    return "video";
  }
  if ((ASSET_TYPE_MIMES.audio as readonly string[]).includes(normalizedMime)) {
    return "audio";
  }

  // Default fallback to image
  return "image";
}

/**
 * Unified asset type detection from path or MIME type
 * Tries path detection first, falls back to MIME if provided
 */
export function detectAssetType(
  pathOrMime: string,
  fallback: MediaAsset["type"] = "image",
): MediaAsset["type"] {
  // Try path detection first
  if (
    pathOrMime.includes(".") ||
    pathOrMime.includes("/") ||
    pathOrMime.includes("\\")
  ) {
    const typeFromPath = detectAssetTypeFromPath(pathOrMime);
    if (typeFromPath) return typeFromPath;
  }

  // Try MIME type detection
  if (pathOrMime.includes("/")) {
    const typeFromMime = detectAssetTypeFromMime(pathOrMime);
    if (typeFromMime) return typeFromMime;
  }

  return fallback;
}

/**
 * Get all supported file extensions for a specific asset type or all types
 */
export function getSupportedExtensions(type?: MediaAsset["type"]): string[] {
  if (type) {
    return [...ASSET_TYPE_EXTENSIONS[type]];
  }

  return Object.values(ASSET_TYPE_EXTENSIONS).flat();
}

/**
 * Check if a file path has a supported extension
 */
export function isValidAssetPath(path: string): boolean {
  const extension = extractExtension(path);
  return getSupportedExtensions().includes(extension);
}

/**
 * Get all supported MIME types for a specific asset type or all types
 */
export function getSupportedMimeTypes(type?: MediaAsset["type"]): string[] {
  if (type) {
    return [...ASSET_TYPE_MIMES[type]];
  }

  return Object.values(ASSET_TYPE_MIMES).flat();
}

/**
 * Check if a MIME type is supported
 */
export function isValidMimeType(mimeType: string): boolean {
  const normalizedMime = mimeType.toLowerCase().split(";")[0].trim();
  return getSupportedMimeTypes().includes(normalizedMime);
}
