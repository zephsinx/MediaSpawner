import type { MediaAsset, MediaAssetProperties } from "../types/media";
import { createMediaAsset } from "../types/media";
import type { SpawnAssetOverrides, SpawnTrigger } from "../types/spawn";
import {
  CacheService,
  CACHE_KEYS,
  getSpawnAssetCacheKey,
} from "./cacheService";
import { SpawnService } from "./spawnService";

const STORAGE_KEY = "mediaspawner_assets";
const SPAWN_ASSET_SETTINGS_KEY = "mediaspawner_spawn_asset_settings";

// New hierarchical storage structure for better performance
interface SpawnAssetSettingsStructure {
  spawns: {
    [spawnId: string]: {
      assets: {
        [assetId: string]: SpawnAssetOverrides;
      };
    };
  };
}

/**
 * Result of asset validation
 */
export interface AssetValidationResult {
  asset: MediaAsset;
  isValid: boolean;
  error?: string;
}

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  removedAssets: MediaAsset[];
  remainingAssets: MediaAsset[];
  totalRemoved: number;
}

/**
 * Result of spawn asset settings operations
 */
export interface SpawnAssetSettingsResult {
  success: boolean;
  settings?: SpawnAssetOverrides;
  error?: string;
}

/**
 * Service for managing media assets in localStorage
 */
