/**
 * Settings types and interfaces for MediaSpawner application
 */

/**
 * Application settings interface
 */
export interface Settings {
  /** Working directory path for local file assets */
  workingDirectory: string;
  /** ID of the currently active spawn profile */
  activeProfileId?: string;
  /** Theme mode preference */
  themeMode: "light" | "dark";
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  workingDirectory: "",
  activeProfileId: undefined,
  themeMode: "light",
};

/**
 * Result of settings validation
 */
export interface SettingsValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Result of working directory validation
 */
export interface WorkingDirectoryValidationResult
  extends SettingsValidationResult {
  normalizedPath?: string;
}

/**
 * Settings operation result
 */
export interface SettingsOperationResult {
  success: boolean;
  settings?: Settings;
  error?: string;
}

/**
 * Supported operating systems for path validation
 */
export type SupportedOS = "windows" | "unix";

/**
 * Path validation rules
 */
export interface PathValidationRules {
  /** Minimum path length */
  minLength: number;
  /** Maximum path length */
  maxLength: number;
  /** Allowed path separators */
  allowedSeparators: string[];
  /** Path must be absolute */
  mustBeAbsolute: boolean;
}

/**
 * Default path validation rules for Windows
 */
export const WINDOWS_PATH_RULES: PathValidationRules = {
  minLength: 3, // C:\
  maxLength: 260, // Windows MAX_PATH
  allowedSeparators: ["\\", "/"],
  mustBeAbsolute: true,
};

/**
 * Default path validation rules for Unix-like systems
 */
export const UNIX_PATH_RULES: PathValidationRules = {
  minLength: 1, // /
  maxLength: 4096, // Common Linux path limit
  allowedSeparators: ["/"],
  mustBeAbsolute: true,
};
