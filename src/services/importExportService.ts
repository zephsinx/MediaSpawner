/**
 * Service for importing and exporting MediaSpawner configuration data
 *
 * This service handles serialization and deserialization of MediaSpawner data
 * to/from the schema-compliant JSON format expected by Streamer.bot integration.
 */

import type {
  SpawnProfile,
  Spawn,
  SpawnAsset,
  MediaAsset,
  Trigger,
  RandomizationBucket,
  MediaAssetProperties,
} from "../types";
import { SpawnProfileService } from "./spawnProfileService";
import { AssetService } from "./assetService";
import { SettingsService } from "./settingsService";
import { validateTrigger } from "../utils/triggerValidation";
import { validateSpawn, validateSpawnProfile } from "../types/spawn";

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
export interface ValidationResult {
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
  profiles: ExportedSpawnProfile[];
  assets: ExportedAsset[];
}

/**
 * Exported spawn profile structure (schema-compliant)
 */
export interface ExportedSpawnProfile {
  id: string;
  name: string;
  description?: string;
  workingDirectory: string;
  spawns: ExportedSpawn[];
  lastModified: string;
}

/**
 * Exported spawn structure (schema-compliant)
 */
export interface ExportedSpawn {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: ExportedTrigger;
  duration: number;
  assets: ExportedSpawnAsset[];
  randomizationBuckets?: ExportedRandomizationBucket[];
  defaultProperties?: ExportedAssetSettings;
}

/**
 * Exported spawn asset structure (schema-compliant)
 */
export interface ExportedSpawnAsset {
  assetId: string;
  id: string;
  enabled: boolean;
  order: number;
  overrides?: {
    duration?: number;
    properties?: ExportedAssetSettings;
  };
}

/**
 * Exported asset structure (schema-compliant)
 */
export interface ExportedAsset {
  id: string;
  name: string;
  path: string;
  isUrl: boolean;
  type: "image" | "video" | "audio";
}

/**
 * Exported trigger structure (schema-compliant)
 */
export interface ExportedTrigger {
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Exported randomization bucket structure (schema-compliant)
 */
export interface ExportedRandomizationBucket {
  id: string;
  name: string;
  selection: "one" | "n";
  n?: number;
  weighted?: boolean;
  noImmediateRepeat?: boolean;
  members: ExportedRandomizationBucketMember[];
}

/**
 * Exported randomization bucket member structure (schema-compliant)
 */
export interface ExportedRandomizationBucketMember {
  spawnAssetId: string;
  weight?: number;
}

/**
 * Exported asset settings structure (schema-compliant)
 */
export interface ExportedAssetSettings {
  volume?: number;
  width?: number;
  height?: number;
  scale?: number;
  positionMode?: "absolute" | "relative" | "centered";
  x?: number;
  y?: number;
  loop?: boolean;
  autoplay?: boolean;
  muted?: boolean;
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
      // Get data from services
      const profiles = SpawnProfileService.getAllProfiles();
      const assets = AssetService.getAssets();

      // Validate that we have data to export
      if (profiles.length === 0 && assets.length === 0) {
        return {
          success: false,
          error:
            "No data available to export. Please create profiles and assets first.",
        };
      }

      // Transform data to exported format
      const exportedProfiles = profiles.map((profile) =>
        this.transformProfileForExport(profile)
      );
      const exportedAssets = assets.map((asset) =>
        this.transformAssetForExport(asset)
      );

      // Validate transformed data
      const validation = this.validateExportedData(
        exportedProfiles,
        exportedAssets
      );
      if (!validation.isValid) {
        return {
          success: false,
          error: `Export validation failed: ${validation.errors.join(", ")}`,
        };
      }

      // Create configuration object
      const config: MediaSpawnerConfig = {
        version: this.CONFIG_VERSION,
        profiles: exportedProfiles,
        assets: exportedAssets,
      };

      // Serialize to JSON with proper formatting
      const jsonData = JSON.stringify(config, null, 2);

      // Validate JSON serialization
      try {
        JSON.parse(jsonData);
      } catch {
        return {
          success: false,
          error: "Failed to serialize configuration to JSON",
        };
      }

