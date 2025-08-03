import { useState, useEffect } from "react";
import { SpawnProfileService } from "../services/spawnProfileService";

const INITIALIZATION_FLAG_KEY = "mediaspawner_profiles_initialized";

export function useAppInitialization() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if profiles have been initialized before
        const hasInitialized = localStorage.getItem(INITIALIZATION_FLAG_KEY);

        if (!hasInitialized) {
          const result = SpawnProfileService.ensureDefaultProfile();
          if (result.success) {
            localStorage.setItem(INITIALIZATION_FLAG_KEY, "true");
          } else {
            setError(result.error || "Failed to create default profile");
          }
        }
      } catch (err) {
        console.error("Initialization failed:", err);
        setError("Initialization failed");
      } finally {
        setIsInitializing(false);
      }
    };

    // Execute the async function
    initializeApp();
  }, []);

  return { isInitializing, error };
}
