/**
 * Settings types and interfaces for MediaSpawner application
 */

/**
 * Google Drive backup configuration
 */
export interface GoogleDriveBackupSettings {
  /** Whether Google Drive backup is enabled */
  enabled: boolean;
  /** Whether automatic backups are enabled */
  autoBackup: boolean;
  /** Frequency for automatic backups */
  backupFrequency: "daily" | "weekly" | "on-change";
  /** ISO timestamp of last backup attempt */
  lastBackupTime?: string;
  /** Status of last backup attempt */
  lastBackupStatus?: "success" | "error";
  /** Error message from last failed backup (if any) */
  lastBackupError?: string;
}

/**
 * Application settings interface
 */
export interface Settings {
  /** Working directory path for local file assets */
  workingDirectory: string;
  /** ID of the currently active spawn profile */
  activeProfileId?: string;
  /** ID of the currently live spawn profile for Streamer.bot execution */
  liveProfileId?: string;
  /** Theme mode preference */
  themeMode: "light" | "dark";
  /** OBS canvas width in pixels (for random coordinate bounds) */
  obsCanvasWidth?: number;
  /** OBS canvas height in pixels (for random coordinate bounds) */
  obsCanvasHeight?: number;
  /** Google Drive backup configuration */
  googleDriveBackup?: GoogleDriveBackupSettings;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  workingDirectory: "",
  activeProfileId: undefined,
  liveProfileId: undefined,
  themeMode: "dark",
  obsCanvasWidth: 1920,
  obsCanvasHeight: 1080,
  googleDriveBackup: undefined,
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
