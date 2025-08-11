import type { MediaAsset } from "../types/media";
import { detectAssetTypeFromPath } from "./assetTypeDetection";

export type AssetType = MediaAsset["type"];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUrlFormat(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { isValid: false, error: "URL is required" };
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { isValid: false, error: "Only http/https URLs are supported" };
    }
    // new URL() accepts query params, hashes, etc. No further checks per MS-40
    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }
}

export function validateLocalPathFormat(path: string): ValidationResult {
  const trimmed = path.trim();
  if (!trimmed) return { isValid: false, error: "File path is required" };
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(trimmed)) {
    return { isValid: false, error: "Path contains invalid characters" };
  }
  // Must have a supported extension; no existence checks
  const type = detectAssetTypeFromPath(trimmed);
  if (!type) {
    return { isValid: false, error: "Unsupported file type" };
  }
  return { isValid: true };
}

export function detectTypeFromUrlOrPath(path: string): AssetType {
  return detectAssetTypeFromPath(path);
}
