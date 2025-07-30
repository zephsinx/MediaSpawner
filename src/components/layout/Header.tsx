import React, { useState, useEffect } from "react";
import { SpawnProfileService } from "../../services/spawnProfileService";
import type { SpawnProfile } from "../../types/spawn";
import { usePanelState } from "../../hooks";

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
      className={`bg-white border-b border-gray-200 px-6 py-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        {/* Application Title and Branding */}
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-800">MediaSpawner</h1>
        </div>

        {/* Spawn Profile Selector and Actions */}
        <div className="flex items-center space-x-4">
          {/* Profile Selector */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">
              Active Profile:
            </label>
            <select
              value={activeProfileId || ""}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
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
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCreateProfile}
              className="px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Create Profile
            </button>
            <button
              onClick={handleEditProfile}
              disabled={!activeProfileId}
              className="px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Edit Profile
            </button>
            <button
              onClick={handleDeleteProfile}
              disabled={!activeProfileId}
              className="px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Profile
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
