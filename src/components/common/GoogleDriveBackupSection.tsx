import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Clock, Cloud } from "lucide-react";
import { toast } from "sonner";
import { SettingsService } from "../../services/settingsService";
import { GoogleDriveService } from "../../services/googleDriveService";
import { ImportExportService } from "../../services/importExportService";
import type { GoogleDriveBackupSettings } from "../../types/settings";
import { Switch } from "../ui/Switch";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { cn } from "../../utils/cn";
import { useDebounce } from "../../hooks/useDebounce";

/**
 * Props for the GoogleDriveBackupSection component
 */
export interface GoogleDriveBackupSectionProps {
  className?: string;
}

/**
 * Get time ago string from ISO timestamp
 */
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * Multi-tab backup lock key
 */
const BACKUP_LOCK_KEY = "mediaspawner_gdrive_backup_lock";

/**
 * Lock expiry time (2 minutes)
 */
const LOCK_EXPIRY_MS = 2 * 60 * 1000;

/**
 * Debounce delay for on-change backups (5 minutes)
 */
const ON_CHANGE_DEBOUNCE_MS = 5 * 60 * 1000;

/**
 * Compute SHA256 hash of configuration data
 */
async function computeConfigHash(configData: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(configData);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64String = btoa(String.fromCharCode(...hashArray));
  return base64String;
}

/**
 * Google Drive backup section component for the Settings page
 *
 * Provides UI for enabling Google Drive backups, configuring automatic
 * backup frequency, and performing manual backups.
 */
