/**
 * Comprehensive validation utilities for import/export operations
 *
 * This module provides robust validation for both export and import operations,
 * ensuring data integrity and providing clear error messages for invalid configurations.
 */

import type { SpawnProfile, MediaAsset } from "../types";
import type {
  ExportedSpawnProfile,
  ExportedSpawnAsset,
  ExportedAsset,
  ExportedTrigger,
  ExportedRandomizationBucket,
  ExportedAssetSettings,
} from "./dataTransformation";
import { validateTrigger } from "./triggerValidation";
import { validateSpawn, validateSpawnProfile } from "../types/spawn";
import { validateRandomizationBuckets } from "./randomizationBuckets";
import {
  validateUrlFormat,
  validateLocalPathFormat,
  validateVolumePercent,
  validateDimensionsValues,
  validatePositionValues,
  validateScaleValue,
} from "./assetValidation";
import { isValidIsoString } from "./dataTransformation";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldErrors: Record<string, string[]>;
}

export interface ExportValidationResult extends ValidationResult {
  profileErrors: Record<number, string[]>;
  assetErrors: Record<number, string[]>;
  spawnErrors: Record<string, string[]>; // profileIndex-spawnIndex
}

export interface ImportValidationResult extends ValidationResult {
  profileErrors: Record<number, string[]>;
  assetErrors: Record<number, string[]>;
  spawnErrors: Record<string, string[]>; // profileIndex-spawnIndex
  relationshipErrors: string[];
}

/**
 * Validate exported data before serialization
 */
