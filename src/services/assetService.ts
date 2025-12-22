import type { MediaAsset, MediaAssetProperties } from "../types/media";
import { createMediaAsset } from "../types/media";
import type { Trigger } from "../types/spawn";
import { CacheService, CACHE_KEYS } from "./cacheService";
import { STORAGE_KEYS } from "./constants";
import { SpawnService } from "./spawnService";
import { SpawnProfileService } from "./spawnProfileService";
import { resolveEffectiveProperties } from "../utils/assetSettingsResolver";
import {
  dispatchMediaSpawnerEvent,
  MediaSpawnerEvents,
} from "../hooks/useMediaSpawnerEvent";
// No parallel spawn-asset overrides storage; overrides are inline on Spawn.assets

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

// Parallel storage result types removed

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
        const stored = localStorage.getItem(STORAGE_KEYS.ASSETS);
        if (!stored) {
          return [];
        }
        const assets = JSON.parse(stored);
        const validAssets = Array.isArray(assets) ? assets : [];

        return validAssets;
      } catch (error) {
        console.error("Failed to load assets from storage:", error);
        return [];
      }
    });
  }

  /**
   * Check if a name is available (case-insensitive), excluding an optional asset id
   */
  static isNameAvailable(name: string, exceptId?: string): boolean {
    const trimmed = name.trim();
    if (trimmed.length === 0) return false;
    const lower = trimmed.toLowerCase();
    const assets = this.getAssets();
    return !assets.some(
      (a) => a.id !== exceptId && a.name.trim().toLowerCase() === lower,
    );
  }

  /**
   * Save assets to storage and invalidate cache
   */
  static saveAssets(assets: MediaAsset[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
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
    path: string,
  ): MediaAsset {
    const asset = createMediaAsset(type, name, path);
    const assets = this.getAssets();
    assets.push(asset);
    this.saveAssets(assets);
    try {
      dispatchMediaSpawnerEvent(MediaSpawnerEvents.ASSETS_UPDATED, {});
    } catch {
      // Best-effort notification
    }
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
      try {
        const profiles = SpawnProfileService.getAllProfiles();
        let changed = false;
        const updated = profiles.map((p) => {
          const newSpawns = p.spawns.map((s) => ({
            ...s,
            assets: s.assets.filter((sa) => sa.assetId !== assetId),
          }));
          if (
            newSpawns.some(
              (s, i) => s.assets.length !== p.spawns[i].assets.length,
            )
          ) {
            changed = true;
          }
          return { ...p, spawns: newSpawns, lastModified: Date.now() };
        });
        if (changed) {
          SpawnProfileService.replaceProfiles(updated);
          try {
            dispatchMediaSpawnerEvent(MediaSpawnerEvents.ASSETS_UPDATED, {});
          } catch {
            // Best-effort notify
          }
        }
      } catch {
        // Non-fatal: asset list is still updated
      }
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
      try {
        // Notify listeners that assets changed so dependent panels can refresh
        dispatchMediaSpawnerEvent(MediaSpawnerEvents.ASSETS_UPDATED, {});
      } catch {
        // Best-effort notification
      }
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
    localStorage.removeItem(STORAGE_KEYS.ASSETS);
    // Invalidate cache after successful clear
    CacheService.invalidate(CACHE_KEYS.ASSETS);
    try {
      dispatchMediaSpawnerEvent(MediaSpawnerEvents.ASSETS_UPDATED, {});
    } catch {
      // Best-effort notification
    }
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
        asset.path.toLowerCase().includes(searchLower),
    );
  }

  /**
   * Get assets with combined search and type filtering
   */
  static searchAndFilterAssets(
    searchQuery: string = "",
    typeFilter: MediaAsset["type"] | "all" = "all",
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
          asset.path.toLowerCase().includes(searchLower),
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
    asset: MediaAsset,
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
      this.validateAssetReference(asset),
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
      const stored = localStorage.getItem(STORAGE_KEYS.ASSETS);
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

  // Parallel spawn-asset settings API removed

  /**
   * Get resolved asset settings for a specific spawn-asset combination
   * This implements the inheritance model: Spawn defaults → Asset defaults → SpawnAsset overrides
   */
  static async getResolvedAssetSettings(
    spawnId: string,
    spawnAssetId: string,
  ): Promise<{
    duration: number;
    trigger: Trigger;
    properties: MediaAssetProperties;
  } | null> {
    try {
      const spawn = await SpawnService.getSpawn(spawnId);
      if (!spawn) {
        return null;
      }

      const spawnAsset = spawn.assets.find((sa) => sa.id === spawnAssetId);
      const inlineOverrides = spawnAsset?.overrides || {};

      const effective = resolveEffectiveProperties({
        spawn,
        overrides: inlineOverrides.properties,
      });

      return {
        duration: inlineOverrides.duration ?? spawn.duration,
        trigger: spawn.trigger,
        properties: effective.effective,
      };
    } catch (error) {
      console.error("Failed to resolve asset settings:", error);
      return null;
    }
  }
  // Legacy parallel storage APIs removed

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

    // Allow colons only in drive letters (C:) and backslashes for Windows paths
    const invalidChars = /[<>"|?*]/;
    if (invalidChars.test(path)) {
      return false;
    }

    // Additional validation for Windows paths
    // Check for invalid colon usage (not in drive letter)
    const colonIndex = path.indexOf(":");
    if (colonIndex !== -1 && colonIndex !== 1) {
      // Colon is only allowed as second character for drive letters (C:)
      return false;
    }

    const supportedExtensions = [
      // Images
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "bmp",
      "svg",
      "ico",
      "tiff",
      "tif",
      // Videos
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
      // Audio
      "mp3",
      "wav",
      "ogg",
      "m4a",
      "aac",
      "flac",
      "wma",
      "opus",
      "m4r",
    ];

    // Extract extension from path, handling both forward and backward slashes
    const lastDot = path.lastIndexOf(".");
    const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));

    if (lastDot > lastSlash && lastDot !== -1) {
      const extension = path.slice(lastDot + 1).toLowerCase();
      return supportedExtensions.includes(extension);
    }

    return false;
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
      typeof record.isUrl === "boolean"
    );
  }
}
