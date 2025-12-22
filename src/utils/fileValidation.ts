export const SUPPORTED_FILE_EXTENSIONS = {
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

export type MediaType = keyof typeof SUPPORTED_FILE_EXTENSIONS;

export interface FileValidationResult {
  isValid: boolean;
  mediaType?: MediaType;
  error?: string;
}

export function getFileExtension(filePath: string): string {
  if (isValidUrl(filePath)) {
    try {
      const url = new URL(filePath);
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
    } catch {
      // continue to file path logic on error
    }
  }
  const cleanPath = filePath.split("?")[0].split("#")[0];

  const lastDot = cleanPath.lastIndexOf(".");
  const lastSlash = Math.max(
    cleanPath.lastIndexOf("/"),
    cleanPath.lastIndexOf("\\"),
  );

  if (lastDot > lastSlash && lastDot !== -1) {
    return cleanPath.substring(lastDot + 1).toLowerCase();
  }
  return "";
}

/**
 * Determine the media type based on file extension
 */
export function getMediaTypeFromExtension(extension: string): MediaType | null {
  const lowerExt = extension.toLowerCase();
  for (const [mediaType, extensions] of Object.entries(
    SUPPORTED_FILE_EXTENSIONS,
  )) {
    if ((extensions as readonly string[]).includes(lowerExt)) {
      return mediaType as MediaType;
    }
  }
  return null;
}

/**
 * Validate if a file path or URL has a supported file type
 */
export function validateFileType(filePath: string): FileValidationResult {
  if (!filePath.trim()) {
    return { isValid: false, error: "File path cannot be empty" };
  }

  const extension = getFileExtension(filePath);
  if (!extension) {
    return { isValid: false, error: "No file extension found" };
  }

  const mediaType = getMediaTypeFromExtension(extension);
  if (!mediaType) {
    const supportedExts = Object.values(SUPPORTED_FILE_EXTENSIONS)
      .flat()
      .join(", ");
    return {
      isValid: false,
      error: `Unsupported file type. Supported extensions: ${supportedExts}`,
    };
  }

  return { isValid: true, mediaType };
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid file path (basic validation)
 */
export function isValidFilePath(string: string): boolean {
  if (!string.trim()) return false;

  // Basic file path validation - check for invalid characters
  const invalidChars = /[<>:"|?*]/;
  return !invalidChars.test(string);
}

/**
 * Validate and format a file reference (path or URL)
 */
export function validateFileReference(
  input: string,
): FileValidationResult & { formattedPath?: string } {
  const trimmed = input.trim();

  if (!trimmed) {
    return { isValid: false, error: "File reference cannot be empty" };
  }

  if (isValidUrl(trimmed)) {
    const fileValidation = validateFileType(trimmed);
    return {
      ...fileValidation,
      formattedPath: trimmed,
    };
  }

  if (isValidFilePath(trimmed)) {
    const fileValidation = validateFileType(trimmed);
    return {
      ...fileValidation,
      formattedPath: trimmed.replace(/\\/g, "/"), // Normalize path separators
    };
  }

  return { isValid: false, error: "Invalid file path or URL format" };
}
