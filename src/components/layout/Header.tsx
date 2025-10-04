import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SpawnProfileService } from "../../services/spawnProfileService";
import type { SpawnProfile } from "../../types/spawn";
import { usePanelState, useStreamerbotStatus } from "../../hooks";
import {
  SyncStatusIndicator,
  SyncActionsDropdown,
  ThemeToggle,
} from "../common";
import { StreamerbotService } from "../../services/streamerbotService";
import type { SyncStatusInfo } from "../../types/sync";
import { toast } from "sonner";

/**
 * Props for the header component
 */
export interface HeaderProps {
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Header component with spawn profile selector and management actions
 */
const Header: React.FC<HeaderProps> = ({ className = "" }) => {
  const [profiles, setProfiles] = useState<SpawnProfile[]>([]);
  const { activeProfileId, setActiveProfile } = usePanelState();
  const streamerbot = useStreamerbotStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    status: "unknown",
  });

  // Load profiles on mount
  useEffect(() => {
    try {
      const { profiles: loadedProfiles } =
        SpawnProfileService.getProfilesWithActiveInfo();
      setProfiles(loadedProfiles);
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setProfiles([]);
    }
  }, []);

  // Subscribe to sync status changes and handle sync checks
  useEffect(() => {
    let previousStatus: SyncStatusInfo["status"] | null = null;

    const unsubscribe = StreamerbotService.subscribeToSyncStatus((status) => {
      const statusChanged =
        previousStatus !== null && previousStatus !== status.status;
      previousStatus = status.status;

      setSyncStatus(status);

      // Show toast for status changes (but not on initial load or synced status)
      // Synced status toasts are handled by individual action handlers
      // Out-of-sync status is indicated by the ! icon, no toast needed
      if (
        statusChanged &&
        status.status !== "unknown" &&
        status.status !== "synced" &&
        status.status !== "out-of-sync" &&
        status.lastChecked
      ) {
        if (status.status === "error") {
          toast.error("Sync error", {
            description: status.errorMessage || "Failed to check sync status",
          });
        } else if (status.status === "offline") {
          toast.error("Streamer.bot offline", {
            description: "Cannot sync configuration. Check your connection",
          });
        }
      }
    });

    // Now that subscription is established, check sync status if connected
    if (streamerbot.state === "connected") {
      // Perform initial sync status check with enhanced error handling
      StreamerbotService.checkConfigSyncStatus()
        .then((result) => {
          if (!result.success) {
            console.warn("Sync status check failed:", result.error);
          }
        })
        .catch((error) => {
          console.error("Failed to check initial sync status:", error);
        });
    } else if (
      streamerbot.state === "disconnected" ||
      streamerbot.state === "error"
    ) {
      // Reset sync status when disconnected
      setSyncStatus({
        status: "offline",
        errorMessage:
          streamerbot.state === "error"
            ? streamerbot.errorMessage
            : "Not connected to Streamer.bot",
      });
    }

    return unsubscribe;
  }, [streamerbot.state, streamerbot.errorMessage]);

  const handleProfileChange = (profileId: string) => {
    const result = SpawnProfileService.setActiveProfile(profileId);
    if (result.success) {
      setActiveProfile(profileId);
    } else {
      console.error("Failed to set active profile:", result.error);
    }
  };

  const handleCreateProfile = () => {
    // Placeholder for Epic 6 implementation
    console.log("Create profile - to be implemented in Epic 6");
  };

  const handleEditProfile = () => {
    // Placeholder for Epic 6 implementation
    console.log("Edit profile - to be implemented in Epic 6");
  };

  const handleDeleteProfile = () => {
    // Placeholder for Epic 6 implementation
    console.log("Delete profile - to be implemented in Epic 6");
  };

  return (
    <header
      className={`bg-[rgb(var(--color-surface-1))] border-b border-[rgb(var(--color-border))] px-6 py-4 lg:px-8 lg:py-5 xl:px-10 xl:py-6 ${className}`}
    >
      <div className="flex items-center justify-between max-w-[2560px] mx-auto">
        {/* Application Title and Branding */}
        <div className="flex items-center">
          <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-[rgb(var(--color-fg))]">
            MediaSpawner
          </h1>
        </div>

        {/* Spawn Profile Selector and Actions */}
        <div className="flex items-center space-x-4 lg:space-x-5 xl:space-x-6">
          {/* Profile Selector */}
          <div className="flex items-center space-x-3 lg:space-x-4">
            <label className="text-sm lg:text-base xl:text-lg font-medium text-[rgb(var(--color-muted-foreground))] whitespace-nowrap">
              Active Profile:
            </label>
            <select
              value={activeProfileId || ""}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg border border-[rgb(var(--color-input-border))] bg-[rgb(var(--color-input))] text-[rgb(var(--color-fg))] rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-ring))] min-w-[200px] lg:min-w-[240px] xl:min-w-[280px]"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                  {profile.description && ` - ${profile.description}`}
                </option>
              ))}
            </select>
          </div>

          {/* Profile Management Actions */}
          <div className="flex items-center space-x-2 lg:space-x-3 xl:space-x-4">
            <Link
              to="/assets"
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg text-[rgb(var(--color-muted-foreground))] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-1))] rounded-md hover:bg-[rgb(var(--color-surface-2))] transition-colors whitespace-nowrap"
            >
              Open Asset Library
            </Link>
            <Link
              to="/settings"
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg text-[rgb(var(--color-muted-foreground))] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-1))] rounded-md hover:bg-[rgb(var(--color-surface-2))] transition-colors whitespace-nowrap"
            >
              Settings
            </Link>
            <button
              onClick={handleCreateProfile}
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-foreground))] rounded-md hover:bg-[rgb(var(--color-accent-hover))] transition-colors whitespace-nowrap"
            >
              Create Profile
            </button>
            <button
              onClick={handleEditProfile}
              disabled={!activeProfileId}
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg bg-[rgb(var(--color-muted))] text-[rgb(var(--color-fg))] rounded-md hover:bg-[rgb(var(--color-muted))]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Edit Profile
            </button>
            <button
              onClick={handleDeleteProfile}
              disabled={!activeProfileId}
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg bg-[rgb(var(--color-error))] text-[rgb(var(--color-error-foreground))] rounded-md hover:bg-[rgb(var(--color-error-hover))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Delete Profile
            </button>
            {/* Theme Toggle */}
            <ThemeToggle className="hidden lg:flex" />

            {/* Sync Status and Actions */}
            <div className="flex items-center space-x-3">
              <SyncStatusIndicator statusInfo={syncStatus} size="sm" />
              <SyncActionsDropdown
                syncStatus={syncStatus}
                onSyncStatusChange={setSyncStatus}
                className="hidden sm:flex"
              />
            </div>

            {/* Streamer.bot Status */}
            <span
              className="inline-flex items-center rounded-full bg-[rgb(var(--color-surface-2))] px-2 py-1 text-xs text-[rgb(var(--color-muted-foreground))]"
              aria-label={`Streamer.bot ${streamerbot.state} (${streamerbot.host}:${streamerbot.port})`}
              title={`Streamer.bot ${streamerbot.state} (${streamerbot.host}:${streamerbot.port})`}
            >
              <span
                className={
                  "mr-1 inline-block h-2.5 w-2.5 rounded-full " +
                  (streamerbot.state === "connected"
                    ? "bg-green-500"
                    : streamerbot.state === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500")
                }
              />
              SB
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