export function validateExportData(
  profiles: ExportedSpawnProfile[],
  assets: ExportedAsset[]
): ExportValidationResult {
  const result: ExportValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldErrors: {},
    profileErrors: {},
    assetErrors: {},
    spawnErrors: {},
  };

  // Validate profiles
  profiles.forEach((profile, index) => {
    const profileErrors: string[] = [];

    if (
      !profile.id ||
      typeof profile.id !== "string" ||
      profile.id.trim() === ""
    ) {
      profileErrors.push("Profile must have a valid ID");
      result.fieldErrors[`profiles[${index}].id`] = [
        "Profile must have a valid ID",
      ];
    }

    if (
      !profile.name ||
      typeof profile.name !== "string" ||
      profile.name.trim() === ""
    ) {
      profileErrors.push("Profile must have a non-empty name");
      result.fieldErrors[`profiles[${index}].name`] = [
        "Profile must have a non-empty name",
      ];
    }

    if (!Array.isArray(profile.spawns)) {
      profileErrors.push("Profile must have a spawns array");
      result.fieldErrors[`profiles[${index}].spawns`] = [
        "Profile must have a spawns array",
      ];
    }

    if (typeof profile.workingDirectory !== "string") {
      profileErrors.push("Profile must have a valid working directory");
      result.fieldErrors[`profiles[${index}].workingDirectory`] = [
        "Profile must have a valid working directory",
      ];
    }

    if (!profile.lastModified || typeof profile.lastModified !== "string") {
      profileErrors.push("Profile must have a valid lastModified timestamp");
      result.fieldErrors[`profiles[${index}].lastModified`] = [
        "Profile must have a valid lastModified timestamp",
      ];
    } else if (!isValidIsoString(profile.lastModified)) {
      profileErrors.push("Profile lastModified must be a valid ISO string");
      result.fieldErrors[`profiles[${index}].lastModified`] = [
        "Profile lastModified must be a valid ISO string",
      ];
    }

    // Validate spawns within profile
    if (Array.isArray(profile.spawns)) {
      profile.spawns.forEach((spawn, spawnIndex) => {
        const spawnErrors: string[] = [];
        const spawnKey = `${index}-${spawnIndex}`;

        if (!spawn.id || typeof spawn.id !== "string") {
          spawnErrors.push("Spawn must have a valid ID");
        }

        if (
          !spawn.name ||
          typeof spawn.name !== "string" ||
          spawn.name.trim() === ""
        ) {
          spawnErrors.push("Spawn must have a non-empty name");
        }

        if (typeof spawn.enabled !== "boolean") {
          spawnErrors.push("Spawn enabled must be a boolean");
        }

        if (typeof spawn.duration !== "number" || spawn.duration < 0) {
          spawnErrors.push("Spawn duration must be a non-negative number");
        }

        if (!spawn.trigger || typeof spawn.trigger !== "object") {
          spawnErrors.push("Spawn must have a valid trigger");
        } else {
          const triggerValidation = validateExportedTrigger(spawn.trigger);
          if (!triggerValidation.isValid) {
            spawnErrors.push(...triggerValidation.errors);
          }
        }

        if (!Array.isArray(spawn.assets)) {
          spawnErrors.push("Spawn must have an assets array");
        } else {
          spawn.assets.forEach((asset, assetIndex) => {
            const assetErrors: string[] = [];

            if (!asset.assetId || typeof asset.assetId !== "string") {
              assetErrors.push("Spawn asset must have a valid assetId");
            }

            if (!asset.id || typeof asset.id !== "string") {
              assetErrors.push("Spawn asset must have a valid ID");
            }

            if (typeof asset.enabled !== "boolean") {
              assetErrors.push("Spawn asset enabled must be a boolean");
            }

            if (typeof asset.order !== "number" || asset.order < 0) {
              assetErrors.push(
                "Spawn asset order must be a non-negative number"
              );
            }

            if (asset.overrides) {
              if (
                asset.overrides.duration !== undefined &&
                (typeof asset.overrides.duration !== "number" ||
                  asset.overrides.duration < 0)
              ) {
                assetErrors.push(
                  "Spawn asset duration override must be a non-negative number"
                );
              }

              if (asset.overrides.properties) {
                const propertiesValidation = validateExportedAssetSettings(
                  asset.overrides.properties
                );
                if (!propertiesValidation.isValid) {
                  assetErrors.push(...propertiesValidation.errors);
                }
              }
            }

            if (assetErrors.length > 0) {
              spawnErrors.push(
                `Asset ${assetIndex}: ${assetErrors.join(", ")}`
              );
            }
          });
        }

        if (spawn.randomizationBuckets) {
          const bucketValidation = validateExportedRandomizationBuckets(
            spawn.randomizationBuckets,
            spawn.assets
          );
          if (!bucketValidation.isValid) {
            spawnErrors.push(...bucketValidation.errors);
          }
        }

        if (spawn.defaultProperties) {
          const propertiesValidation = validateExportedAssetSettings(
            spawn.defaultProperties
          );
          if (!propertiesValidation.isValid) {
            spawnErrors.push(...propertiesValidation.errors);
          }
        }

        if (spawnErrors.length > 0) {
          result.spawnErrors[spawnKey] = spawnErrors;
        }
      });
    }

    if (profileErrors.length > 0) {
      result.profileErrors[index] = profileErrors;
    }
  });

  // Validate assets
  assets.forEach((asset, index) => {
    const assetErrors: string[] = [];

    if (!asset.id || typeof asset.id !== "string" || asset.id.trim() === "") {
      assetErrors.push("Asset must have a valid ID");
      result.fieldErrors[`assets[${index}].id`] = [
        "Asset must have a valid ID",
      ];
    }

    if (
      !asset.name ||
      typeof asset.name !== "string" ||
      asset.name.trim() === ""
    ) {
      assetErrors.push("Asset must have a non-empty name");
      result.fieldErrors[`assets[${index}].name`] = [
        "Asset must have a non-empty name",
      ];
    }

    if (
      !asset.path ||
      typeof asset.path !== "string" ||
      asset.path.trim() === ""
    ) {
      assetErrors.push("Asset must have a valid path");
      result.fieldErrors[`assets[${index}].path`] = [
        "Asset must have a valid path",
      ];
    } else {
      // Validate path format
      if (asset.isUrl) {
        const urlValidation = validateUrlFormat(asset.path);
        if (!urlValidation.isValid) {
          assetErrors.push(`Asset path: ${urlValidation.error}`);
          result.fieldErrors[`assets[${index}].path`] = [
            urlValidation.error || "Invalid URL format",
          ];
        }
      } else {
        const pathValidation = validateLocalPathFormat(asset.path);
        if (!pathValidation.isValid) {
          assetErrors.push(`Asset path: ${pathValidation.error}`);
          result.fieldErrors[`assets[${index}].path`] = [
            pathValidation.error || "Invalid file path",
          ];
        }
      }
    }

    if (typeof asset.isUrl !== "boolean") {
      assetErrors.push("Asset isUrl must be a boolean");
      result.fieldErrors[`assets[${index}].isUrl`] = [
        "Asset isUrl must be a boolean",
      ];
    }

    if (!asset.type || !["image", "video", "audio"].includes(asset.type)) {
      assetErrors.push("Asset must have a valid type (image, video, or audio)");
      result.fieldErrors[`assets[${index}].type`] = [
        "Asset must have a valid type (image, video, or audio)",
      ];
    }

    if (assetErrors.length > 0) {
      result.assetErrors[index] = assetErrors;
    }
  });

  // Check for duplicate IDs
  const profileIds = profiles.map((p) => p.id);
  const duplicateProfileIds = profileIds.filter(
    (id, index) => profileIds.indexOf(id) !== index
  );
  if (duplicateProfileIds.length > 0) {
    result.errors.push(
      `Duplicate profile IDs found: ${duplicateProfileIds.join(", ")}`
    );
  }

  const assetIds = assets.map((a) => a.id);
  const duplicateAssetIds = assetIds.filter(
    (id, index) => assetIds.indexOf(id) !== index
  );
  if (duplicateAssetIds.length > 0) {
    result.errors.push(
      `Duplicate asset IDs found: ${duplicateAssetIds.join(", ")}`
    );
  }

  // Check for orphaned spawn assets (assets referenced in spawns but not in assets array)
  const allAssetIds = new Set(assets.map((a) => a.id));
  profiles.forEach((profile, profileIndex) => {
    if (Array.isArray(profile.spawns)) {
      profile.spawns.forEach((spawn, spawnIndex) => {
        if (Array.isArray(spawn.assets)) {
          spawn.assets.forEach((spawnAsset) => {
            if (!allAssetIds.has(spawnAsset.assetId)) {
              result.errors.push(
                `Profile ${profileIndex}, Spawn ${spawnIndex}: Asset ${spawnAsset.assetId} is referenced but not found in assets array`
              );
            }
          });
        }
      });
    }
  });

  // Determine overall validity
  result.isValid =
    result.errors.length === 0 &&
    Object.keys(result.profileErrors).length === 0 &&
    Object.keys(result.assetErrors).length === 0 &&
    Object.keys(result.spawnErrors).length === 0;

  return result;
}

