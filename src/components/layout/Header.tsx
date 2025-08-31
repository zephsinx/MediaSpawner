import React, { useState, useEffect } from "react";
import { SpawnProfileService } from "../../services/spawnProfileService";
import type { SpawnProfile } from "../../types/spawn";
import { usePanelState, useStreamerbotStatus } from "../../hooks";

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
      className={`bg-white border-b border-gray-200 px-6 py-4 lg:px-8 lg:py-5 xl:px-10 xl:py-6 ${className}`}
    >
      <div className="flex items-center justify-between max-w-[2560px] mx-auto">
        {/* Application Title and Branding */}
        <div className="flex items-center">
          <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-800">
            MediaSpawner
          </h1>
        </div>

        {/* Spawn Profile Selector and Actions */}
        <div className="flex items-center space-x-4 lg:space-x-5 xl:space-x-6">
          {/* Profile Selector */}
          <div className="flex items-center space-x-3 lg:space-x-4">
            <label className="text-sm lg:text-base xl:text-lg font-medium text-gray-700 whitespace-nowrap">
              Active Profile:
            </label>
            <select
              value={activeProfileId || ""}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] lg:min-w-[240px] xl:min-w-[280px]"
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
            <a
              href="/assets"
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Open Asset Library
            </a>
            <button
              onClick={handleCreateProfile}
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Create Profile
            </button>
            <button
              onClick={handleEditProfile}
              disabled={!activeProfileId}
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Edit Profile
            </button>
            <button
              onClick={handleDeleteProfile}
              disabled={!activeProfileId}
              className="px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 text-sm lg:text-base xl:text-lg bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Delete Profile
            </button>
            <span
              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
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
