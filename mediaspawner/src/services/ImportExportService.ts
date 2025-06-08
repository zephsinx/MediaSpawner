import type { Configuration, MediaAsset } from "../types/media";
import type { Settings } from "../types/settings";
import { ConfigurationService } from "./configurationService";
import { AssetService } from "./assetService";
import { SettingsService } from "./settingsService";
import { CacheService } from "./cacheService";

/**
 * Export data structure containing all application data
 */
export interface ExportData {
  /** Export format version for compatibility */
  version: string;

  /** Timestamp when export was created */
  timestamp: string;

  /** All configurations */
  configurations: Configuration[];

  /** All media assets */
  assets: MediaAsset[];

  /** Application settings */
  settings: Settings;
}

/**
 * Result of import data validation
 */
export interface ImportValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Result of import operation
 */
export interface ImportResult {
  success: boolean;
  error?: string;
  importedData?: {
    configurationsCount: number;
    assetsCount: number;
    settingsUpdated: boolean;
  };
}

/**
 * Result of file parsing operation
 */
export interface FileParseResult {
  success: boolean;
  data?: ExportData;
  error?: string;
}

/**
 * Service for importing and exporting MediaSpawner data
 */
export class ImportExportService {
  /** Current export format version */
  private static readonly EXPORT_VERSION = "1.0.0";

  /** Backup storage key for rollback functionality */
  private static readonly BACKUP_KEY = "mediaspawner_import_backup";

  /**
   * Export all application data
   */
  static exportAll(): ExportData {
    return {
      version: this.EXPORT_VERSION,
      timestamp: new Date().toISOString(),
      configurations: ConfigurationService.getConfigurations(),
      assets: AssetService.getAssets(),
      settings: SettingsService.getSettings(),
    };
  }

  /**
   * Download export data as JSON file
   */
  static downloadExport(data?: ExportData): void {
    try {
      const exportData = data || this.exportAll();

      // Create filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
      const filename = `mediaspawner-export-${timestamp}.json`;

      // Create blob and download
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create temporary download link and trigger download
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = filename;
      downloadLink.style.display = "none";

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Clean up the blob URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download export:", error);
      throw new Error("Failed to create download file");
    }
  }

  /**
   * Parse uploaded file and extract import data
   */
  static async parseImportFile(file: File): Promise<FileParseResult> {
    try {
      // Validate file type
      if (
        !file.type.includes("application/json") &&
        !file.name.endsWith(".json")
      ) {
        return {
          success: false,
          error: "File must be a JSON file",
        };
      }

      // Validate file size (max 10MB)
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSizeBytes) {
        return {
          success: false,
          error: "File too large. Maximum size is 10MB",
        };
      }

      // Read file content
      const fileContent = await this.readFileAsText(file);

      // Parse JSON
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(fileContent);
      } catch {
        return {
          success: false,
          error: "Invalid JSON format",
        };
      }

