import type { MediaAsset } from "../types/media";
import type { Dimensions, Position } from "../types/media";
import {
  detectAssetTypeFromPath,
  isValidAssetPath,
} from "./assetTypeDetection";

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
  if (!isValidAssetPath(trimmed)) {
    return { isValid: false, error: "Unsupported file type" };
  }
  return { isValid: true };
}

export function detectTypeFromUrlOrPath(path: string): AssetType {
  return detectAssetTypeFromPath(path);
}

export function validateVolumePercent(
  value: number | undefined
): ValidationResult {
  if (value === undefined || Number.isNaN(value))
    return { isValid: false, error: "Enter 0–100" };
  if (value < 0 || value > 100) return { isValid: false, error: "Enter 0–100" };
  return { isValid: true };
}

export function validateDimensionsValues(
  dim: Dimensions | undefined
): ValidationResult {
  if (!dim) return { isValid: false, error: "Width/Height must be > 0" };
  if (dim.width <= 0 || dim.height <= 0)
    return { isValid: false, error: "Width/Height must be > 0" };
  return { isValid: true };
}

export function validatePositionValues(
  pos: Position | undefined
): ValidationResult {
  if (!pos) return { isValid: false, error: "Use non-negative values" };
  if (pos.x < 0 || pos.y < 0)
    return { isValid: false, error: "Use non-negative values" };
  return { isValid: true };
}

export function validateScaleValue(
  value: number | undefined
): ValidationResult {
  if (value === undefined || Number.isNaN(value))
    return { isValid: false, error: "Must be ≥ 0" };
  if (value < 0) return { isValid: false, error: "Must be ≥ 0" };
  return { isValid: true };
}
