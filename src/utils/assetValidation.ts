import type {
  MediaAsset,
  ScaleObject,
  CropSettings,
  BoundsType,
  AlignmentOption,
} from "../types/media";
import type { Dimensions, Position } from "../types/media";
import {
  detectAssetTypeFromPath,
  isValidAssetPath,
} from "./assetTypeDetection";

export type AssetType = MediaAsset["type"];

export interface AssetValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUrlFormat(value: string): AssetValidationResult {
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

export function validateLocalPathFormat(path: string): AssetValidationResult {
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
  value: number | undefined,
): AssetValidationResult {
  if (value === undefined || Number.isNaN(value))
    return { isValid: false, error: "Enter 0–100" };
  if (value < 0 || value > 100) return { isValid: false, error: "Enter 0–100" };
  return { isValid: true };
}

export function validateDimensionsValues(
  dim: Dimensions | undefined,
): AssetValidationResult {
  if (!dim) return { isValid: true };

  // Validate individual fields if present
  if (dim.width !== undefined && dim.width <= 0)
    return { isValid: false, error: "Width must be > 0" };
  if (dim.height !== undefined && dim.height <= 0)
    return { isValid: false, error: "Height must be > 0" };

  return { isValid: true };
}

export function validatePositionValues(
  pos: Position | undefined,
): AssetValidationResult {
  if (!pos) return { isValid: true };

  // Validate individual fields if present
  if (pos.x !== undefined && pos.x < 0)
    return { isValid: false, error: "X position must be ≥ 0" };
  if (pos.y !== undefined && pos.y < 0)
    return { isValid: false, error: "Y position must be ≥ 0" };

  return { isValid: true };
}

export function validateScaleValue(
  value: number | ScaleObject | undefined,
): AssetValidationResult {
  if (value === undefined) return { isValid: true };

  if (typeof value === "number") {
    if (Number.isNaN(value)) return { isValid: false, error: "Must be ≥ 0" };
    if (value < 0) return { isValid: false, error: "Must be ≥ 0" };
    return { isValid: true };
  }

  if (typeof value === "object" && value !== null) {
    const scaleObj = value as ScaleObject;

    // Validate individual fields if present
    if (scaleObj.x !== undefined) {
      if (Number.isNaN(scaleObj.x) || scaleObj.x < 0) {
        return { isValid: false, error: "Scale X must be ≥ 0" };
      }
    }
    if (scaleObj.y !== undefined) {
      if (Number.isNaN(scaleObj.y) || scaleObj.y < 0) {
        return { isValid: false, error: "Scale Y must be ≥ 0" };
      }
    }
    return { isValid: true };
  }

  return { isValid: false, error: "Invalid scale value" };
}

export function validateRotation(
  value: number | undefined,
): AssetValidationResult {
  if (value === undefined) return { isValid: true };
  if (Number.isNaN(value)) return { isValid: false, error: "Enter 0–360°" };
  if (value < 0 || value > 360)
    return { isValid: false, error: "Enter 0–360°" };
  return { isValid: true };
}

export function validateCropSettings(
  crop: CropSettings | undefined,
  dimensions?: Dimensions,
): AssetValidationResult {
  if (!crop) return { isValid: true };

  const { left, top, right, bottom } = crop;

  // Check for non-negative values (only validate fields that are defined)
  if (left !== undefined && left < 0)
    return { isValid: false, error: "Crop left must be ≥ 0" };
  if (top !== undefined && top < 0)
    return { isValid: false, error: "Crop top must be ≥ 0" };
  if (right !== undefined && right < 0)
    return { isValid: false, error: "Crop right must be ≥ 0" };
  if (bottom !== undefined && bottom < 0)
    return { isValid: false, error: "Crop bottom must be ≥ 0" };

  // Check against dimensions if available (only validate defined fields)
  if (dimensions) {
    const { width, height } = dimensions;
    if (
      width !== undefined &&
      left !== undefined &&
      right !== undefined &&
      left + right >= width
    ) {
      return { isValid: false, error: "Crop left + right must be < width" };
    }
    if (
      height !== undefined &&
      top !== undefined &&
      bottom !== undefined &&
      top + bottom >= height
    ) {
      return { isValid: false, error: "Crop top + bottom must be < height" };
    }
  }

  return { isValid: true };
}

export function validateAlignment(
  value: AlignmentOption | undefined,
): AssetValidationResult {
  if (value === undefined) return { isValid: true };

  const validAlignments: AlignmentOption[] = [0, 1, 2, 4, 5, 6, 8, 9, 10];
  if (!validAlignments.includes(value)) {
    return { isValid: false, error: "Invalid alignment value" };
  }

  return { isValid: true };
}

export function validateBoundsType(
  value: BoundsType | undefined,
): AssetValidationResult {
  if (value === undefined) return { isValid: true };

  const validBoundsTypes: BoundsType[] = [
    "OBS_BOUNDS_NONE",
    "OBS_BOUNDS_STRETCH",
    "OBS_BOUNDS_SCALE_INNER",
    "OBS_BOUNDS_SCALE_OUTER",
    "OBS_BOUNDS_SCALE_TO_WIDTH",
    "OBS_BOUNDS_SCALE_TO_HEIGHT",
    "OBS_BOUNDS_MAX_ONLY",
  ];

  if (!validBoundsTypes.includes(value)) {
    return { isValid: false, error: "Invalid bounds type" };
  }

  return { isValid: true };
}

export function validateBoundsAlignment(
  value: AlignmentOption | undefined,
): AssetValidationResult {
  if (value === undefined) return { isValid: true };

  const validAlignments: AlignmentOption[] = [0, 1, 2, 4, 5, 6, 8, 9, 10];
  if (!validAlignments.includes(value)) {
    return { isValid: false, error: "Invalid bounds alignment value" };
  }

  return { isValid: true };
}
