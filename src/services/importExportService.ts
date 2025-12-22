/**
 * Service for importing and exporting MediaSpawner configuration data
 *
 * This service handles serialization and deserialization of MediaSpawner data
 * to/from the schema-compliant JSON format expected by Streamer.bot integration.
 */

import type { SpawnProfile, MediaAsset } from "../types";
import { SpawnProfileService } from "./spawnProfileService";
import { AssetService } from "./assetService";
import { SettingsService } from "./settingsService";
import {
  transformProfileToSchema,
  transformAssetToSchema,
  transformProfileFromSchema,
  transformAssetFromSchema,
  type ExportedSpawnProfile,
  type ExportedAsset,
} from "../utils/dataTransformation";
import {
  validateExportData,
  validateImportData,
} from "../utils/importExportValidation";

/**
 * Result of export operations
 */
export interface ExportResult {
  success: boolean;
  data?: string;
  error?: string;
  metadata?: ExportMetadata;
}

/**
 * Import options for handling conflicts and merge strategies
 */
export interface ImportOptions {
  /** Strategy for handling profile conflicts */
  profileConflictStrategy: "skip" | "overwrite" | "rename";
  /** Strategy for handling asset conflicts */
  assetConflictStrategy: "skip" | "overwrite" | "rename";
  /** Whether to update working directory from imported profiles */
  updateWorkingDirectory: boolean;
  /** Whether to validate asset references */
  validateAssetReferences: boolean;
}

/**
 * Default import options
 */
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  profileConflictStrategy: "rename",
  assetConflictStrategy: "rename",
  updateWorkingDirectory: true,
  validateAssetReferences: true,
};

/**
 * Result of import operations
 */
export interface ImportResult {
  success: boolean;
  profiles?: SpawnProfile[];
  assets?: MediaAsset[];
  error?: string;
  metadata?: ImportMetadata;
  conflicts?: ImportConflicts;
}

/**
 * Information about conflicts encountered during import
 */
export interface ImportConflicts {
  profileConflicts: string[];
  assetConflicts: string[];
  invalidAssetReferences: string[];
  workingDirectoryConflicts: boolean;
}

/**
 * Result of validation operations
 */
export interface ImportExportServiceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Metadata about an export operation
 */
export interface ExportMetadata {
  exportedAt: string;
  version: string;
  profileCount: number;
  assetCount: number;
  spawnCount: number;
}

/**
 * Metadata about an import operation
 */
export interface ImportMetadata {
  importedAt: string;
  version: string;
  profileCount: number;
  assetCount: number;
  spawnCount: number;
  validationWarnings: string[];
}

/**
 * Configuration data structure for export/import
 */
export interface MediaSpawnerConfig {
  version: string;
  workingDirectory: string;
  obsCanvasWidth?: number;
  obsCanvasHeight?: number;
  profiles: ExportedSpawnProfile[];
  assets: ExportedAsset[];
}

/**
 * Service for managing import/export operations
 */
export class ImportExportService {
  private static readonly CONFIG_VERSION = "1.0.0";

  /**
   * Export current MediaSpawner state to schema-compliant JSON
   */
  static async exportConfiguration(): Promise<ExportResult> {
    try {
      const profiles = SpawnProfileService.getAllProfiles();
      const assets = AssetService.getAssets();
      const settings = SettingsService.getSettings();

      if (profiles.length === 0 && assets.length === 0) {
        return {
          success: false,
          error:
            "No data available to export. Please create profiles and assets first.",
        };
      }

      const exportedProfiles = profiles.map((profile) =>
        transformProfileToSchema(profile),
      );
      const exportedAssets = assets.map((asset) =>
        transformAssetToSchema(asset),
      );

      const validation = validateExportData(exportedProfiles, exportedAssets);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Export validation failed: ${validation.errors.join(", ")}`,
        };
      }

      const config: MediaSpawnerConfig = {
        version: this.CONFIG_VERSION,
        workingDirectory: settings.workingDirectory,
        obsCanvasWidth: settings.obsCanvasWidth,
        obsCanvasHeight: settings.obsCanvasHeight,
        profiles: exportedProfiles,
        assets: exportedAssets,
      };

      const jsonData = JSON.stringify(config);

      try {
        JSON.parse(jsonData);
      } catch {
        return {
          success: false,
          error: "Failed to serialize configuration to JSON",
        };
      }

      const metadata: ExportMetadata = {
        exportedAt: new Date().toISOString(),
        version: this.CONFIG_VERSION,
        profileCount: profiles.length,
        assetCount: assets.length,
        spawnCount: profiles.reduce(
          (total, profile) => total + profile.spawns.length,
          0,
        ),
      };

      return {
        success: true,
        data: jsonData,
        metadata,
      };
    } catch (error) {
      console.error("Export configuration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Export failed",
      };
    }
  }

  /**
   * Import configuration from schema-compliant JSON
   */
  static async importConfiguration(
    jsonData: string,
    options: ImportOptions = DEFAULT_IMPORT_OPTIONS,
  ): Promise<ImportResult> {
    try {
      const config = JSON.parse(jsonData) as MediaSpawnerConfig;

      const validation = this.validateImportedConfig(config);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid configuration: ${validation.errors.join(", ")}`,
        };
      }