/**
 * Validate imported data after transformation
 */
export function validateImportData(
  profiles: SpawnProfile[],
  assets: MediaAsset[]
): ImportValidationResult {
  const result: ImportValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldErrors: {},
    profileErrors: {},
    assetErrors: {},
    spawnErrors: {},
    relationshipErrors: [],
  };

  // Validate profiles
  profiles.forEach((profile, index) => {
    const profileErrors: string[] = [];

    const profileValidation = validateSpawnProfile(profile);
    if (!profileValidation.isValid) {
      profileErrors.push(...profileValidation.errors);
    }

    // Validate spawns within profile
    profile.spawns.forEach((spawn, spawnIndex) => {
      const spawnErrors: string[] = [];
      const spawnKey = `${index}-${spawnIndex}`;

      const spawnValidation = validateSpawn(spawn);
      if (!spawnValidation.isValid) {
        spawnErrors.push(...spawnValidation.errors);
      }

      // Validate triggers
      const triggerValidation = validateTrigger(spawn.trigger);
      if (!triggerValidation.isValid) {
        spawnErrors.push(...triggerValidation.errors);
      }
      result.warnings.push(...triggerValidation.warnings);

      // Validate randomization buckets
      if (spawn.randomizationBuckets) {
        const bucketValidation = validateRandomizationBuckets(spawn);
        if (!bucketValidation.isValid) {
          spawnErrors.push(...bucketValidation.errors);
        }
      }

      if (spawnErrors.length > 0) {
        result.spawnErrors[spawnKey] = spawnErrors;
      }
    });

    if (profileErrors.length > 0) {
      result.profileErrors[index] = profileErrors;
    }
  });

  // Validate assets
  assets.forEach((asset, index) => {
    const assetErrors: string[] = [];

    if (!asset.id || typeof asset.id !== "string") {
      assetErrors.push("Asset must have a valid ID");
    }

    if (
      !asset.name ||
      typeof asset.name !== "string" ||
      asset.name.trim() === ""
    ) {
      assetErrors.push("Asset must have a non-empty name");
    }

    if (
      !asset.path ||
      typeof asset.path !== "string" ||
      asset.path.trim() === ""
    ) {
      assetErrors.push("Asset must have a valid path");
    } else {
      // Validate path format
      if (asset.isUrl) {
        const urlValidation = validateUrlFormat(asset.path);
        if (!urlValidation.isValid) {
          assetErrors.push(`Asset path: ${urlValidation.error}`);
        }
      } else {
        const pathValidation = validateLocalPathFormat(asset.path);
        if (!pathValidation.isValid) {
          assetErrors.push(`Asset path: ${pathValidation.error}`);
        }
      }
    }

    if (typeof asset.isUrl !== "boolean") {
      assetErrors.push("Asset isUrl must be a boolean");
    }

    if (!asset.type || !["image", "video", "audio"].includes(asset.type)) {
      assetErrors.push("Asset must have a valid type (image, video, or audio)");
    }

    if (assetErrors.length > 0) {
      result.assetErrors[index] = assetErrors;
    }
  });

  // Validate relationships
  const allAssetIds = new Set(assets.map((a) => a.id));
  profiles.forEach((profile, profileIndex) => {
    profile.spawns.forEach((spawn, spawnIndex) => {
      spawn.assets.forEach((spawnAsset) => {
        if (!allAssetIds.has(spawnAsset.assetId)) {
          result.relationshipErrors.push(
            `Profile ${profileIndex}, Spawn ${spawnIndex}: Asset ${spawnAsset.assetId} is referenced but not found in assets array`
          );
        }
      });
    });
  });

  // Determine overall validity
  result.isValid =
    result.errors.length === 0 &&
    Object.keys(result.profileErrors).length === 0 &&
    Object.keys(result.assetErrors).length === 0 &&
    Object.keys(result.spawnErrors).length === 0 &&
    result.relationshipErrors.length === 0;

  return result;
}

