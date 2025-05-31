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
 * Normalizes a file path by converting backslashes to forward slashes
 * and ensuring consistent path separators
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Checks if a local file path is within the working directory
 */
function isPathInWorkingDirectory(
  filePath: string,
  workingDirectory: string
): boolean {
  if (!workingDirectory.trim()) {
    return false;
  }

  const normalizedFilePath = normalizePath(filePath).toLowerCase();
  const normalizedWorkingDir = normalizePath(workingDirectory).toLowerCase();

  // Ensure working directory ends with a slash for proper comparison
  const workingDirWithSlash = normalizedWorkingDir.endsWith("/")
    ? normalizedWorkingDir
    : `${normalizedWorkingDir}/`;

  return normalizedFilePath.startsWith(workingDirWithSlash);
}

/**
 * Extracts the filename from a file path
 */
function getFileName(path: string): string {
  const normalizedPath = normalizePath(path);
  const lastSlashIndex = normalizedPath.lastIndexOf("/");
  return lastSlashIndex !== -1
    ? normalizedPath.substring(lastSlashIndex + 1)
    : normalizedPath;
}

/**
 * Computes a user-friendly display path for an asset
 *
 * For URL assets: Returns the path unchanged
 * For local assets within working directory: Returns <working_directory\...\filename>
 * For local assets outside working directory: Returns full path with error message when working directory is set
 *
 * @param assetPath - The full path or URL of the asset
 * @returns The computed display path
 *
 * @example
 * // With working directory: "C:/StreamAssets"
 * computeDisplayPath("C:/StreamAssets/subfolder/image.jpg")
 * // Returns: "C:/StreamAssets\...\image.jpg"
 *
 * computeDisplayPath("https://example.com/image.jpg")
 * // Returns: "https://example.com/image.jpg"
 *
 * computeDisplayPath("D:/OtherFolder/image.jpg")
 * // Returns: "⚠️ D:/OtherFolder/image.jpg (outside working directory)"
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

  // If the file is within the working directory, create shortened display
  if (isPathInWorkingDirectory(assetPath, workingDirectory)) {
    const fileName = getFileName(assetPath);
    // Use backslash in display to match Windows convention for shortened paths
    return `${workingDirectory}\\...\\${fileName}`;
  }

  // For files outside working directory when working directory is set, show full path with error
  return `⚠️ ${assetPath} (outside working directory)`;
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

    // If the file is within the working directory, create shortened display
    if (isPathInWorkingDirectory(assetPath, workingDirectory)) {
      const fileName = getFileName(assetPath);
      return `${workingDirectory}\\...\\${fileName}`;
    }

    // For files outside working directory when working directory is set, show full path with error
    return `⚠️ ${assetPath} (outside working directory)`;
  });
}