      // Transform imported data back to internal format
      const importedProfiles = config.profiles.map((profile) =>
        transformProfileFromSchema(profile),
      );
      const importedAssets = config.assets.map((asset) =>
        transformAssetFromSchema(asset),
      );

      const dataValidation = validateImportData(
        importedProfiles,
        importedAssets,
      );
      if (!dataValidation.isValid) {
        return {
          success: false,
          error: `Data validation failed: ${dataValidation.errors.join(", ")}`,
        };
      }

      const mergeResult = await this.mergeImportedData(
        importedProfiles,
        importedAssets,
        options,
      );

      if (!mergeResult.success) {
        return {
          success: false,
          error: mergeResult.error,
        };
      }

      if (options.updateWorkingDirectory && config.workingDirectory) {
        const workingDirResult = SettingsService.updateWorkingDirectory(
          config.workingDirectory,
        );
        if (!workingDirResult.success) {
          console.warn(
            `Failed to update working directory: ${workingDirResult.error}`,
          );
          // Don't fail the import, just log the warning
        }
      }

      if (config.obsCanvasWidth && config.obsCanvasHeight) {
        const canvasSizeResult = SettingsService.updateOBSCanvasSize(
          config.obsCanvasWidth,
          config.obsCanvasHeight,
        );
        if (!canvasSizeResult.success) {
          console.warn(
            `Failed to update OBS canvas size: ${canvasSizeResult.error}`,
          );
          // Don't fail the import, just log the warning
        }
      }

      const metadata: ImportMetadata = {
        importedAt: new Date().toISOString(),
        version: config.version,
        profileCount: mergeResult.profiles.length,
        assetCount: mergeResult.assets.length,
        spawnCount: mergeResult.profiles.reduce(
          (total, profile) => total + profile.spawns.length,
          0,
        ),
        validationWarnings: [
          ...validation.warnings,
          ...dataValidation.warnings,
        ],
      };