      // Validate structure
      const validation = this.validateImportData(parsedData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || "Invalid file structure",
        };
      }

      return {
        success: true,
        data: parsedData as ExportData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read file",
      };
    }
  }

  /**
   * Read file content as text using FileReader API
   */
  private static readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error("Failed to read file content"));
        }
      };

      reader.onerror = () => {
        reject(new Error("File reading error"));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Import data with validation, backup, and error handling
   */
  static async importData(data: ExportData): Promise<ImportResult> {
    try {
      // Validate the import data
      const validation = this.validateImportData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || "Invalid import data",
        };
      }

      // Create backup before import
      const backupCreated = this.createBackup();
      if (!backupCreated) {
        return {
          success: false,
          error: "Failed to create backup before import",
        };
      }

      // Clear existing data
      const cleared = this.clearAllData();
      if (!cleared) {
        // Attempt to restore backup
        this.restoreBackup();
        return {
          success: false,
          error: "Failed to clear existing data",
        };
      }

      // Import new data
      const importSuccess = this.importAllData(data);
      if (!importSuccess) {
        // Restore backup on failure
        this.restoreBackup();
        return {
          success: false,
          error: "Failed to import data, backup restored",
        };
      }

      // Clean up backup on success
      this.clearBackup();

      return {
        success: true,
        importedData: {
          configurationsCount: data.configurations.length,
          assetsCount: data.assets.length,
          settingsUpdated: true,
        },
      };
    } catch (error) {
      // Restore backup on any error
      this.restoreBackup();
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown import error",
      };
    }
  }

  /**
   * Create backup of current data
   */
  private static createBackup(): boolean {
    try {
      const currentData = this.exportAll();
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(currentData));
      return true;
    } catch (error) {
      console.error("Failed to create backup:", error);
      return false;
    }
  }

  /**
   * Restore data from backup
   */
  private static restoreBackup(): boolean {
    try {
      const backupData = localStorage.getItem(this.BACKUP_KEY);
      if (!backupData) {
        console.warn("No backup found to restore");
        return false;
      }

      const backup = JSON.parse(backupData) as ExportData;
      return this.importAllData(backup);
    } catch (error) {
      console.error("Failed to restore backup:", error);
      return false;
    }
  }

  /**
   * Clear backup data
   */
  private static clearBackup(): void {
    try {
      localStorage.removeItem(this.BACKUP_KEY);
    } catch (error) {
      console.error("Failed to clear backup:", error);
    }
  }

  /**
   * Clear all application data
   */
  private static clearAllData(): boolean {
    try {
      AssetService.clearAssets();
      SettingsService.clearSettings();
      return ConfigurationService.clearAll();
    } catch (error) {
      console.error("Failed to clear application data:", error);
      return false;
    }
  }

  /**
   * Import all data from ExportData structure
   */
  private static importAllData(data: ExportData): boolean {
    try {
      // Import assets first (configurations might reference them)
      AssetService.saveAssets(data.assets);

      // Import settings
      const settingsResult = SettingsService.updateSettings(data.settings);
      if (!settingsResult.success) {
        console.error("Failed to import settings:", settingsResult.error);
        return false;
      }

      // Import configurations last
      data.configurations.forEach((config) => {
        ConfigurationService.createConfiguration(
          config.name,
          config.description
        );
      });

      // Clear all caches after successful import to ensure fresh data
      CacheService.clear();

      return true;
    } catch (error) {
      console.error("Failed to import data:", error);
      return false;
    }
  }

  /**
   * Validate import data structure and content
   */
  static validateImportData(data: unknown): ImportValidationResult {
    // Check if data is an object
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {
        isValid: false,
        error: "Import data must be a valid object",
      };
    }

    const importData = data as Record<string, unknown>;

    // Check required fields
    if (typeof importData.version !== "string") {
      return {
        isValid: false,
        error: "Missing or invalid 'version' field",
      };
    }

    if (typeof importData.timestamp !== "string") {
      return {
        isValid: false,
        error: "Missing or invalid 'timestamp' field",
      };
    }

    if (!Array.isArray(importData.configurations)) {
      return {
        isValid: false,
        error: "Missing or invalid 'configurations' array",
      };
    }

    if (!Array.isArray(importData.assets)) {
      return {
        isValid: false,
        error: "Missing or invalid 'assets' array",
      };
    }

    if (
      typeof importData.settings !== "object" ||
      importData.settings === null
    ) {
      return {
        isValid: false,
        error: "Missing or invalid 'settings' object",
      };
    }

    // Validate configurations array structure
    for (let i = 0; i < importData.configurations.length; i++) {
      const config = importData.configurations[i];
      if (!this.isValidConfiguration(config)) {
        return {
          isValid: false,
          error: `Invalid configuration at index ${i}`,
        };
      }
    }

    // Validate assets array structure
    for (let i = 0; i < importData.assets.length; i++) {
      const asset = importData.assets[i];
      if (!this.isValidAsset(asset)) {
        return {
          isValid: false,
          error: `Invalid asset at index ${i}`,
        };
      }
    }

    // Validate settings structure
    if (!this.isValidSettings(importData.settings)) {
      return {
        isValid: false,
        error: "Invalid settings structure",
      };
    }

    return { isValid: true };
  }

  /**
   * Type guard for Configuration objects
   */
  private static isValidConfiguration(obj: unknown): obj is Configuration {
    if (typeof obj !== "object" || obj === null) return false;

    const config = obj as Record<string, unknown>;
    return (
      typeof config.id === "string" &&
      typeof config.name === "string" &&
      typeof config.lastModified === "number" &&
      Array.isArray(config.groups) &&
      (config.description === undefined ||
        typeof config.description === "string")
    );
  }

  /**
   * Type guard for MediaAsset objects
   */
  private static isValidAsset(obj: unknown): obj is MediaAsset {
    if (typeof obj !== "object" || obj === null) return false;

    const asset = obj as Record<string, unknown>;
    return (
      typeof asset.id === "string" &&
      typeof asset.name === "string" &&
      typeof asset.path === "string" &&
      typeof asset.isUrl === "boolean" &&
      (asset.type === "image" ||
        asset.type === "video" ||
        asset.type === "audio") &&
      typeof asset.properties === "object" &&
      asset.properties !== null
    );
  }

  /**
   * Type guard for Settings objects
   */
  private static isValidSettings(obj: unknown): obj is Settings {
    if (typeof obj !== "object" || obj === null) return false;

    const settings = obj as Record<string, unknown>;
    return typeof settings.workingDirectory === "string";
  }
}
