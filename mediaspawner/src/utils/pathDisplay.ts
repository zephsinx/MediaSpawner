import { SettingsService } from "../services/settingsService";

/**
 * Utility functions for displaying asset paths in a user-friendly format
 */

/**
 * Checks if a path is a URL (starts with http:// or https://)
 */
function isUrl(path: string): boolean {
  return /^https?:\/\//.test(path);
}

/**
 * Extracts the filename from a file path
 */
function getFileName(path: string): string {
  const normalizedPath = path.replace(/\\/g, "/");
  const lastSlashIndex = normalizedPath.lastIndexOf("/");
  return lastSlashIndex !== -1
    ? normalizedPath.substring(lastSlashIndex + 1)
    : normalizedPath;
}

/**
 * Computes a user-friendly display path for an asset
 *
 * For URL assets: Returns the path unchanged
 * For local assets: Returns <working_directory\...\filename> format when working directory is set
 *
 * @param assetPath - The full path or URL of the asset
 * @returns The computed display path
 *
 * @example
 * // With working directory: "C:/StreamAssets"
 * computeDisplayPath("image.jpg")
 * // Returns: "C:/StreamAssets\...\image.jpg"
 *
 * computeDisplayPath("https://example.com/image.jpg")
 * // Returns: "https://example.com/image.jpg"
 */
export function computeDisplayPath(assetPath: string): string {
  // Return URLs unchanged
  if (isUrl(assetPath)) {
    return assetPath;
  }

  // Get current working directory from settings
  const settings = SettingsService.getSettings();
  const workingDirectory = settings.workingDirectory;

  // If no working directory is set, return path unchanged
  if (!workingDirectory.trim()) {
    return assetPath;
  }

  // For local files, assume they're in the working directory and create shortened display
  const fileName = getFileName(assetPath);
  // Use backslash in display to match Windows convention for shortened paths
  return `${workingDirectory}\\...\\${fileName}`;
}

/**
 * Batch version of computeDisplayPath for processing multiple paths efficiently
 *
 * @param assetPaths - Array of asset paths to process
 * @returns Array of computed display paths in the same order
 */
export function computeDisplayPaths(assetPaths: string[]): string[] {
  // Get settings once for efficiency
  const settings = SettingsService.getSettings();
  const workingDirectory = settings.workingDirectory;

  return assetPaths.map((assetPath) => {
    // Return URLs unchanged
    if (isUrl(assetPath)) {
      return assetPath;
    }

    // If no working directory is set, return path unchanged
    if (!workingDirectory.trim()) {
      return assetPath;
    }

    // For local files, assume they're in the working directory and create shortened display
    const fileName = getFileName(assetPath);
    return `${workingDirectory}\\...\\${fileName}`;
  });
}