export function GoogleDriveBackupSection({
  className = "",
}: GoogleDriveBackupSectionProps) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    needsRefresh: boolean;
    error?: string;
  }>({ authenticated: false, needsRefresh: false });

  // Get current backup settings
  const settings = SettingsService.getSettings();
  const backupSettings = settings.googleDriveBackup;

  // Initialize enabled state from settings
  const [enabled, setEnabled] = useState(backupSettings?.enabled ?? false);
  const [autoBackup, setAutoBackup] = useState(
    backupSettings?.autoBackup ?? false,
  );
  const [backupFrequency, setBackupFrequency] = useState<
    "daily" | "weekly" | "on-change"
  >(backupSettings?.backupFrequency ?? "daily");

  // Check authentication status on mount and when enabled changes
  useEffect(() => {
    const checkAuth = async () => {
      if (enabled) {
        const status = await GoogleDriveService.getAuthStatus();
        setAuthStatus(status);
      } else {
        setAuthStatus({ authenticated: false, needsRefresh: false });
      }
    };

    checkAuth();
    // Refresh auth status periodically when enabled
    const interval = enabled ? setInterval(checkAuth, 30000) : undefined;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [enabled]);

  /**
   * Update backup settings
   */
  const updateBackupSettings = useCallback(
    (updates: Partial<GoogleDriveBackupSettings>) => {
      const current = backupSettings || {
        enabled: false,
        autoBackup: false,
        backupFrequency: "daily" as const,
      };

      const updated: GoogleDriveBackupSettings = {
        ...current,
        ...updates,
      };

      SettingsService.updateSettings({
        googleDriveBackup: updated,
      });
    },
    [backupSettings],
  );

  /**
   * Perform automatic backup (unobtrusive - no toast notifications)
   */
  const performAutomaticBackup = useCallback(async (): Promise<void> => {
    try {
      // 1. Check authentication status
      const status = await GoogleDriveService.getAuthStatus();
      if (!status.authenticated) {
        // Skip backup - not authenticated
        return;
      }

      // 2. Check multi-tab lock
      const existingLock = localStorage.getItem(BACKUP_LOCK_KEY);
      if (existingLock) {
        const lockTime = parseInt(existingLock, 10);
        const lockAge = Date.now() - lockTime;
        // If lock is less than expiry time old, skip backup
        if (lockAge < LOCK_EXPIRY_MS) {
          return; // Another tab is backing up
        }
      }

      // 3. Set lock
      localStorage.setItem(BACKUP_LOCK_KEY, Date.now().toString());

      try {
        // 4. Export configuration
        const exportResult = await ImportExportService.exportConfiguration();
        if (!exportResult.success || !exportResult.data) {
          throw new Error(
            exportResult.error || "Failed to export configuration",
          );
        }

        // 5. Optional: Compare config hash (skip if unchanged)
        const configHash = await computeConfigHash(exportResult.data);
        const lastHash = localStorage.getItem(
          "mediaspawner_gdrive_backup_hash",
        );
        if (configHash === lastHash) {
          // No changes, skip backup but still update lock
          localStorage.removeItem(BACKUP_LOCK_KEY);
          return;
        }

        // 6. Upload to Google Drive
        const uploadResult = await GoogleDriveService.uploadBackup(
          exportResult.data,
        );

        if (uploadResult.success) {
          // 7. Update settings (unobtrusive - no toast)
          updateBackupSettings({
            lastBackupTime: new Date().toISOString(),
            lastBackupStatus: "success",
            lastBackupError: undefined,
          });

          // Store hash for future comparison
          localStorage.setItem("mediaspawner_gdrive_backup_hash", configHash);
        } else {
          throw new Error(uploadResult.error || "Upload failed");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Backup failed";

        // Update settings with error (unobtrusive - no toast)
        updateBackupSettings({
          lastBackupTime: new Date().toISOString(),
          lastBackupStatus: "error",
          lastBackupError: errorMessage,
        });

        // Log error for debugging
        console.error("Automatic backup failed:", errorMessage);
      } finally {
        // 8. Clear lock
        localStorage.removeItem(BACKUP_LOCK_KEY);
      }
    } catch (err) {
      // Catch any unexpected errors
      console.error("Automatic backup error:", err);
      localStorage.removeItem(BACKUP_LOCK_KEY);
    }
  }, [updateBackupSettings]);

  // Track event occurrences for on-change mode
  const [eventTrigger, setEventTrigger] = useState(0);
  const debouncedEventTrigger = useDebounce(
    eventTrigger,
    ON_CHANGE_DEBOUNCE_MS,
  );

  // Automatic backup scheduling
  useEffect(() => {
    // Only schedule if enabled, authenticated, and auto-backup is on
    if (!enabled || !authStatus.authenticated || !autoBackup) {
      // Clear lock when disabled
      localStorage.removeItem(BACKUP_LOCK_KEY);
      return;
    }

    let intervalId: NodeJS.Timeout | undefined;
    let debounceTimeout: NodeJS.Timeout | undefined;

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Pause backups - clear intervals
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
      } else if (document.visibilityState === "visible") {
        // Resume backups - restart intervals if needed
        if (backupFrequency === "daily" || backupFrequency === "weekly") {
          const intervalMs =
            backupFrequency === "daily"
              ? 24 * 60 * 60 * 1000
              : 7 * 24 * 60 * 60 * 1000;
          intervalId = setInterval(() => {
            if (document.visibilityState === "visible") {
              performAutomaticBackup();
            }
          }, intervalMs);
        }
      }
    };

    // Handle storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === BACKUP_LOCK_KEY) {
        // Lock was set/cleared by another tab
        // Optionally skip backup if lock is active (handled in performAutomaticBackup)
      }
    };

    // Set up scheduling based on frequency
    if (backupFrequency === "daily" || backupFrequency === "weekly") {
      const intervalMs =
        backupFrequency === "daily"
          ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;

      // Only start if tab is visible
      if (document.visibilityState === "visible") {
        intervalId = setInterval(() => {
          if (document.visibilityState === "visible") {
            performAutomaticBackup();
          }
        }, intervalMs);
      }
    } else if (backupFrequency === "on-change") {
      // Event listeners for on-change mode
      const handleConfigChange = () => {
        // Increment trigger to cause debounce to restart
        setEventTrigger((prev) => prev + 1);
      };

      window.addEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        handleConfigChange as EventListener,
      );
      window.addEventListener(
        "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
        handleConfigChange as EventListener,
      );
      window.addEventListener(
        "mediaspawner:profile-changed" as unknown as keyof WindowEventMap,
        handleConfigChange as EventListener,
      );

      // Cleanup event listeners
      const cleanup = () => {
        window.removeEventListener(
          "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
          handleConfigChange as EventListener,
        );
        window.removeEventListener(
          "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
          handleConfigChange as EventListener,
        );
        window.removeEventListener(
          "mediaspawner:profile-changed" as unknown as keyof WindowEventMap,
          handleConfigChange as EventListener,
        );
      };

      // Set up visibility change listener
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Set up storage event listener
      window.addEventListener("storage", handleStorageChange);

      // Cleanup function for on-change mode
      return () => {
        cleanup();
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
        window.removeEventListener("storage", handleStorageChange);
        if (debounceTimeout) clearTimeout(debounceTimeout);
        localStorage.removeItem(BACKUP_LOCK_KEY);
      };
    }

    // Set up visibility change listener for daily/weekly
    if (backupFrequency === "daily" || backupFrequency === "weekly") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("storage", handleStorageChange);
    }

    // Cleanup function
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (debounceTimeout) clearTimeout(debounceTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
      localStorage.removeItem(BACKUP_LOCK_KEY);
    };
  }, [
    enabled,
    authStatus.authenticated,
    autoBackup,
    backupFrequency,
    performAutomaticBackup,
  ]);

  // Handle debounced event trigger for on-change mode
  useEffect(() => {
    if (
      enabled &&
      authStatus.authenticated &&
      autoBackup &&
      backupFrequency === "on-change" &&
      debouncedEventTrigger > 0 &&
      document.visibilityState === "visible"
    ) {
      performAutomaticBackup();
    }
  }, [
    debouncedEventTrigger,
    enabled,
    authStatus.authenticated,
    autoBackup,
    backupFrequency,
    performAutomaticBackup,
  ]);

  /**
   * Handle enable/disable toggle
   */
  const handleEnableToggle = async (checked: boolean) => {
    setEnabled(checked);
    setError(null);

    if (checked) {
      // Check if already authenticated
      const status = await GoogleDriveService.getAuthStatus();
      if (!status.authenticated) {
        // Need to authenticate
        try {
          await GoogleDriveService.authenticate();
          // User will be redirected to Google, then back to app
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Authentication failed";
          setError(errorMessage);
          setEnabled(false);
          toast.error(`Google Drive authentication failed: ${errorMessage}`);
        }
      } else {
        // Already authenticated, just enable
        updateBackupSettings({ enabled: true });
      }
    } else {
      // Disable - revoke access
      const revokeResult = await GoogleDriveService.revokeAccess();
      if (revokeResult.success) {
        updateBackupSettings({
          enabled: false,
          autoBackup: false,
        });
        setAutoBackup(false);
      } else {
        // Still disable even if revoke fails
        updateBackupSettings({
          enabled: false,
          autoBackup: false,
        });
        setAutoBackup(false);
      }
    }
  };

  /**
   * Handle auto-backup toggle
   */
  const handleAutoBackupToggle = (checked: boolean) => {
    setAutoBackup(checked);
    updateBackupSettings({ autoBackup: checked });
  };

  /**
   * Handle frequency change
   */
  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const frequency = e.target.value as "daily" | "weekly" | "on-change";
    setBackupFrequency(frequency);
    updateBackupSettings({ backupFrequency: frequency });
  };

  /**
   * Handle manual backup
   */
  const handleManualBackup = async () => {
    setIsBackingUp(true);
    setError(null);

    try {
      // Check authentication
      const status = await GoogleDriveService.getAuthStatus();
      if (!status.authenticated) {
        throw new Error(
          status.error ||
            "Not authenticated. Please enable Google Drive backup first.",
        );
      }

      // Export configuration
      const exportResult = await ImportExportService.exportConfiguration();
      if (!exportResult.success || !exportResult.data) {
        throw new Error(exportResult.error || "Failed to export configuration");
      }

      // Upload to Google Drive
      const uploadResult = await GoogleDriveService.uploadBackup(
        exportResult.data,
      );

      if (uploadResult.success) {
        // Update last backup info
        updateBackupSettings({
          lastBackupTime: new Date().toISOString(),
          lastBackupStatus: "success",
          lastBackupError: undefined,
        });

        toast.success("Backup uploaded to Google Drive successfully");
      } else {
        throw new Error(uploadResult.error || "Upload failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Backup failed";
      setError(errorMessage);

      // Update last backup info with error
      updateBackupSettings({
        lastBackupTime: new Date().toISOString(),
        lastBackupStatus: "error",
        lastBackupError: errorMessage,
      });

      toast.error(`Backup failed: ${errorMessage}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Get current backup settings (re-read from service to get latest)
  const currentSettings = SettingsService.getSettings();
  const currentBackupSettings = currentSettings.googleDriveBackup;

  return (
    <div className={cn("", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Google Drive Backup</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <label
                htmlFor="gdrive-enabled"
                className="text-sm font-medium text-[rgb(var(--color-fg))] cursor-pointer"
              >
                Enable Google Drive Backup
              </label>
              <p className="text-xs text-[rgb(var(--color-muted-foreground))] mt-1">
                Automatically backup your configuration to Google Drive
              </p>
            </div>
            <Switch
              id="gdrive-enabled"
              checked={enabled}
              onCheckedChange={handleEnableToggle}
              aria-label="Enable Google Drive backup"
            />
          </div>

          {/* Connection Status */}
          {enabled && (
            <div className="mb-4 p-3 bg-[rgb(var(--color-surface-2))] border border-[rgb(var(--color-border))] rounded-md">
              <div className="flex items-center gap-2">
                {authStatus.authenticated ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[rgb(var(--color-success))]" />
                    <span className="text-sm text-[rgb(var(--color-fg))]">
                      Connected to Google Drive
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[rgb(var(--color-error))]" />
                    <span className="text-sm text-[rgb(var(--color-error))]">
                      {authStatus.error ||
                        "Not connected. Authentication required."}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Manual Backup Button */}
          {enabled && authStatus.authenticated && (
            <div className="mb-4">
              <Button
                onClick={handleManualBackup}
                disabled={isBackingUp}
                loading={isBackingUp}
                variant="primary"
                className="flex items-center gap-2"
                aria-label="Create manual backup to Google Drive"
              >
                <Cloud className="w-4 h-4" />
                {isBackingUp ? "Backing up..." : "Backup Now"}
              </Button>
            </div>
          )}

          {/* Auto-backup Settings */}
          {enabled && authStatus.authenticated && (
            <div className="mb-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label
                    htmlFor="auto-backup"
                    className="text-sm font-medium text-[rgb(var(--color-fg))] cursor-pointer"
                  >
                    Automatic Backups
                  </label>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))] mt-1">
                    Automatically backup when changes are made or on a schedule
                  </p>
                </div>
                <Switch
                  id="auto-backup"
                  checked={autoBackup}
                  onCheckedChange={handleAutoBackupToggle}
                  disabled={!enabled || !authStatus.authenticated}
                  aria-label="Enable automatic backups"
                />
              </div>

              {autoBackup && (
                <div>
                  <label
                    htmlFor="backup-frequency"
                    className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-2"
                  >
                    Backup Frequency
                  </label>
                  <select
                    id="backup-frequency"
                    value={backupFrequency}
                    onChange={handleFrequencyChange}
                    className="w-full px-3 py-2 bg-[rgb(var(--color-surface-1))] border border-[rgb(var(--color-border))] rounded-md text-[rgb(var(--color-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 focus-visible:border-transparent"
                    aria-label="Backup frequency"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="on-change">On Change (debounced)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Status Indicator */}
          {enabled &&
            authStatus.authenticated &&
            currentBackupSettings?.lastBackupTime && (
              <div className="mb-4 flex items-center gap-2 text-sm">
                {currentBackupSettings.lastBackupStatus === "success" ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[rgb(var(--color-success))]" />
                    <span className="text-[rgb(var(--color-fg))]">
                      Last backup:{" "}
                      {getTimeAgo(currentBackupSettings.lastBackupTime)}
                    </span>
                  </>
                ) : currentBackupSettings.lastBackupStatus === "error" ? (
                  <>
                    <XCircle className="w-4 h-4 text-[rgb(var(--color-error))]" />
                    <span className="text-[rgb(var(--color-error))]">
                      Last backup failed:{" "}
                      {getTimeAgo(currentBackupSettings.lastBackupTime)}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-[rgb(var(--color-muted-foreground))]" />
                    <span className="text-[rgb(var(--color-muted-foreground))]">
                      Last backup:{" "}
                      {getTimeAgo(currentBackupSettings.lastBackupTime)}
                    </span>
                  </>
                )}
              </div>
            )}

          {/* Error Display */}
          {error && (
            <div
              role="alert"
              className="mt-4 p-3 bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error-border))] rounded-md"
            >
              <p className="text-sm text-[rgb(var(--color-error))]">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Information Section */}
          <div className="mt-4 p-3 bg-[rgb(var(--color-accent))]/10 border border-[rgb(var(--color-accent))]/20 rounded-md">
            <div className="flex items-start gap-2">
              <Cloud className="w-4 h-4 text-[rgb(var(--color-accent))] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[rgb(var(--color-accent))]">
                <p className="font-medium mb-1">Google Drive Backup</p>
                <p>
                  Your configuration is backed up to a single file in your
                  Google Drive. Backups include all profiles, assets, and
                  settings. You can restore from backups by importing the
                  configuration file.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GoogleDriveBackupSection;