export class AssetService {
  /**
   * Get all assets from storage with caching
   */
  static getAssets(): MediaAsset[] {
    return CacheService.get(CACHE_KEYS.ASSETS, () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          return [];
        }
        const assets = JSON.parse(stored);
        return Array.isArray(assets) ? assets : [];
      } catch (error) {
        console.error("Failed to load assets from storage:", error);
        return [];
      }
    });
  }

  /**
   * Save assets to storage and invalidate cache
   */
  static saveAssets(assets: MediaAsset[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
      // Invalidate cache after successful write
      CacheService.invalidate(CACHE_KEYS.ASSETS);
    } catch (error) {
      console.error("Failed to save assets to storage:", error);
    }
  }

  /**
   * Add a new asset
   */
  static addAsset(
    type: MediaAsset["type"],
    name: string,
    path: string
  ): MediaAsset {
    const asset = createMediaAsset(type, name, path);
    const assets = this.getAssets();
    assets.push(asset);
    this.saveAssets(assets);
    return asset;
  }

  /**
   * Delete an asset by ID
   */
  static deleteAsset(assetId: string): boolean {
    const assets = this.getAssets();
    const initialLength = assets.length;
    const filteredAssets = assets.filter((asset) => asset.id !== assetId);

    if (filteredAssets.length !== initialLength) {
      this.saveAssets(filteredAssets);
      return true;
    }

    return false;
  }

  /**
   * Update an existing asset
   */
  static updateAsset(updatedAsset: MediaAsset): boolean {
    const assets = this.getAssets();
    const index = assets.findIndex((asset) => asset.id === updatedAsset.id);

    if (index !== -1) {
      assets[index] = updatedAsset;
      this.saveAssets(assets);
      return true;
    }

    return false;
  }

  /**
   * Get an asset by ID
   */
  static getAssetById(assetId: string): MediaAsset | undefined {
    const assets = this.getAssets();
    return assets.find((asset) => asset.id === assetId);
  }

  /**
   * Clear all assets and invalidate cache
   */
  static clearAssets(): void {
    localStorage.removeItem(STORAGE_KEY);
    // Invalidate cache after successful clear
    CacheService.invalidate(CACHE_KEYS.ASSETS);
  }

  /**
   * Get assets filtered by type
   */
  static getAssetsByType(type: MediaAsset["type"]): MediaAsset[] {
    const assets = this.getAssets();
    return assets.filter((asset) => asset.type === type);
  }

  /**
   * Search assets by name or path
   */
  static searchAssets(query: string): MediaAsset[] {
    if (!query.trim()) {
      return this.getAssets();
    }

    const assets = this.getAssets();
    const searchLower = query.toLowerCase();

    return assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(searchLower) ||
        asset.path.toLowerCase().includes(searchLower)
    );
  }

  /**
   * Get assets with combined search and type filtering
   */
  static searchAndFilterAssets(
    searchQuery: string = "",
    typeFilter: MediaAsset["type"] | "all" = "all"
  ): MediaAsset[] {
    let assets = this.getAssets();

    // Apply type filter
    if (typeFilter !== "all") {
      assets = assets.filter((asset) => asset.type === typeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      assets = assets.filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchLower) ||
          asset.path.toLowerCase().includes(searchLower)
      );
    }

    return assets;
  }

  /**
   * Get assets filtered by URL type (URL vs local files)
   */
  static getAssetsByUrlType(isUrl: boolean): MediaAsset[] {
    const assets = this.getAssets();
    return assets.filter((asset) => asset.isUrl === isUrl);
  }

  /**
   * Get all assets that are URLs (web-hosted)
   */
  static getUrlAssets(): MediaAsset[] {
    return this.getAssetsByUrlType(true);
  }

  /**
   * Get all assets that are local files
   */
  static getLocalAssets(): MediaAsset[] {
    return this.getAssetsByUrlType(false);
  }

  /**
   * Get comprehensive statistics about assets including URL/local breakdown
   */
  static getAssetStats(): {
    total: number;
    images: number;
    videos: number;
    audio: number;
    urls: number;
    local: number;
  } {
    const assets = this.getAssets();
    return {
      total: assets.length,
      images: assets.filter((asset) => asset.type === "image").length,
      videos: assets.filter((asset) => asset.type === "video").length,
      audio: assets.filter((asset) => asset.type === "audio").length,
      urls: assets.filter((asset) => asset.isUrl === true).length,
      local: assets.filter((asset) => asset.isUrl === false).length,
    };
  }

  /**
   * Validate if a file path or URL is accessible
   */
  static async validateAssetReference(
    asset: MediaAsset
  ): Promise<AssetValidationResult> {
    const result: AssetValidationResult = {
      asset,
      isValid: false,
    };

    try {
      if (this.isUrlPath(asset.path)) {
        // Validate URL accessibility
        result.isValid = await this.validateUrl(asset.path);
        if (!result.isValid) {
          result.error = "URL is not accessible";
        }
      } else {
        // For local file paths, we can only do basic format validation
        // since we can't actually access the file system from the browser
        result.isValid = this.isValidFilePath(asset.path);
        if (!result.isValid) {
          result.error = "Invalid file path format";
        }
      }
    } catch (error) {
      result.isValid = false;
      result.error =
        error instanceof Error ? error.message : "Validation failed";
    }

    return result;
  }

  /**
   * Validate multiple assets and return results
   */
  static async validateAllAssets(): Promise<AssetValidationResult[]> {
    const assets = this.getAssets();
    const validationPromises = assets.map((asset) =>
      this.validateAssetReference(asset)
    );
    return Promise.all(validationPromises);
  }

  /**
   * Get broken asset references (URLs that are not accessible)
   */
  static async getBrokenReferences(): Promise<AssetValidationResult[]> {
    const validationResults = await this.validateAllAssets();
    return validationResults.filter((result) => !result.isValid);
  }

  /**
   * Clean up broken references
   */
  static async cleanupBrokenReferences(): Promise<CleanupResult> {
    const validationResults = await this.validateAllAssets();

    const brokenAssets: MediaAsset[] = [];
    const validAssets: MediaAsset[] = [];

    validationResults.forEach((result) => {
      if (result.isValid) {
        validAssets.push(result.asset);
      } else {
        brokenAssets.push(result.asset);
      }
    });

    // Save only valid assets back to storage
    this.saveAssets(validAssets);

    return {
      removedAssets: brokenAssets,
      remainingAssets: validAssets,
      totalRemoved: brokenAssets.length,
    };
  }

  /**
   * Remove specific broken references by asset IDs
   */
  static removeBrokenReferences(assetIds: string[]): CleanupResult {
    const assets = this.getAssets();
    const removedAssets: MediaAsset[] = [];
    const remainingAssets: MediaAsset[] = [];

    assets.forEach((asset) => {
      if (assetIds.includes(asset.id)) {
        removedAssets.push(asset);
      } else {
        remainingAssets.push(asset);
      }
    });

    this.saveAssets(remainingAssets);

    return {
      removedAssets,
      remainingAssets,
      totalRemoved: removedAssets.length,
    };
  }

  /**
   * Validate asset data integrity
   */
  static validateAssetIntegrity(): {
    validAssets: MediaAsset[];
    invalidAssets: unknown[];
    corruptedData: boolean;
  } {
    const validAssets: MediaAsset[] = [];
    const invalidAssets: unknown[] = [];
    let corruptedData = false;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { validAssets: [], invalidAssets: [], corruptedData: false };
      }

      const parsedData = JSON.parse(stored);
      if (!Array.isArray(parsedData)) {
        corruptedData = true;
        return { validAssets: [], invalidAssets: [parsedData], corruptedData };
      }

      parsedData.forEach((item) => {
        if (this.isValidAssetObject(item)) {
          validAssets.push(item as MediaAsset);
        } else {
          invalidAssets.push(item);
        }
      });
    } catch (error) {
      console.error("Failed to validate asset data integrity:", error);
      corruptedData = true;
    }

    return { validAssets, invalidAssets, corruptedData };
  }

  /**
   * Repair corrupted asset data by removing invalid entries
   */
  static repairAssetData(): {
    repaired: boolean;
    removedEntries: number;
    validAssets: MediaAsset[];
  } {
    const integrity = this.validateAssetIntegrity();

    if (integrity.corruptedData || integrity.invalidAssets.length > 0) {
      // Save only valid assets
      this.saveAssets(integrity.validAssets);

      return {
        repaired: true,
        removedEntries: integrity.invalidAssets.length,
        validAssets: integrity.validAssets,
      };
    }

    return {
      repaired: false,
      removedEntries: 0,
      validAssets: integrity.validAssets,
    };
  }

  /**
   * Get spawn-specific asset settings
   */
  static getSpawnAssetSettings(
    spawnId: string,
    assetId: string
  ): SpawnAssetOverrides | null {
    try {
      const cacheKey = getSpawnAssetCacheKey(spawnId, assetId);
      return CacheService.get(cacheKey, () => {
        try {
          const stored = localStorage.getItem(SPAWN_ASSET_SETTINGS_KEY);
          if (!stored) {
            return null;
          }

          const structure: SpawnAssetSettingsStructure = JSON.parse(stored);
          return structure.spawns?.[spawnId]?.assets?.[assetId] || null;
        } catch (error) {
          console.error("Failed to load spawn asset settings:", error);
          return null;
        }
      });
    } catch (error) {
      console.error("Failed to get spawn asset settings:", error);
      return null;
    }
  }

  /**
   * Set spawn-specific asset settings
   */
  static async setSpawnAssetSettings(
    spawnId: string,
    assetId: string,
    settings: SpawnAssetOverrides
  ): Promise<SpawnAssetSettingsResult> {
    try {
      // Validate that the spawn and asset exist
      const spawn = await SpawnService.getSpawn(spawnId);
      if (!spawn) {
        return {
          success: false,
          error: `Spawn with ID "${spawnId}" not found`,
        };
      }

      const asset = this.getAssetById(assetId);
      if (!asset) {
        return {
          success: false,
          error: `Asset with ID "${assetId}" not found`,
        };
      }

      // Load existing structure
      const stored = localStorage.getItem(SPAWN_ASSET_SETTINGS_KEY);
      const structure: SpawnAssetSettingsStructure = stored
        ? JSON.parse(stored)
        : { spawns: {} };

      // Initialize spawn if it doesn't exist
      if (!structure.spawns[spawnId]) {
        structure.spawns[spawnId] = { assets: {} };
      }

      // Update settings for this spawn-asset combination
      structure.spawns[spawnId].assets[assetId] = settings;

      // Save back to localStorage
      localStorage.setItem(SPAWN_ASSET_SETTINGS_KEY, JSON.stringify(structure));

      // Invalidate related cache entries
      CacheService.invalidateSpawnAssetSettings(spawnId, assetId);

      return {
        success: true,
        settings,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save spawn asset settings",
      };
    }
  }

  /**
   * Get resolved asset settings for a specific spawn-asset combination
   * This implements the inheritance model: Spawn defaults → Asset defaults → SpawnAsset overrides
   */
  static async getResolvedAssetSettings(
    spawnId: string,
    assetId: string
  ): Promise<{
    duration: number;
    trigger: SpawnTrigger;
    properties: MediaAssetProperties;
  } | null> {
    try {
      // Get spawn defaults
      const spawn = await SpawnService.getSpawn(spawnId);
      if (!spawn) {
        return null;
      }

      // Get asset defaults
      const asset = this.getAssetById(assetId);
      if (!asset) {
        return null;
      }

      // Get spawn-specific overrides
      const overrides = this.getSpawnAssetSettings(spawnId, assetId) || {};

      // Resolve settings with inheritance priority:
      // 1. SpawnAsset overrides (highest priority)
      // 2. Asset defaults (medium priority)
      // 3. Spawn defaults (lowest priority)

      const resolvedSettings = {
        duration: overrides.duration ?? spawn.duration,
        trigger: overrides.trigger ?? spawn.trigger,
        properties: {
          ...asset.properties,
          ...(overrides.properties || {}),
        },
      };

      return resolvedSettings;
    } catch (error) {
      console.error("Failed to resolve asset settings:", error);
      return null;
    }
  }

  /**
   * Remove spawn-specific asset settings
   */
  static removeSpawnAssetSettings(
    spawnId: string,
    assetId: string
  ): SpawnAssetSettingsResult {
    try {
      const stored = localStorage.getItem(SPAWN_ASSET_SETTINGS_KEY);
      if (!stored) {
        return { success: true };
      }

      const structure: SpawnAssetSettingsStructure = JSON.parse(stored);

      if (structure.spawns?.[spawnId]?.assets?.[assetId]) {
        delete structure.spawns[spawnId].assets[assetId];

        // Remove empty spawn entry if no assets remain
        if (Object.keys(structure.spawns[spawnId].assets).length === 0) {
          delete structure.spawns[spawnId];
        }

        localStorage.setItem(
          SPAWN_ASSET_SETTINGS_KEY,
          JSON.stringify(structure)
        );

        // Invalidate related cache entries
        CacheService.invalidateSpawnAssetSettings(spawnId, assetId);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove spawn asset settings",
      };
    }
  }

  /**
   * Get all spawn-specific settings for a given spawn
   */
  static getSpawnAssetSettingsForSpawn(
    spawnId: string
  ): Record<string, SpawnAssetOverrides> {
    try {
      const stored = localStorage.getItem(SPAWN_ASSET_SETTINGS_KEY);
      if (!stored) {
        return {};
      }

      const structure: SpawnAssetSettingsStructure = JSON.parse(stored);
      return structure.spawns?.[spawnId]?.assets || {};
    } catch (error) {
      console.error("Failed to get spawn asset settings for spawn:", error);
      return {};
    }
  }

  /**
   * Get all spawn-specific settings for a given spawn (optimized for UI rendering)
   */
  static getSpawnAssetSettingsForSpawnOptimized(
    spawnId: string
  ): Array<{ assetId: string; settings: SpawnAssetOverrides }> {
    try {
      const stored = localStorage.getItem(SPAWN_ASSET_SETTINGS_KEY);
      if (!stored) {
        return [];
      }

      const structure: SpawnAssetSettingsStructure = JSON.parse(stored);
      const spawnData = structure.spawns?.[spawnId];

      if (!spawnData) {
        return [];
      }

      return Object.entries(spawnData.assets).map(([assetId, settings]) => ({
        assetId,
        settings,
      }));
    } catch (error) {
      console.error(
        "Failed to get spawn asset settings for spawn (optimized):",
        error
      );
      return [];
    }
  }

  /**
   * Get all spawn-specific settings for a given asset
   */
  static getSpawnAssetSettingsForAsset(
    assetId: string
  ): Record<string, SpawnAssetOverrides> {
    try {
      const stored = localStorage.getItem(SPAWN_ASSET_SETTINGS_KEY);
      if (!stored) {
        return {};
      }

      const structure: SpawnAssetSettingsStructure = JSON.parse(stored);
      const assetSettings: Record<string, SpawnAssetOverrides> = {};

      // Find all spawns that have settings for this asset
      Object.entries(structure.spawns).forEach(([spawnId, spawnData]) => {
        if (spawnData.assets[assetId]) {
          assetSettings[spawnId] = spawnData.assets[assetId];
        }
      });

      return assetSettings;
    } catch (error) {
      console.error("Failed to get spawn asset settings for asset:", error);
      return {};
    }
  }

  /**
   * Clear all spawn-specific asset settings
   */
  static clearSpawnAssetSettings(): void {
    try {
      localStorage.removeItem(SPAWN_ASSET_SETTINGS_KEY);
      CacheService.invalidateAllSpawnAssetSettings();
    } catch (error) {
      console.error("Failed to clear spawn asset settings:", error);
    }
  }

  /**
   * Get statistics about spawn asset settings storage
   */
  static getSpawnAssetSettingsStats(): {
    totalSpawns: number;
    totalSettings: number;
    spawnsWithSettings: number;
    averageSettingsPerSpawn: number;
  } {
    try {
      const stored = localStorage.getItem(SPAWN_ASSET_SETTINGS_KEY);
      if (!stored) {
        return {
          totalSpawns: 0,
          totalSettings: 0,
          spawnsWithSettings: 0,
          averageSettingsPerSpawn: 0,
        };
      }

      const structure: SpawnAssetSettingsStructure = JSON.parse(stored);
      const spawns = Object.keys(structure.spawns);
      const totalSpawns = spawns.length;

      let totalSettings = 0;
      spawns.forEach((spawnId) => {
        totalSettings += Object.keys(structure.spawns[spawnId].assets).length;
      });

      return {
        totalSpawns,
        totalSettings,
        spawnsWithSettings: totalSpawns,
        averageSettingsPerSpawn:
          totalSpawns > 0 ? totalSettings / totalSpawns : 0,
      };
    } catch (error) {
      console.error("Failed to get spawn asset settings stats:", error);
      return {
        totalSpawns: 0,
        totalSettings: 0,
        spawnsWithSettings: 0,
        averageSettingsPerSpawn: 0,
      };
    }
  }

  /**
   * Clean up orphaned spawn asset settings (when spawns or assets are deleted)
   */
  static async cleanupOrphanedSpawnAssetSettings(): Promise<{
    removedSettings: number;
    remainingSettings: number;
  }> {
    try {
      const stored = localStorage.getItem(SPAWN_ASSET_SETTINGS_KEY);
      if (!stored) {
        return Promise.resolve({ removedSettings: 0, remainingSettings: 0 });
      }

      const structure: SpawnAssetSettingsStructure = JSON.parse(stored);
      const validStructure: SpawnAssetSettingsStructure = { spawns: {} };
      let removedCount = 0;

      // Check each spawn and its assets to ensure they still exist
      for (const [spawnId, spawnData] of Object.entries(structure.spawns)) {
        const spawn = await SpawnService.getSpawn(spawnId);
        if (!spawn) {
          removedCount += Object.keys(spawnData.assets).length;
          continue;
        }
        const validAssets: Record<string, SpawnAssetOverrides> = {};
        for (const [assetId, settings] of Object.entries(spawnData.assets)) {
          const asset = this.getAssetById(assetId);
          if (asset) {
            validAssets[assetId] = settings;
          } else {
            removedCount++;
          }
        }
        if (Object.keys(validAssets).length > 0) {
          validStructure.spawns[spawnId] = { assets: validAssets };
        }
      }

      // Save back only valid structure
      localStorage.setItem(
        SPAWN_ASSET_SETTINGS_KEY,
        JSON.stringify(validStructure)
      );

      // Invalidate all spawn-asset settings cache since we've modified the data
      CacheService.invalidateAllSpawnAssetSettings();

      const remainingSettings = Object.values(validStructure.spawns).reduce(
        (total, spawnData) => total + Object.keys(spawnData.assets).length,
        0
      );

      return Promise.resolve({
        removedSettings: removedCount,
        remainingSettings,
      });
    } catch (error) {
      console.error("Failed to cleanup orphaned spawn asset settings:", error);
      return Promise.resolve({ removedSettings: 0, remainingSettings: 0 });
    }
  }

  // Helper methods for validation

  /**
   * Check if path is a URL
   */
  private static isUrlPath(path: string): boolean {
    return path.startsWith("http://") || path.startsWith("https://");
  }

  /**
   * Validate URL accessibility
   */
  private static async validateUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Validate file path format
   */
  private static isValidFilePath(path: string): boolean {
    if (!path || path.trim().length === 0) {
      return false;
    }

    // Check for invalid characters that are not allowed in file paths
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(path)) {
      return false;
    }

    // Check for supported file extensions
    const supportedExtensions = [
      // Images
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "bmp",
      "svg",
      // Videos
      "mp4",
      "webm",
      "mov",
      "avi",
      "mkv",
      "wmv",
      // Audio
      "mp3",
      "wav",
      "ogg",
      "m4a",
      "aac",
      "flac",
    ];

    const extension = path.split(".").pop()?.toLowerCase();
    return extension ? supportedExtensions.includes(extension) : false;
  }

  /**
   * Check if an object is a valid MediaAsset
   */
  private static isValidAssetObject(obj: unknown): obj is MediaAsset {
    if (!obj || typeof obj !== "object") {
      return false;
    }

    const record = obj as Record<string, unknown>;
    return (
      typeof record.id === "string" &&
      typeof record.name === "string" &&
      typeof record.path === "string" &&
      typeof record.type === "string" &&
      ["image", "video", "audio"].includes(record.type as string) &&
      typeof record.isUrl === "boolean" &&
      typeof record.properties === "object"
    );
  }
}
