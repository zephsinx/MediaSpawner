/**
 * File download utilities for MediaSpawner
 * Provides functions to download JSON files using the Blob API
 */

/**
 * Downloads a JSON file with the given data and filename
 * @param data - The data object to be serialized as JSON
 * @param filename - The desired filename (without extension)
 * @returns Promise that resolves when download is complete or rejects on error
 */
export async function downloadJsonFile(
  data: unknown,
  filename: string,
): Promise<void> {
  try {
    // Serialize data to JSON with proper formatting
    const jsonString = JSON.stringify(data, null, 2);

    // Create Blob with proper MIME type
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create temporary URL for the blob
    const url = URL.createObjectURL(blob);

    // Create temporary anchor element
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filename}.json`;

    // Append to DOM temporarily (required for some browsers)
    document.body.appendChild(anchor);

    // Trigger download
    anchor.click();

    // Clean up
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(
      `Failed to download file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Generates a timestamped filename for exports
 * @param baseName - The base name for the file
 * @returns A filename with timestamp in format: baseName_YYYY-MM-DD_HH-MM-SS
 */
export function generateTimestampedFilename(baseName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${baseName}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Downloads MediaSpawner configuration data with a timestamped filename
 * @param data - The configuration data to export
 * @param baseName - The base name for the exported file (default: 'mediaspawner-config')
 * @returns Promise that resolves when download is complete or rejects on error
 */
export async function downloadConfiguration(
  data: unknown,
  baseName: string = "mediaspawner-config",
): Promise<void> {
  const filename = generateTimestampedFilename(baseName);
  return downloadJsonFile(data, filename);
}
