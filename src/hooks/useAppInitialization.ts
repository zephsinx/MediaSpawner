import { useState, useEffect } from "react";
import { SpawnProfileService } from "../services/spawnProfileService";
import { SettingsService } from "../services/settingsService";

const INITIALIZATION_FLAG_KEY = "mediaspawner_profiles_initialized";

export function useAppInitialization() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Theme is already applied via inline script in index.html
        // Just ensure SettingsService is in sync
        SettingsService.applyThemeMode();

        // Set up system preference listener
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleSystemThemeChange = () => {
          // System theme changes are no longer supported
          // Theme mode is now either "light" or "dark"
        };

        mediaQuery.addEventListener("change", handleSystemThemeChange);

        // Check if profiles have been initialized before
        const hasInitialized = localStorage.getItem(INITIALIZATION_FLAG_KEY);
        const activeProfile = SpawnProfileService.getActiveProfile();

        // Initialize if never initialized OR if there's no active profile
        // This auto-heals cases where the initialization flag exists but the active profile was lost
        if (!hasInitialized || !activeProfile) {
          const result = SpawnProfileService.ensureDefaultProfile();
          if (result.success) {
            localStorage.setItem(INITIALIZATION_FLAG_KEY, "true");
          } else {
            setError(result.error || "Failed to create default profile");
          }
        }

        // Cleanup listener on unmount
        return () => {
          mediaQuery.removeEventListener("change", handleSystemThemeChange);
        };
      } catch (err) {
        console.error("Initialization failed:", err);
        setError("Initialization failed");
      }
    };

    // Execute the async function
    initializeApp();
  }, []);

  return { error };
}
