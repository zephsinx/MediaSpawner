import {
  StreamerbotClient,
  type StreamerbotClientOptions,
  type StreamerbotCommand,
} from "@streamerbot/client";
import type {
  SyncStatus,
  SyncStatusInfo,
  SyncStatusCheckResult,
  SyncOperationResult,
  SyncErrorType,
} from "../types/sync";
import { CacheService, getSyncStatusCacheKey } from "./cacheService";
import { STORAGE_KEYS } from "./constants";
import { ImportExportService } from "./importExportService";

/**
 * Load sync status from localStorage with validation (standalone function)
 */
function loadSyncStatusFromStorage(): SyncStatusInfo {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
    if (!stored) {
      return { status: "unknown" };
    }

    const parsed = JSON.parse(stored);
    if (!isValidSyncStatusInfo(parsed)) {
      console.warn("Invalid sync status found in localStorage, using default");
      localStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);
      return { status: "unknown" };
    }

    // Convert lastChecked string back to Date if present
    if (parsed.lastChecked) {
      parsed.lastChecked = new Date(parsed.lastChecked);
    }

    return parsed;
  } catch (error) {
    console.error("Failed to load sync status from localStorage:", error);
    localStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);
    return { status: "unknown" };
  }
}

/**
 * Validate sync status object structure (standalone function)
 */
function isValidSyncStatusInfo(obj: unknown): obj is SyncStatusInfo {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const statusObj = obj as Record<string, unknown>;

  // Check required status field
  if (
    !statusObj.status ||
    typeof statusObj.status !== "string" ||
    !["synced", "out-of-sync", "unknown", "error", "offline"].includes(
      statusObj.status,
    )
  ) {
    return false;
  }

  // Check optional fields if present
  if (statusObj.lastChecked !== undefined) {
    if (typeof statusObj.lastChecked !== "string") {
      return false;
    }
    // Validate date string
    const date = new Date(statusObj.lastChecked);
    if (isNaN(date.getTime())) {
      return false;
    }
  }

  if (statusObj.localConfigHash !== undefined) {
    if (typeof statusObj.localConfigHash !== "string") {
      return false;
    }
  }

  if (statusObj.remoteConfigHash !== undefined) {
    if (typeof statusObj.remoteConfigHash !== "string") {
      return false;
    }
  }

  if (statusObj.errorMessage !== undefined) {
    if (typeof statusObj.errorMessage !== "string") {
      return false;
    }
  }

  return true;
}

export type StreamerbotConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface StreamerbotConnectionStatus {
  state: StreamerbotConnectionState;
  host: string;
  port: number;
  endpoint: string;
  errorMessage?: string;
}

type StatusListener = (status: StreamerbotConnectionStatus) => void;

export class StreamerbotService {
  private static client: StreamerbotClient | undefined;
  private static listeners = new Set<StatusListener>();
  private static status: StreamerbotConnectionStatus = {
    state: "connecting",
    host: "127.0.0.1",
    port: 8080,
    endpoint: "/",
  };
  private static commandsCache:
    | { at: number; data: StreamerbotCommand[] }
    | undefined;

  // Sync status management
  private static syncStatus: SyncStatusInfo = loadSyncStatusFromStorage();
  private static syncStatusListeners = new Set<
    (status: SyncStatusInfo) => void
  >();

  // Debouncing for sync status checks
  private static syncCheckInProgress = false;
  private static syncCheckTimeout: NodeJS.Timeout | null = null;
  private static readonly SYNC_CHECK_TIMEOUT_MS = 30000; // 30 seconds timeout

  static getStatus(): StreamerbotConnectionStatus {
    return { ...this.status };
  }

