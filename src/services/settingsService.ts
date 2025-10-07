import type {
  Settings,
  SettingsValidationResult,
  WorkingDirectoryValidationResult,
  SettingsOperationResult,
  SupportedOS,
} from "../types/settings";
import {
  DEFAULT_SETTINGS,
  WINDOWS_PATH_RULES,
  UNIX_PATH_RULES,
} from "../types/settings";
import { CacheService, CACHE_KEYS } from "./cacheService";

const SETTINGS_STORAGE_KEY = "mediaspawner_settings";

// Cache for validation results to improve performance
const validationCache = new Map<string, WorkingDirectoryValidationResult>();
const CACHE_MAX_SIZE = 50; // Limit cache size to prevent memory leaks

/**
 * Service for managing application settings with localStorage persistence
 */
export class SettingsService {
  /**
   * Get current settings with fallback to defaults and caching
   */
  static getSettings(): Settings {
    return CacheService.get(CACHE_KEYS.SETTINGS, () => {
      try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!stored) {
          return { ...DEFAULT_SETTINGS };
        }

        const parsed = JSON.parse(stored);
        if (!this.isValidSettingsObject(parsed)) {
          console.warn(
            "Invalid settings found in localStorage, using defaults",
          );
          this.clearSettings();
          return { ...DEFAULT_SETTINGS };
        }

        const settings: Settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };

        return settings;
      } catch (error) {
        console.error("Failed to load settings from localStorage:", error);
        this.clearSettings();
        return { ...DEFAULT_SETTINGS };
      }
    });
  }

  /**
   * Update settings in localStorage
   */
  static updateSettings(
    newSettings: Partial<Settings>,
  ): SettingsOperationResult {
    try {
      const currentSettings = this.getSettings();
      const updatedSettings: Settings = {
        ...currentSettings,
        ...newSettings,
      };

      // Validate the updated settings
      const validation = this.validateSettings(updatedSettings);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || "Invalid settings",
        };
      }

      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(updatedSettings),
      );

      // Invalidate cache after successful write
      CacheService.invalidate(CACHE_KEYS.SETTINGS);

      return {
        success: true,
        settings: updatedSettings,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to save settings",
      };
    }
  }

  /**
   * Update working directory specifically
   */
  static updateWorkingDirectory(path: string): SettingsOperationResult {
    const validation = this.validateWorkingDirectory(path);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || "Invalid working directory path",
      };
    }

    const normalizedPath = validation.normalizedPath || path;
    return this.updateSettings({ workingDirectory: normalizedPath });
  }

  /**
   * Reset settings to defaults and invalidate cache
   */
  static resetSettings(): Settings {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      // Invalidate cache after successful reset
      CacheService.invalidate(CACHE_KEYS.SETTINGS);
      return { ...DEFAULT_SETTINGS };
    } catch (error) {
      console.error("Failed to reset settings:", error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Clear settings from localStorage and invalidate cache
   */
  static clearSettings(): void {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      // Invalidate cache after successful clear
      CacheService.invalidate(CACHE_KEYS.SETTINGS);
    } catch (error) {
      console.error("Failed to clear settings:", error);
    }
  }

  /**
   * Validate working directory path (with memoization for performance)
   */
  static validateWorkingDirectory(
    path: string,
  ): WorkingDirectoryValidationResult {
    // Check cache first
    if (validationCache.has(path)) {
      return validationCache.get(path)!;
    }

    // Perform validation
    const result = this.performValidation(path);

    // Cache the result (with size limit)
    if (validationCache.size >= CACHE_MAX_SIZE) {
      // Remove oldest entry (Map maintains insertion order)
      const firstKey = validationCache.keys().next().value;
      if (firstKey !== undefined) {
        validationCache.delete(firstKey);
      }
    }
    validationCache.set(path, result);

    return result;
  }

  /**
   * Perform the actual validation logic (extracted for memoization)
   */
  private static performValidation(
    path: string,
  ): WorkingDirectoryValidationResult {
    if (!path || path.trim() === "") {
      return {
        isValid: true, // Empty path is valid (means no working directory set)
        normalizedPath: "",
      };
    }

    const trimmedPath = path.trim();
    const os = this.detectOS(trimmedPath);
    const rules = os === "windows" ? WINDOWS_PATH_RULES : UNIX_PATH_RULES;

    // Length validation
    if (trimmedPath.length < rules.minLength) {
      return {
        isValid: false,
        error: `Path too short. Minimum length: ${rules.minLength}`,
      };
    }

    if (trimmedPath.length > rules.maxLength) {
      return {
        isValid: false,
        error: `Path too long. Maximum length: ${rules.maxLength}`,
      };
    }

    // Absolute path validation
    if (rules.mustBeAbsolute && !this.isAbsolutePath(trimmedPath, os)) {
      return {
        isValid: false,
        error: "Path must be absolute",
      };
    }

    // Path format validation
    const formatValidation = this.validatePathFormat(trimmedPath, os);
    if (!formatValidation.isValid) {
      return formatValidation;
    }

    // Normalize the path
    const normalizedPath = this.normalizePath(trimmedPath, os);

    return {
      isValid: true,
      normalizedPath,
    };
  }

  /**
   * Validate complete settings object
   */
  static validateSettings(settings: Settings): SettingsValidationResult {
    if (!this.isValidSettingsObject(settings)) {
      return {
        isValid: false,
        error: "Invalid settings object structure",
      };
    }

    const workingDirValidation = this.validateWorkingDirectory(
      settings.workingDirectory,
    );
    if (!workingDirValidation.isValid) {
      return {
        isValid: false,
        error: `Working directory: ${workingDirValidation.error}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Type guard to validate settings object structure
   */
  static isValidSettingsObject(obj: unknown): obj is Settings {
    if (!obj || typeof obj !== "object") {
      return false;
    }

    const record = obj as Record<string, unknown>;
    const hasWorkingDirectory = typeof record.workingDirectory === "string";
    const hasValidThemeMode =
      record.themeMode === "light" || record.themeMode === "dark";
    const hasValidActiveProfileId =
      record.activeProfileId === undefined ||
      typeof record.activeProfileId === "string";
    const hasValidLiveProfileId =
      record.liveProfileId === undefined ||
      typeof record.liveProfileId === "string";

    return (
      hasWorkingDirectory &&
      hasValidThemeMode &&
      hasValidActiveProfileId &&
      hasValidLiveProfileId
    );
  }

  /**
   * Detect operating system from path format
   */
  private static detectOS(path: string): SupportedOS {
    // Check for Windows-style paths (drive letter or UNC)
    if (/^[A-Za-z]:[\\/]/.test(path) || /^\\\\/.test(path)) {
      return "windows";
    }
    return "unix";
  }

  /**
   * Check if path is absolute for the given OS
   */
  private static isAbsolutePath(path: string, os: SupportedOS): boolean {
    if (os === "windows") {
      // Windows: C:\ or \\server\share
      return /^[A-Za-z]:[\\/]/.test(path) || /^\\\\/.test(path);
    } else {
      // Unix: starts with /
      return path.startsWith("/");
    }
  }

  /**
   * Validate path format for the given OS
   */
  private static validatePathFormat(
    path: string,
    os: SupportedOS,
  ): WorkingDirectoryValidationResult {
    if (os === "windows") {
      // Windows path validation
      if (!/^[A-Za-z]:[\\/]/.test(path) && !/^\\\\/.test(path)) {
        return {
          isValid: false,
          error:
            "Windows paths must start with a drive letter (e.g., C:\\) or UNC path (\\\\server\\share)",
        };
      }

      // Check for invalid characters
      const invalidChars = /[<>:"|?*]/;
      if (invalidChars.test(path.replace(/^[A-Za-z]:/, ""))) {
        return {
          isValid: false,
          error: 'Path contains invalid characters: < > : " | ? *',
        };
      }
    } else {
      // Unix path validation
      if (!path.startsWith("/")) {
        return {
          isValid: false,
          error: "Unix paths must start with /",
        };
      }

      // Check for null bytes (not allowed in Unix paths)
      if (path.includes("\0")) {
        return {
          isValid: false,
          error: "Path contains null bytes",
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Normalize path for consistent storage
   */
  private static normalizePath(path: string, os: SupportedOS): string {
    if (os === "windows") {
      // Convert forward slashes to backslashes
      return path.replace(/\//g, "\\");
    } else {
      // Unix paths are already normalized
      return path;
    }
  }

  /**
   * Get computed display path for local assets
   * Returns format like: C:\StreamAssets\...\filename.jpg
   */
  static getComputedDisplayPath(filename: string): string {
    const settings = this.getSettings();
    if (!settings.workingDirectory) {
      return filename;
    }

    const workingDir = settings.workingDirectory;
    const separator = workingDir.includes("\\") ? "\\" : "/";

    // Create abbreviated path with ellipsis
    const pathParts = workingDir.split(/[\\/]/);
    if (pathParts.length <= 2) {
      // Short path, show full path
      return `${workingDir}${separator}${filename}`;
    } else {
      // Long path, abbreviate with ellipsis
      const firstPart = pathParts[0];
      return `${firstPart}${separator}...${separator}${filename}`;
    }
  }

  /**
   * Check if settings are using defaults
   */
  static isUsingDefaults(): boolean {
    const current = this.getSettings();
    return (
      current.workingDirectory === DEFAULT_SETTINGS.workingDirectory &&
      current.themeMode === DEFAULT_SETTINGS.themeMode
    );
  }

  /**
   * Get settings statistics for debugging
   */
  static getSettingsInfo(): {
    hasStoredSettings: boolean;
    isUsingDefaults: boolean;
    workingDirectorySet: boolean;
    settingsValid: boolean;
  } {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const current = this.getSettings();
    const validation = this.validateSettings(current);

    return {
      hasStoredSettings: stored !== null,
      isUsingDefaults: this.isUsingDefaults(),
      workingDirectorySet: current.workingDirectory !== "",
      settingsValid: validation.isValid,
    };
  }

  /**
   * Get current theme mode
   */
  static getThemeMode(): "light" | "dark" {
    const settings = this.getSettings();
    if (settings.themeMode !== "light" && settings.themeMode !== "dark") {
      return "light";
    }
    return settings.themeMode;
  }

  /**
   * Set theme mode and apply it to the DOM
   */
  static setThemeMode(mode: "light" | "dark"): SettingsOperationResult {
    const result = this.updateSettings({ themeMode: mode });
    if (result.success) {
      this.applyThemeMode();
    }
    return result;
  }

  /**
   * Apply the current theme mode to the DOM
   */
  static applyThemeMode(): void {
    const themeMode = this.getThemeMode();
    const htmlElement = document.documentElement;

    // Remove existing theme classes
    htmlElement.classList.remove("light", "dark");

    // Apply the theme
    htmlElement.classList.add(themeMode);
  }
}