/**
 * Validate exported trigger
 */
function validateExportedTrigger(trigger: ExportedTrigger): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldErrors: {},
  };

  if (!trigger.type || typeof trigger.type !== "string") {
    result.isValid = false;
    result.errors.push("Trigger must have a valid type");
    result.fieldErrors.type = ["Trigger must have a valid type"];
  }

  if (typeof trigger.enabled !== "boolean") {
    result.isValid = false;
    result.errors.push("Trigger enabled must be a boolean");
    result.fieldErrors.enabled = ["Trigger enabled must be a boolean"];
  }

  if (!trigger.config || typeof trigger.config !== "object") {
    result.isValid = false;
    result.errors.push("Trigger must have a valid config object");
    result.fieldErrors.config = ["Trigger must have a valid config object"];
  }

  return result;
}

/**
 * Validate exported randomization buckets
 */
function validateExportedRandomizationBuckets(
  buckets: ExportedRandomizationBucket[],
  spawnAssets: ExportedSpawnAsset[]
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldErrors: {},
  };

  const spawnAssetIds = new Set(spawnAssets.map((a) => a.id));
  const memberToBucket: Record<string, string> = {};

  buckets.forEach((bucket, bucketIndex) => {
    if (!bucket.id || typeof bucket.id !== "string") {
      result.isValid = false;
      result.errors.push(`Bucket ${bucketIndex} must have a valid ID`);
    }

    if (
      !bucket.name ||
      typeof bucket.name !== "string" ||
      bucket.name.trim() === ""
    ) {
      result.isValid = false;
      result.errors.push(`Bucket ${bucketIndex} must have a valid name`);
    }

    if (!bucket.selection || !["one", "n"].includes(bucket.selection)) {
      result.isValid = false;
      result.errors.push(
        `Bucket ${bucketIndex} must have a valid selection type`
      );
    }

    if (bucket.selection === "n") {
      if (
        bucket.n === undefined ||
        bucket.n === null ||
        typeof bucket.n !== "number" ||
        bucket.n < 1
      ) {
        result.isValid = false;
        result.errors.push(
          `Bucket ${bucketIndex} must have a valid n value for selection='n'`
        );
      }
    }

    if (!Array.isArray(bucket.members)) {
      result.isValid = false;
      result.errors.push(`Bucket ${bucketIndex} must have a members array`);
    } else {
      bucket.members.forEach((member, memberIndex) => {
        if (!member.spawnAssetId || typeof member.spawnAssetId !== "string") {
          result.isValid = false;
          result.errors.push(
            `Bucket ${bucketIndex}, Member ${memberIndex} must have a valid spawnAssetId`
          );
        } else if (!spawnAssetIds.has(member.spawnAssetId)) {
          result.isValid = false;
          result.errors.push(
            `Bucket ${bucketIndex}, Member ${memberIndex} references non-existent spawn asset ${member.spawnAssetId}`
          );
        }

        if (
          member.weight !== undefined &&
          (typeof member.weight !== "number" || member.weight <= 0)
        ) {
          result.isValid = false;
          result.errors.push(
            `Bucket ${bucketIndex}, Member ${memberIndex} must have a positive weight`
          );
        }

        if (
          memberToBucket[member.spawnAssetId] &&
          memberToBucket[member.spawnAssetId] !== bucket.id
        ) {
          result.isValid = false;
          result.errors.push(
            `Spawn asset ${member.spawnAssetId} appears in multiple buckets`
          );
        } else {
          memberToBucket[member.spawnAssetId] = bucket.id;
        }
      });
    }
  });

  return result;
}