      // Create metadata
      const metadata: ExportMetadata = {
        exportedAt: new Date().toISOString(),
        version: this.CONFIG_VERSION,
        profileCount: profiles.length,
        assetCount: assets.length,
        spawnCount: profiles.reduce(
          (total, profile) => total + profile.spawns.length,
          0
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
    options: ImportOptions = DEFAULT_IMPORT_OPTIONS
  ): Promise<ImportResult> {
    try {
      // Parse JSON data
      const config = JSON.parse(jsonData) as MediaSpawnerConfig;

      // Validate the imported configuration
      const validation = this.validateImportedConfig(config);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid configuration: ${validation.errors.join(", ")}`,
        };
      }

      // Transform imported data back to internal format
      const importedProfiles = config.profiles.map((profile) =>
        this.transformProfileFromImport(profile)
      );
      const importedAssets = config.assets.map((asset) =>
        this.transformAssetFromImport(asset)
      );

      // Validate transformed data
      const dataValidation = this.validateImportedData(
        importedProfiles,
        importedAssets
      );
      if (!dataValidation.isValid) {
        return {
          success: false,
          error: `Data validation failed: ${dataValidation.errors.join(", ")}`,
        };
      }

      // Handle conflicts and merge data
      const mergeResult = await this.mergeImportedData(
        importedProfiles,
        importedAssets,
        options
      );

      if (!mergeResult.success) {
        return {
          success: false,
          error: mergeResult.error,
        };
      }

      // Update working directory if requested
      if (options.updateWorkingDirectory && config.profiles.length > 0) {
        const firstProfile = config.profiles[0];
        if (firstProfile.workingDirectory) {
          const settingsResult = SettingsService.updateWorkingDirectory(
            firstProfile.workingDirectory
          );
          if (!settingsResult.success) {
            console.warn(
              "Failed to update working directory:",
              settingsResult.error
            );
          }
        }
      }

      // Create metadata
      const metadata: ImportMetadata = {
        importedAt: new Date().toISOString(),
        version: config.version,
        profileCount: mergeResult.profiles.length,
        assetCount: mergeResult.assets.length,
        spawnCount: mergeResult.profiles.reduce(
          (total, profile) => total + profile.spawns.length,
          0
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
  static validateImportedConfig(config: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config || typeof config !== "object") {
      errors.push("Configuration must be an object");
      return { isValid: false, errors, warnings };
    }

    const configObj = config as Record<string, unknown>;

    // Check required fields
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
        `Version mismatch: expected ${this.CONFIG_VERSION}, got ${configObj.version}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate exported data before serialization
   */
  private static validateExportedData(
    profiles: ExportedSpawnProfile[],
    assets: ExportedAsset[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate profiles
    profiles.forEach((profile, index) => {
      if (!profile.id || typeof profile.id !== "string") {
        errors.push(`Profile ${index} has invalid ID`);
      }
      if (!profile.name || typeof profile.name !== "string") {
        errors.push(`Profile ${index} has invalid name`);
      }
      if (!Array.isArray(profile.spawns)) {
        errors.push(`Profile ${index} has invalid spawns array`);
      }
      if (typeof profile.workingDirectory !== "string") {
        errors.push(`Profile ${index} has invalid workingDirectory`);
      }
      if (!profile.lastModified || typeof profile.lastModified !== "string") {
        errors.push(`Profile ${index} has invalid lastModified`);
      }
    });

    // Validate assets
    assets.forEach((asset, index) => {
      if (!asset.id || typeof asset.id !== "string") {
        errors.push(`Asset ${index} has invalid ID`);
      }
      if (!asset.name || typeof asset.name !== "string") {
        errors.push(`Asset ${index} has invalid name`);
      }
      if (!asset.path || typeof asset.path !== "string") {
        errors.push(`Asset ${index} has invalid path`);
      }
      if (typeof asset.isUrl !== "boolean") {
        errors.push(`Asset ${index} has invalid isUrl`);
      }
      if (!asset.type || !["image", "video", "audio"].includes(asset.type)) {
        errors.push(`Asset ${index} has invalid type`);
      }
    });

    // Check for duplicate IDs
    const profileIds = profiles.map((p) => p.id);
    const duplicateProfileIds = profileIds.filter(
      (id, index) => profileIds.indexOf(id) !== index
    );
    if (duplicateProfileIds.length > 0) {
      errors.push(
        `Duplicate profile IDs found: ${duplicateProfileIds.join(", ")}`
      );
    }

    const assetIds = assets.map((a) => a.id);
    const duplicateAssetIds = assetIds.filter(
      (id, index) => assetIds.indexOf(id) !== index
    );
    if (duplicateAssetIds.length > 0) {
      errors.push(`Duplicate asset IDs found: ${duplicateAssetIds.join(", ")}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate imported data after transformation
   */
  private static validateImportedData(
    profiles: SpawnProfile[],
    assets: MediaAsset[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate profiles
    profiles.forEach((profile, index) => {
      const profileValidation = validateSpawnProfile(profile);
      if (!profileValidation.isValid) {
        errors.push(`Profile ${index}: ${profileValidation.errors.join(", ")}`);
      }

      // Validate spawns within profile
      profile.spawns.forEach((spawn, spawnIndex) => {
        const spawnValidation = validateSpawn(spawn);
        if (!spawnValidation.isValid) {
          errors.push(
            `Profile ${index}, Spawn ${spawnIndex}: ${spawnValidation.errors.join(
              ", "
            )}`
          );
        }

        // Validate triggers
        const triggerValidation = validateTrigger(spawn.trigger);
        if (!triggerValidation.isValid) {
          errors.push(
            `Profile ${index}, Spawn ${spawnIndex}, Trigger: ${triggerValidation.errors.join(
              ", "
            )}`
          );
        }
        warnings.push(...triggerValidation.warnings);
      });
    });

    // Validate assets
    assets.forEach((asset, index) => {
      if (!asset.id || typeof asset.id !== "string") {
        errors.push(`Asset ${index} has invalid ID`);
      }
      if (!asset.name || typeof asset.name !== "string") {
        errors.push(`Asset ${index} has invalid name`);
      }
      if (!asset.path || typeof asset.path !== "string") {
        errors.push(`Asset ${index} has invalid path`);
      }
      if (typeof asset.isUrl !== "boolean") {
        errors.push(`Asset ${index} has invalid isUrl`);
      }
      if (!asset.type || !["image", "video", "audio"].includes(asset.type)) {
        errors.push(`Asset ${index} has invalid type`);
      }
    });

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
    options: ImportOptions
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

      // Get existing data
      const existingProfiles = SpawnProfileService.getAllProfiles();
      const existingAssets = AssetService.getAssets();

      // Handle asset conflicts
      const mergedAssets = [...existingAssets];
      const assetIdMap = new Map<string, string>(); // old ID -> new ID mapping

      for (const importedAsset of importedAssets) {
        const existingAsset = existingAssets.find(
          (asset) => asset.id === importedAsset.id
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
                (asset) => asset.id === importedAsset.id
              );
              if (assetIndex !== -1) {
                mergedAssets[assetIndex] = importedAsset;
              }
              assetIdMap.set(importedAsset.id, importedAsset.id);
              break;
            }
            case "rename": {
              // Create new asset with new ID
              const newAsset = { ...importedAsset, id: crypto.randomUUID() };
              mergedAssets.push(newAsset);
              assetIdMap.set(importedAsset.id, newAsset.id);
              break;
            }
          }
        } else {
          // No conflict, add asset
          mergedAssets.push(importedAsset);
          assetIdMap.set(importedAsset.id, importedAsset.id);
        }
      }

      // Handle profile conflicts
      const mergedProfiles = [...existingProfiles];

      for (const importedProfile of importedProfiles) {
        const existingProfile = existingProfiles.find(
          (profile) => profile.id === importedProfile.id
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
                (profile) => profile.id === importedProfile.id
              );
              if (profileIndex !== -1) {
                mergedProfiles[profileIndex] = importedProfile;
              }
              break;
            }
            case "rename": {
              // Create new profile with new ID and update asset references
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
          // No conflict, add profile with updated asset references
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

      // Validate asset references
      if (options.validateAssetReferences) {
        for (const profile of mergedProfiles) {
          for (const spawn of profile.spawns) {
            for (const spawnAsset of spawn.assets) {
              const assetExists = mergedAssets.some(
                (asset) => asset.id === spawnAsset.assetId
              );
              if (!assetExists) {
                conflicts.invalidAssetReferences.push(
                  `Profile "${profile.name}", Spawn "${spawn.name}": Asset "${spawnAsset.assetId}" not found`
                );
              }
            }
          }
        }
      }

      // Save merged data
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

  /**
   * Transform internal spawn profile to exported format
   */
  private static transformProfileForExport(
    profile: SpawnProfile
  ): ExportedSpawnProfile {
    const settings = SettingsService.getSettings();
    return {
      id: profile.id,
      name: profile.name,
      description: profile.description,
      workingDirectory: settings.workingDirectory || "",
      spawns: profile.spawns.map((spawn) =>
        this.transformSpawnForExport(spawn)
      ),
      lastModified: new Date(profile.lastModified).toISOString(),
    };
  }

  /**
   * Transform internal spawn to exported format
   */
  private static transformSpawnForExport(spawn: Spawn): ExportedSpawn {
    return {
      id: spawn.id,
      name: spawn.name,
      description: spawn.description,
      enabled: spawn.enabled,
      trigger: this.transformTriggerForExport(spawn.trigger),
      duration: spawn.duration,
      assets: spawn.assets.map((asset) =>
        this.transformSpawnAssetForExport(asset)
      ),
      randomizationBuckets: spawn.randomizationBuckets?.map((bucket) =>
        this.transformRandomizationBucketForExport(bucket)
      ),
      defaultProperties: spawn.defaultProperties
        ? this.transformAssetSettingsForExport(spawn.defaultProperties)
        : undefined,
    };
  }

  /**
   * Transform internal spawn asset to exported format
   */
  private static transformSpawnAssetForExport(
    asset: SpawnAsset
  ): ExportedSpawnAsset {
    return {
      assetId: asset.assetId,
      id: asset.id,
      enabled: asset.enabled,
      order: asset.order,
      overrides:
        asset.overrides.duration || asset.overrides.properties
          ? {
              duration: asset.overrides.duration,
              properties: asset.overrides.properties
                ? this.transformAssetSettingsForExport(
                    asset.overrides.properties
                  )
                : undefined,
            }
          : undefined,
    };
  }

  /**
   * Transform internal asset to exported format
   */
  private static transformAssetForExport(asset: MediaAsset): ExportedAsset {
    return {
      id: asset.id,
      name: asset.name,
      path: asset.path,
      isUrl: asset.isUrl,
      type: asset.type,
    };
  }

  /**
   * Transform internal trigger to exported format
   */
  private static transformTriggerForExport(trigger: Trigger): ExportedTrigger {
    return {
      type: trigger.type,
      enabled: trigger.enabled ?? true,
      config: trigger.config || {},
    };
  }

  /**
   * Transform internal randomization bucket to exported format
   */
  private static transformRandomizationBucketForExport(
    bucket: RandomizationBucket
  ): ExportedRandomizationBucket {
    return {
      id: bucket.id,
      name: bucket.name,
      selection: bucket.selection,
      n: bucket.n,
      weighted: bucket.weighted,
      noImmediateRepeat: bucket.noImmediateRepeat,
      members: bucket.members.map((member) => ({
        spawnAssetId: member.spawnAssetId,
        weight: member.weight,
      })),
    };
  }

  /**
   * Transform internal asset settings to exported format
   */
  private static transformAssetSettingsForExport(
    settings: Partial<MediaAssetProperties>
  ): ExportedAssetSettings {
    return {
      volume: settings.volume,
      width: settings.dimensions?.width,
      height: settings.dimensions?.height,
      scale: settings.scale,
      positionMode: settings.positionMode,
      x: settings.position?.x,
      y: settings.position?.y,
      loop: settings.loop,
      autoplay: settings.autoplay,
      muted: settings.muted,
    };
  }

  /**
   * Transform imported profile back to internal format
   */
  private static transformProfileFromImport(
    profile: ExportedSpawnProfile
  ): SpawnProfile {
    return {
      id: profile.id,
      name: profile.name,
      description: profile.description,
      spawns: profile.spawns.map((spawn) =>
        this.transformSpawnFromImport(spawn)
      ),
      lastModified: new Date(profile.lastModified).getTime(),
      isActive: false, // Imported profiles are not active by default
    };
  }

  /**
   * Transform imported spawn back to internal format
   */
  private static transformSpawnFromImport(spawn: ExportedSpawn): Spawn {
    return {
      id: spawn.id,
      name: spawn.name,
      description: spawn.description,
      enabled: spawn.enabled,
      trigger: this.transformTriggerFromImport(spawn.trigger),
      duration: spawn.duration,
      assets: spawn.assets.map((asset) =>
        this.transformSpawnAssetFromImport(asset)
      ),
      randomizationBuckets: spawn.randomizationBuckets?.map((bucket) =>
        this.transformRandomizationBucketFromImport(bucket)
      ),
      defaultProperties: spawn.defaultProperties
        ? this.transformAssetSettingsFromImport(spawn.defaultProperties)
        : undefined,
      lastModified: Date.now(),
      order: 0, // Will be set by the service when adding to profile
    };
  }

  /**
   * Transform imported spawn asset back to internal format
   */
  private static transformSpawnAssetFromImport(
    asset: ExportedSpawnAsset
  ): SpawnAsset {
    return {
      assetId: asset.assetId,
      id: asset.id,
      enabled: asset.enabled,
      order: asset.order,
      overrides: asset.overrides
        ? {
            duration: asset.overrides.duration,
            properties: asset.overrides.properties
              ? this.transformAssetSettingsFromImport(
                  asset.overrides.properties
                )
              : undefined,
          }
        : {},
    };
  }

  /**
   * Transform imported asset back to internal format
   */
  private static transformAssetFromImport(asset: ExportedAsset): MediaAsset {
    return {
      id: asset.id,
      name: asset.name,
      path: asset.path,
      isUrl: asset.isUrl,
      type: asset.type,
    };
  }

  /**
   * Transform imported trigger back to internal format
   */
  private static transformTriggerFromImport(trigger: ExportedTrigger): Trigger {
    return {
      type: trigger.type as Trigger["type"],
      enabled: trigger.enabled,
      config: trigger.config as Trigger["config"],
    } as Trigger;
  }

  /**
   * Transform imported randomization bucket back to internal format
   */
  private static transformRandomizationBucketFromImport(
    bucket: ExportedRandomizationBucket
  ): RandomizationBucket {
    return {
      id: bucket.id,
      name: bucket.name,
      selection: bucket.selection,
      n: bucket.n,
      weighted: bucket.weighted,
      noImmediateRepeat: bucket.noImmediateRepeat,
      members: bucket.members.map((member) => ({
        spawnAssetId: member.spawnAssetId,
        weight: member.weight,
      })),
    };
  }

  /**
   * Transform imported asset settings back to internal format
   */
  private static transformAssetSettingsFromImport(
    settings: ExportedAssetSettings
  ): Partial<MediaAssetProperties> {
    const result: Partial<MediaAssetProperties> = {};

    if (settings.volume !== undefined) result.volume = settings.volume;
    if (settings.scale !== undefined) result.scale = settings.scale;
    if (settings.positionMode !== undefined)
      result.positionMode = settings.positionMode;
    if (settings.loop !== undefined) result.loop = settings.loop;
    if (settings.autoplay !== undefined) result.autoplay = settings.autoplay;
    if (settings.muted !== undefined) result.muted = settings.muted;

    if (settings.width !== undefined || settings.height !== undefined) {
      result.dimensions = {
        width: settings.width ?? 100,
        height: settings.height ?? 100,
      };
    }

    if (settings.x !== undefined || settings.y !== undefined) {
      result.position = {
        x: settings.x ?? 0,
        y: settings.y ?? 0,
      };
    }

    return result;
  }
}