  static subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  static connectIfNeeded(): void {
    if (this.client) {
      return;
    }

    const options: Partial<StreamerbotClientOptions> = {
      host: this.status.host,
      port: this.status.port,
      endpoint: this.status.endpoint,
      immediate: true,
      autoReconnect: true,
      retries: -1,
      logLevel: "none",
      onConnect: () => {
        this.updateStatus({ state: "connected", errorMessage: undefined });
      },
      onDisconnect: () => {
        this.updateStatus({ state: "disconnected" });
      },
      onError: (error) => {
        this.updateStatus({ state: "error", errorMessage: error.message });
      },
    };

    this.updateStatus({ state: "connecting" });
    this.client = new StreamerbotClient(options);
  }

  static async getCommands(opts?: {
    forceRefresh?: boolean;
    cacheMs?: number;
  }): Promise<StreamerbotCommand[]> {
    const forceRefresh = opts?.forceRefresh === true;
    const cacheMs =
      typeof opts?.cacheMs === "number" ? opts!.cacheMs : 2 * 60 * 1000;

    if (this.status.state !== "connected" || !this.client) {
      return [];
    }

    if (!forceRefresh && this.commandsCache) {
      const fresh = Date.now() - this.commandsCache.at < cacheMs;
      if (fresh) {
        return this.commandsCache.data;
      }
    }

    try {
      const res = await this.client.getCommands();
      const data = Array.isArray(res?.commands) ? res.commands : [];
      this.commandsCache = { at: Date.now(), data };
      return data;
    } catch {
      return [];
    }
  }

  /**
   * Execute a Streamer.bot action with the given arguments
   * @param actionName The name of the action to execute
   * @param args Optional arguments to pass to the action
   * @returns Promise<boolean> indicating success/failure
   */
  static async executeAction(
    actionName: string,
    args?: Record<string, unknown>,
  ): Promise<boolean> {
    if (this.status.state !== "connected" || !this.client) {
      throw new Error("Streamer.bot client not connected");
    }

    try {
      const response = await this.client.doAction({ name: actionName }, args);

      // Streamer.bot actions return various response types
      // The SetMediaSpawnerConfig method returns a boolean directly
      // Check if response is a boolean or has a success property
      if (typeof response === "boolean") {
        return response;
      }

      // Check for success property in response object
      if (response && typeof response === "object" && "success" in response) {
        return Boolean((response as { success: unknown }).success);
      }

      // Default to true if we can't determine success/failure
      return true;
    } catch (error) {
      console.error(`Error executing action ${actionName}:`, error);
      throw error;
    }
  }

  /**
   * Get a global variable from Streamer.bot
   * @param variableName The name of the global variable to get
   * @returns Promise<unknown> the variable value or undefined if not found
   */
  static async getGlobalVariable(variableName: string): Promise<unknown> {
    if (this.status.state !== "connected" || !this.client) {
      throw new Error("Streamer.bot client not connected");
    }

    try {
      const response = await this.client.getGlobal(variableName);
      if (response && "variable" in response && response.variable) {
        return response.variable.value;
      }
      return undefined;
    } catch (error) {
      console.error(`Error getting global variable ${variableName}:`, error);
      throw error;
    }
  }

  /**
   * Set a global variable in Streamer.bot
   * @param variableName The name of the global variable to set
   * @param variableValue The value to set
   * @returns Promise<boolean> indicating success/failure
   */
  static async setGlobalVariable(
    variableName: string,
    variableValue: unknown,
  ): Promise<boolean> {
    if (this.status.state !== "connected" || !this.client) {
      throw new Error("Streamer.bot client not connected");
    }

    try {
      const response = await this.client.doAction(
        { name: "Set Global Variable" },
        {
          variableName,
          variableValue,
        },
      );

      // Check if response indicates success
      if (typeof response === "boolean") {
        return response;
      }

      if (response && typeof response === "object" && "success" in response) {
        return Boolean((response as { success: unknown }).success);
      }

      return true;
    } catch (error) {
      console.error(`Error setting global variable ${variableName}:`, error);
      throw error;
    }
  }