/**
 * Validate exported asset settings
 */
function validateExportedAssetSettings(
  settings: ExportedAssetSettings
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldErrors: {},
  };

  if (settings.volume !== undefined) {
    const volumeValidation = validateVolumePercent(settings.volume);
    if (!volumeValidation.isValid) {
      result.isValid = false;
      result.errors.push(`Volume: ${volumeValidation.error}`);
      result.fieldErrors.volume = [volumeValidation.error || "Invalid volume"];
    }
  }

  if (settings.scale !== undefined) {
    const scaleValidation = validateScaleValue(settings.scale);
    if (!scaleValidation.isValid) {
      result.isValid = false;
      result.errors.push(`Scale: ${scaleValidation.error}`);
      result.fieldErrors.scale = [scaleValidation.error || "Invalid scale"];
    }
  }

  if (settings.width !== undefined || settings.height !== undefined) {
    const dimensionsValidation = validateDimensionsValues({
      width: settings.width ?? 100,
      height: settings.height ?? 100,
    });
    if (!dimensionsValidation.isValid) {
      result.isValid = false;
      result.errors.push(`Dimensions: ${dimensionsValidation.error}`);
      result.fieldErrors.dimensions = [
        dimensionsValidation.error || "Invalid dimensions",
      ];
    }
  }

  if (settings.x !== undefined || settings.y !== undefined) {
    const positionValidation = validatePositionValues({
      x: settings.x ?? 0,
      y: settings.y ?? 0,
    });
    if (!positionValidation.isValid) {
      result.isValid = false;
      result.errors.push(`Position: ${positionValidation.error}`);
      result.fieldErrors.position = [
        positionValidation.error || "Invalid position",
      ];
    }
  }

  if (
    settings.positionMode &&
    !["absolute", "relative", "centered"].includes(settings.positionMode)
  ) {
    result.isValid = false;
    result.errors.push("Position mode must be absolute, relative, or centered");
    result.fieldErrors.positionMode = [
      "Position mode must be absolute, relative, or centered",
    ];
  }

  return result;
}

/**
 * Validate working directory path
 */
export function validateWorkingDirectory(path: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldErrors: {},
  };

  if (path === null || path === undefined || typeof path !== "string") {
    result.isValid = false;
    result.errors.push("Working directory must be a valid string");
    return result;
  }

  const trimmed = path.trim();
  if (trimmed === "") {
    result.warnings.push("Working directory is empty");
    return result; // Empty is valid but with warning
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(trimmed)) {
    result.isValid = false;
    result.errors.push("Working directory contains invalid characters");
    result.fieldErrors.path = ["Working directory contains invalid characters"];
  }

  return result;
}

/**
 * Validate asset accessibility (for local files)
 */
export function validateAssetAccessibility(
  asset: MediaAsset
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldErrors: {},
  };

  if (!asset.isUrl) {
    // For local files, we can't actually check if the file exists in this context
    // since we're in a browser environment, but we can validate the path format
    const pathValidation = validateLocalPathFormat(asset.path);
    if (!pathValidation.isValid) {
      result.isValid = false;
      result.errors.push(`Asset path: ${pathValidation.error}`);
      result.fieldErrors.path = [pathValidation.error || "Invalid file path"];
    } else {
      result.warnings.push(
        "Cannot verify local file accessibility in browser environment"
      );
    }
  }

  return result;
}