      return {
        success: true,
        profiles: mergeResult.profiles,
        assets: mergeResult.assets,
        metadata,
        conflicts: mergeResult.conflicts,
      };
    } catch (error) {
      console.error("Import configuration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      };
    }
  }

  /**
   * Validate imported configuration data
   */
  static validateImportedConfig(
    config: unknown,
  ): ImportExportServiceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config || typeof config !== "object") {
      errors.push("Configuration must be an object");
      return { isValid: false, errors, warnings };
    }

    const configObj = config as Record<string, unknown>;

    if (!configObj.version || typeof configObj.version !== "string") {
      errors.push("Configuration must have a version field");
    }

    if (!Array.isArray(configObj.profiles)) {
      errors.push("Configuration must have a profiles array");
    }

    if (!Array.isArray(configObj.assets)) {
      errors.push("Configuration must have an assets array");
    }

    // Validate version compatibility
    if (configObj.version && configObj.version !== this.CONFIG_VERSION) {
      warnings.push(
        `Version mismatch: expected ${this.CONFIG_VERSION}, got ${configObj.version}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Merge imported data with existing data, handling conflicts
   */
  private static async mergeImportedData(
    importedProfiles: SpawnProfile[],
    importedAssets: MediaAsset[],
    options: ImportOptions,
  ): Promise<{
    success: boolean;
    profiles: SpawnProfile[];
    assets: MediaAsset[];
    conflicts?: ImportConflicts;
    error?: string;
  }> {
    try {
      const conflicts: ImportConflicts = {
        profileConflicts: [],
        assetConflicts: [],
        invalidAssetReferences: [],
        workingDirectoryConflicts: false,
      };

      const existingProfiles = SpawnProfileService.getAllProfiles();
      const existingAssets = AssetService.getAssets();

      const mergedAssets = [...existingAssets];
      const assetIdMap = new Map<string, string>(); // old ID -> new ID mapping

      for (const importedAsset of importedAssets) {
        const existingAsset = existingAssets.find(
          (asset) => asset.id === importedAsset.id,
        );

        if (existingAsset) {
          conflicts.assetConflicts.push(importedAsset.name);

          switch (options.assetConflictStrategy) {
            case "skip": {
              // Keep existing asset, map to existing ID
              assetIdMap.set(importedAsset.id, existingAsset.id);
              break;
            }
            case "overwrite": {
              // Replace existing asset
              const assetIndex = mergedAssets.findIndex(
                (asset) => asset.id === importedAsset.id,
              );
              if (assetIndex !== -1) {
                mergedAssets[assetIndex] = importedAsset;
              }
              assetIdMap.set(importedAsset.id, importedAsset.id);
              break;
            }
            case "rename": {
              const newAsset = { ...importedAsset, id: crypto.randomUUID() };
              mergedAssets.push(newAsset);
              assetIdMap.set(importedAsset.id, newAsset.id);
              break;
            }
          }
        } else {
          mergedAssets.push(importedAsset);
          assetIdMap.set(importedAsset.id, importedAsset.id);
        }
      }

      const mergedProfiles = [...existingProfiles];

      for (const importedProfile of importedProfiles) {
        const existingProfile = existingProfiles.find(
          (profile) => profile.id === importedProfile.id,
        );

        if (existingProfile) {
          conflicts.profileConflicts.push(importedProfile.name);

          switch (options.profileConflictStrategy) {
            case "skip": {
              // Keep existing profile
              break;
            }
            case "overwrite": {
              // Replace existing profile
              const profileIndex = mergedProfiles.findIndex(
                (profile) => profile.id === importedProfile.id,
              );
              if (profileIndex !== -1) {
                mergedProfiles[profileIndex] = importedProfile;
              }
              break;
            }
            case "rename": {
              const newProfile = {
                ...importedProfile,
                id: crypto.randomUUID(),
                spawns: importedProfile.spawns.map((spawn) => ({
                  ...spawn,
                  id: crypto.randomUUID(),
                  assets: spawn.assets.map((spawnAsset) => ({
                    ...spawnAsset,
                    id: crypto.randomUUID(),
                    assetId:
                      assetIdMap.get(spawnAsset.assetId) || spawnAsset.assetId,
                  })),
                })),
              };
              mergedProfiles.push(newProfile);
              break;
            }
          }
        } else {
          const updatedProfile = {
            ...importedProfile,
            spawns: importedProfile.spawns.map((spawn) => ({
              ...spawn,
              id: crypto.randomUUID(),
              assets: spawn.assets.map((spawnAsset) => ({
                ...spawnAsset,
                id: crypto.randomUUID(),
                assetId:
                  assetIdMap.get(spawnAsset.assetId) || spawnAsset.assetId,
              })),
            })),
          };
          mergedProfiles.push(updatedProfile);
        }
      }

      if (options.validateAssetReferences) {
        for (const profile of mergedProfiles) {
          for (const spawn of profile.spawns) {
            for (const spawnAsset of spawn.assets) {
              const assetExists = mergedAssets.some(
                (asset) => asset.id === spawnAsset.assetId,
              );
              if (!assetExists) {
                conflicts.invalidAssetReferences.push(
                  `Profile "${profile.name}", Spawn "${spawn.name}": Asset "${spawnAsset.assetId}" not found`,
                );
              }
            }
          }
        }
      }

      SpawnProfileService.replaceProfiles(mergedProfiles);
      AssetService.saveAssets(mergedAssets);

      return {
        success: true,
        profiles: mergedProfiles,
        assets: mergedAssets,
        conflicts,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Merge failed",
        profiles: [],
        assets: [],
      };
    }
  }
}