  /**
   * Update MediaSpawner configuration by calling the Set Media Spawner Config action
   * @param configJson The configuration JSON string to set
   * @returns Promise<boolean> indicating success/failure
   */
  static async setMediaSpawnerConfig(configJson: string): Promise<boolean> {
    try {
      // Ensure connection
      this.connectIfNeeded();

      // Wait for connection with timeout
      await this.waitForConnection(10000); // 10 second timeout

      // Execute the action
      const success = await this.executeAction("Set Media Spawner Config", {
        mediaSpawnerConfigValue: configJson,
      });

      return success;
    } catch (error) {
      console.error("Failed to update MediaSpawner config:", error);
      return false;
    }
  }

  /**
   * Test a spawn by executing it through the MediaSpawner action
   * @param spawnId The ID of the spawn to test
   * @returns Promise<boolean> indicating success/failure
   */
  static async testSpawn(spawnId: string): Promise<boolean> {
    try {
      this.connectIfNeeded();
      await this.waitForConnection(10000);

      const success = await this.executeAction("MediaSpawner", {
        spawnId: spawnId,
        testMode: true,
      });

      return success;
    } catch (error) {
      console.error("Failed to test spawn:", error);
      throw error;
    }
  }

  /**
   * Wait for Streamer.bot connection with timeout
   * @param timeoutMs Timeout in milliseconds
   * @returns Promise<void> that resolves when connected or rejects on timeout/error
   */
  private static async waitForConnection(timeoutMs: number): Promise<void> {
    if (this.status.state === "connected") {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error("Connection timeout"));
      }, timeoutMs);

      const unsubscribe = this.subscribe((status) => {
        if (status.state === "connected") {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        } else if (status.state === "error") {
          clearTimeout(timeout);
          unsubscribe();
          reject(new Error(status.errorMessage || "Connection failed"));
        }
      });
    });
  }

  private static lastNotifyAt = 0;
  private static updateStatus(
    update: Partial<StreamerbotConnectionStatus>,
  ): void {
    const prev = this.status;
    const next: StreamerbotConnectionStatus = { ...prev, ...update };

    const sameState = prev.state === next.state;
    const sameError = prev.errorMessage === next.errorMessage;

    const now = Date.now();
    const throttleMs = 10000;
    const shouldThrottle =
      (next.state === "error" || next.state === "disconnected") &&
      sameState &&
      sameError &&
      now - this.lastNotifyAt < throttleMs;

    this.status = next;
    if (shouldThrottle) {
      return;
    }
    this.lastNotifyAt = now;
    this.listeners.forEach((fn) => fn(this.getStatus()));
  }

  // Sync status management methods

  /**
   * Get current sync status with caching
   */
  static getSyncStatus(): SyncStatusInfo {
    const cacheKey = getSyncStatusCacheKey();
    const syncStatusTTL = 30 * 1000; // 30 seconds TTL for sync status

    return CacheService.get(
      cacheKey,
      () => {
        // Return fresh data from memory
        return { ...this.syncStatus };
      },
      syncStatusTTL,
    );
  }

  /**
   * Subscribe to sync status changes
   */
  static subscribeToSyncStatus(
    listener: (status: SyncStatusInfo) => void,
  ): () => void {
    this.syncStatusListeners.add(listener);
    listener(this.getSyncStatus());
    return () => {
      this.syncStatusListeners.delete(listener);
    };
  }

  /**
   * Check sync status by comparing local and remote config hashes
   * Implements debouncing to prevent race conditions
   */
  static async checkConfigSyncStatus(): Promise<SyncStatusCheckResult> {
    // Check if a sync check is already in progress
    if (this.syncCheckInProgress) {
      return {
        success: false,
        error: "Sync check already in progress",
      };
    }

    // Set the flag to prevent concurrent checks
    this.syncCheckInProgress = true;

    // Set up timeout to prevent stuck operations
    this.syncCheckTimeout = setTimeout(() => {
      console.warn("Sync check timeout reached, resetting state");
      this.resetSyncCheckState();
    }, this.SYNC_CHECK_TIMEOUT_MS);

    try {
      // Check if we're connected
      if (this.status.state !== "connected" || !this.client) {
        const errorType: SyncErrorType = "connection_failed";
        const errorMessage = this.createErrorMessage(errorType);
        this.updateSyncStatus({
          status: "offline",
          errorMessage,
          errorType,
          canRetry: this.canRetryError(errorType),
        });
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Get local configuration and compute hash
      const localConfigResult = await ImportExportService.exportConfiguration();

      if (!localConfigResult.success || !localConfigResult.data) {
        const errorType: SyncErrorType = "config_export_failed";
        const errorMessage = this.createErrorMessage(
          errorType,
          localConfigResult.error,
        );
        this.updateSyncStatus({
          status: "error",
          errorMessage,
          errorType,
          canRetry: this.canRetryError(errorType),
        });
        return {
          success: false,
          error: errorMessage,
        };
      }

      const localConfigHash = await this.computeConfigHash(
        localConfigResult.data,
      );

      // Get remote configuration hash from Streamer.bot
      let remoteConfigHash: string | undefined;
      try {
        const response = await this.client.getGlobal(
          "MediaSpawnerSha-59d16b77-5aa7-4336-9b18-eeb6af51a823",
        );
        if (response && "variable" in response && response.variable) {
          remoteConfigHash = response.variable.value as string;
        }
      } catch (error) {
        console.warn("Failed to get remote config hash:", error);
        // Continue with undefined remote hash
      }

      // Determine sync status
      let status: SyncStatus;
      let errorMessage: string | undefined;

      if (!remoteConfigHash) {
        status = "unknown";
        errorMessage = "No remote configuration found";
      } else if (localConfigHash === remoteConfigHash) {
        status = "synced";
      } else {
        status = "out-of-sync";
      }

      const statusInfo: SyncStatusInfo = {
        status,
        lastChecked: new Date(),
        localConfigHash,
        remoteConfigHash,
        errorMessage,
      };

      this.updateSyncStatus(statusInfo);

      return {
        success: true,
        statusInfo,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Sync status check failed:", errorMessage);

      // Determine error type based on the error
      let errorType: SyncErrorType = "unknown_error";
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("timed out")
      ) {
        errorType = "timeout";
      } else if (
        errorMessage.includes("connection") ||
        errorMessage.includes("connect")
      ) {
        errorType = "connection_failed";
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("denied")
      ) {
        errorType = "permission_denied";
      }

      const userFriendlyMessage = this.createErrorMessage(
        errorType,
        errorMessage,
      );
      this.updateSyncStatus({
        status: "error",
        errorMessage: userFriendlyMessage,
        errorType,
        canRetry: this.canRetryError(errorType),
      });
      return {
        success: false,
        error: userFriendlyMessage,
      };
    } finally {
      // Always reset the debouncing state
      this.resetSyncCheckState();
    }
  }

  /**
   * Set sync status (for internal use)
   */
  static setSyncStatus(status: SyncStatus, errorMessage?: string): void {
    this.updateSyncStatus({
      status,
      errorMessage,
      lastChecked: new Date(),
    });
  }

  /**
   * Push local configuration to Streamer.bot
   */
  static async pushConfiguration(): Promise<SyncOperationResult> {
    try {
      // Check if we're connected
      if (this.status.state !== "connected" || !this.client) {
        const errorType: SyncErrorType = "connection_failed";
        const errorMessage = this.createErrorMessage(errorType);
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Get local configuration
      const localConfigResult = await ImportExportService.exportConfiguration();
      if (!localConfigResult.success || !localConfigResult.data) {
        const errorType: SyncErrorType = "config_export_failed";
        const errorMessage = this.createErrorMessage(
          errorType,
          localConfigResult.error,
        );
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Push to Streamer.bot
      const success = await this.setMediaSpawnerConfig(localConfigResult.data);
      if (!success) {
        const errorType: SyncErrorType = "api_error";
        const errorMessage = this.createErrorMessage(errorType);
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Update sync status to synced with hash information
      const localConfigHash = await this.computeConfigHash(
        localConfigResult.data,
      );
      this.updateSyncStatus({
        status: "synced",
        lastChecked: new Date(),
        localConfigHash,
        remoteConfigHash: localConfigHash, // Same as local since we just pushed it
        errorMessage: undefined,
      });

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Determine error type based on the error
      let errorType: SyncErrorType = "unknown_error";
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("timed out")
      ) {
        errorType = "timeout";
      } else if (
        errorMessage.includes("connection") ||
        errorMessage.includes("connect")
      ) {
        errorType = "connection_failed";
      } else if (
        errorMessage.includes("permission") ||
        errorMessage.includes("denied")
      ) {
        errorType = "permission_denied";
      }

      const userFriendlyMessage = this.createErrorMessage(
        errorType,
        errorMessage,
      );
      this.setSyncStatus("error", userFriendlyMessage);
      return {
        success: false,
        error: userFriendlyMessage,
      };
    }
  }

  /**
   * Compute SHA256 hash of configuration data
   */
  private static async computeConfigHash(configData: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(configData);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64String = btoa(String.fromCharCode(...hashArray));
    return base64String;
  }

  /**
   * Save sync status to localStorage
   */
  private static saveSyncStatusToStorage(status: SyncStatusInfo): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify(status));
    } catch (error) {
      console.error("Failed to save sync status to localStorage:", error);
    }
  }

  /**
   * Reset sync check debouncing state
   */
  private static resetSyncCheckState(): void {
    this.syncCheckInProgress = false;
    if (this.syncCheckTimeout) {
      clearTimeout(this.syncCheckTimeout);
      this.syncCheckTimeout = null;
    }
  }

  /**
   * Create user-friendly error message based on error type
   */
  private static createErrorMessage(
    errorType: SyncErrorType,
    originalError?: string,
  ): string {
    switch (errorType) {
      case "connection_failed":
        return "Cannot connect to Streamer.bot. Please check that Streamer.bot is running and the WebSocket connection is enabled.";
      case "timeout":
        return "The operation timed out. Streamer.bot may be busy or unresponsive. Please try again.";
      case "api_error":
        return "Streamer.bot returned an error. Please check the Streamer.bot logs for more details.";
      case "validation_error":
        return "Configuration validation failed. Please check your settings and try again.";
      case "permission_denied":
        return "Permission denied. Please check that Streamer.bot has the necessary permissions.";
      case "config_export_failed":
        return "Failed to export configuration. Please check your local settings.";
      case "config_import_failed":
        return "Failed to import configuration. The configuration may be corrupted.";
      case "unknown_error":
      default:
        return (
          originalError || "An unexpected error occurred. Please try again."
        );
    }
  }

  /**
   * Determine if an error type can be retried
   */
  private static canRetryError(errorType: SyncErrorType): boolean {
    return ["connection_failed", "timeout", "api_error"].includes(errorType);
  }

  /**
   * Get sync status cache statistics for debugging
   */
  static getSyncStatusCacheStats(): {
    isCached: boolean;
    cacheEntry?: unknown;
    cacheStats: unknown;
  } {
    const cacheKey = getSyncStatusCacheKey();
    const isCached = CacheService.has(cacheKey);
    const cacheEntry = CacheService.getEntry(cacheKey);
    const cacheStats = CacheService.getStats();

    return {
      isCached,
      cacheEntry,
      cacheStats,
    };
  }

  /**
   * Clear sync status cache
   */
  static clearSyncStatusCache(): void {
    const cacheKey = getSyncStatusCacheKey();
    CacheService.invalidate(cacheKey);
  }

  /**
   * Update sync status and notify listeners
   */
  private static updateSyncStatus(update: Partial<SyncStatusInfo>): void {
    const prev = this.syncStatus;
    const next: SyncStatusInfo = { ...prev, ...update };

    this.syncStatus = next;
    this.saveSyncStatusToStorage(next);

    // Invalidate cache when status changes
    const cacheKey = getSyncStatusCacheKey();
    CacheService.invalidate(cacheKey);

    this.syncStatusListeners.forEach((fn) => fn(this.getSyncStatus()));
  }
}
