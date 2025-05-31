import type { Configuration } from "../types/media";
import {
  createConfiguration,
  updateConfigurationTimestamp,
} from "../types/media";

const STORAGE_KEY = "mediaspawner_configurations";

/**
 * Service for managing configuration persistence and operations
 */
export class ConfigurationService {
  /**
   * Get all configurations from localStorage
   */
  static getConfigurations(): Configuration[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const configurations = JSON.parse(stored);
      return Array.isArray(configurations) ? configurations : [];
    } catch (error) {
      console.error("Failed to load configurations:", error);
      return [];
    }
  }

  /**
   * Save configurations to localStorage
   */
  private static saveConfigurations(configurations: Configuration[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configurations));
      return true;
    } catch (error) {
      console.error("Failed to save configurations:", error);
      return false;
    }
  }

  /**
   * Get a single configuration by ID
   */
  static getConfiguration(id: string): Configuration | null {
    const configurations = this.getConfigurations();
    return configurations.find((config) => config.id === id) || null;
  }

  /**
   * Create a new configuration
   */
  static createConfiguration(
    name: string,
    description?: string
  ): Configuration | null {
    try {
      const newConfig = createConfiguration(name, description);
      const configurations = this.getConfigurations();

      configurations.push(newConfig);

      if (this.saveConfigurations(configurations)) {
        return newConfig;
      }
      return null;
    } catch (error) {
      console.error("Failed to create configuration:", error);
      return null;
    }
  }

  /**
   * Update an existing configuration
   */
  static updateConfiguration(updatedConfig: Configuration): boolean {
    try {
      const configurations = this.getConfigurations();
      const index = configurations.findIndex(
        (config) => config.id === updatedConfig.id
      );

      if (index === -1) {
        console.error("Configuration not found:", updatedConfig.id);
        return false;
      }

      // Update timestamp and save
      const configWithTimestamp = updateConfigurationTimestamp(updatedConfig);
      configurations[index] = configWithTimestamp;

      return this.saveConfigurations(configurations);
    } catch (error) {
      console.error("Failed to update configuration:", error);
      return false;
    }
  }

  /**
   * Delete a configuration by ID
   */
  static deleteConfiguration(id: string): boolean {
    try {
      const configurations = this.getConfigurations();
      const filteredConfigs = configurations.filter(
        (config) => config.id !== id
      );

      if (filteredConfigs.length === configurations.length) {
        console.error("Configuration not found:", id);
        return false;
      }

      return this.saveConfigurations(filteredConfigs);
    } catch (error) {
      console.error("Failed to delete configuration:", error);
      return false;
    }
  }

  /**
   * Duplicate an existing configuration with a new name
   */
  static duplicateConfiguration(
    id: string,
    newName?: string
  ): Configuration | null {
    try {
      const original = this.getConfiguration(id);
      if (!original) {
        console.error("Configuration not found for duplication:", id);
        return null;
      }

      const duplicatedName = newName || `${original.name} (Copy)`;
      const duplicate = createConfiguration(
        duplicatedName,
        original.description,
        original.groups
      );

      const configurations = this.getConfigurations();
      configurations.push(duplicate);

      if (this.saveConfigurations(configurations)) {
        return duplicate;
      }
      return null;
    } catch (error) {
      console.error("Failed to duplicate configuration:", error);
      return null;
    }
  }

  /**
   * Get statistics about configurations
   */
  static getConfigurationStats(): {
    totalConfigurations: number;
    totalGroups: number;
    totalAssets: number;
    lastModified: number | null;
  } {
    const configurations = this.getConfigurations();

    const totalGroups = configurations.reduce(
      (sum, config) => sum + config.groups.length,
      0
    );

    const totalAssets = configurations.reduce(
      (sum, config) =>
        sum +
        config.groups.reduce(
          (groupSum, group) => groupSum + group.assets.length,
          0
        ),
      0
    );

    const lastModified =
      configurations.length > 0
        ? Math.max(...configurations.map((config) => config.lastModified))
        : null;

    return {
      totalConfigurations: configurations.length,
      totalGroups,
      totalAssets,
      lastModified,
    };
  }

  /**
   * Check if a configuration name already exists
   */
  static isNameTaken(name: string, excludeId?: string): boolean {
    const configurations = this.getConfigurations();
    return configurations.some(
      (config) =>
        config.name.toLowerCase() === name.toLowerCase() &&
        config.id !== excludeId
    );
  }

  /**
   * Clear all configurations (useful for testing/reset)
   */
  static clearAll(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Failed to clear configurations:", error);
      return false;
    }
  }
}
