import { useState, useEffect } from "react";
import { SpawnProfileService } from "../services/spawnProfileService";
import { STORAGE_KEYS } from "../services/constants";
import { SettingsService } from "../services/settingsService";

export function useAppInitialization() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Theme is already applied via inline script in index.html
        // Just ensure SettingsService is in sync
        SettingsService.applyThemeMode();

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleSystemThemeChange = () => {
          // System theme changes are no longer supported
          // Theme mode is now either "light" or "dark"
        };

        mediaQuery.addEventListener("change", handleSystemThemeChange);

        const hasInitialized = localStorage.getItem(
          STORAGE_KEYS.PROFILES_INITIALIZED,
        );
        const activeProfile = SpawnProfileService.getActiveProfile();

        // Auto-heals cases where the initialization flag exists but the active profile was lost
        if (!hasInitialized || !activeProfile) {
          const result = SpawnProfileService.ensureDefaultProfile();
          if (result.success) {
            localStorage.setItem(STORAGE_KEYS.PROFILES_INITIALIZED, "true");
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

    initializeApp();
  }, []);

  return { error };
}
