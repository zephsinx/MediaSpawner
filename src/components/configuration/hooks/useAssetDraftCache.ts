import { useCallback, useRef } from "react";
import type { MediaAssetProperties } from "../../../types/media";

export interface AssetDraftCacheEntry {
  draftValues: Partial<MediaAssetProperties>;
}

interface UseAssetDraftCacheOptions {
  selectedSpawnId: string | undefined;
  selectedSpawnAssetId: string | undefined;
  centerPanelMode: "spawn-settings" | "asset-settings";
}

export function useAssetDraftCache({
  selectedSpawnId,
  selectedSpawnAssetId,
  centerPanelMode,
}: UseAssetDraftCacheOptions) {
  const assetDraftCacheRef = useRef<Record<string, AssetDraftCacheEntry>>({});

  // Cache key validation and generation functions
  const validateCacheKey = useCallback(
    (
      spawnId: string | undefined,
      spawnAssetId: string | undefined,
    ): string | null => {
      if (!spawnId || !spawnAssetId) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "Cache key validation failed: missing spawnId or spawnAssetId",
            { spawnId, spawnAssetId },
          );
        }
        return null;
      }

      // Sanitize keys to prevent invalid characters
      const sanitizedSpawnId = spawnId.replace(/[|]/g, "_");
      const sanitizedSpawnAssetId = spawnAssetId.replace(/[|]/g, "_");

      const key = `${sanitizedSpawnId}|${sanitizedSpawnAssetId}`;

      if (process.env.NODE_ENV === "development") {
        console.debug("Generated cache key:", key, {
          originalSpawnId: spawnId,
          originalSpawnAssetId: spawnAssetId,
        });
      }

      return key;
    },
    [],
  );

  const generateCacheKey = useCallback(
    (spawnId: string | undefined, spawnAssetId: string | undefined): string => {
      const key = validateCacheKey(spawnId, spawnAssetId);
      if (!key) {
        throw new Error(
          `Invalid cache key parameters: spawnId=${spawnId}, spawnAssetId=${spawnAssetId}`,
        );
      }
      return key;
    },
    [validateCacheKey],
  );

  // Cache isolation boundary validation functions
  const validateCacheScope = useCallback(
    (
      spawnId: string | undefined,
      spawnAssetId: string | undefined,
      operation: string,
    ) => {
      if (!spawnId || !spawnAssetId) {
        const error = `Cache ${operation} failed: missing spawnId or spawnAssetId`;
        if (process.env.NODE_ENV === "development") {
          console.error(error, { spawnId, spawnAssetId, operation });
        }
        throw new Error(error);
      }

      // Validate that we're operating on the currently selected spawn
      if (spawnId !== selectedSpawnId) {
        const error = `Cache ${operation} boundary violation: spawnId mismatch (expected: ${selectedSpawnId}, got: ${spawnId})`;
        if (process.env.NODE_ENV === "development") {
          console.error(error, {
            expectedSpawnId: selectedSpawnId,
            actualSpawnId: spawnId,
            spawnAssetId,
            operation,
          });
        }
        throw new Error(error);
      }

      if (process.env.NODE_ENV === "development") {
        console.debug(`Cache ${operation} scope validated:`, {
          spawnId,
          spawnAssetId,
        });
      }
    },
    [selectedSpawnId],
  );

  const validateAssetScope = useCallback(
    (spawnAssetId: string | undefined, operation: string) => {
      if (!spawnAssetId) {
        const error = `Asset ${operation} failed: missing spawnAssetId`;
        if (process.env.NODE_ENV === "development") {
          console.error(error, { spawnAssetId, operation });
        }
        throw new Error(error);
      }

      // Validate that we're operating on the currently selected asset (if in asset-settings mode)
      if (
        centerPanelMode === "asset-settings" &&
        spawnAssetId !== selectedSpawnAssetId
      ) {
        const error = `Asset ${operation} boundary violation: spawnAssetId mismatch (expected: ${selectedSpawnAssetId}, got: ${spawnAssetId})`;
        if (process.env.NODE_ENV === "development") {
          console.error(error, {
            expectedSpawnAssetId: selectedSpawnAssetId,
            actualSpawnAssetId: spawnAssetId,
            operation,
          });
        }
        throw new Error(error);
      }

      if (process.env.NODE_ENV === "development") {
        console.debug(`Asset ${operation} scope validated:`, { spawnAssetId });
      }
    },
    [centerPanelMode, selectedSpawnAssetId],
  );

  // Immutable cache operations helper functions with isolation validation
  const setCacheEntry = useCallback(
    (
      spawnId: string | undefined,
      spawnAssetId: string | undefined,
      draft: AssetDraftCacheEntry,
    ) => {
      validateCacheScope(spawnId, spawnAssetId, "set");
      validateAssetScope(spawnAssetId, "set");

      const key = generateCacheKey(spawnId, spawnAssetId);
      if (process.env.NODE_ENV === "development") {
        console.debug("Setting cache entry:", key, draft);
      }
      assetDraftCacheRef.current = {
        ...assetDraftCacheRef.current,
        [key]: draft,
      };
    },
    [generateCacheKey, validateCacheScope, validateAssetScope],
  );

  const getCacheEntry = useCallback(
    (spawnId: string | undefined, spawnAssetId: string | undefined) => {
      validateCacheScope(spawnId, spawnAssetId, "get");
      validateAssetScope(spawnAssetId, "get");

      const key = generateCacheKey(spawnId, spawnAssetId);
      const entry = assetDraftCacheRef.current[key];
      if (process.env.NODE_ENV === "development") {
        console.debug(
          "Getting cache entry:",
          key,
          entry ? "found" : "not found",
        );
      }
      return entry;
    },
    [generateCacheKey, validateCacheScope, validateAssetScope],
  );

  const clearCacheEntry = useCallback(
    (spawnId: string | undefined, spawnAssetId: string | undefined) => {
      validateCacheScope(spawnId, spawnAssetId, "clear");
      validateAssetScope(spawnAssetId, "clear");

      const key = generateCacheKey(spawnId, spawnAssetId);
      if (process.env.NODE_ENV === "development") {
        console.debug("Clearing asset draft cache entry:", key);
      }
      const newCache = { ...assetDraftCacheRef.current };
      delete newCache[key];
      assetDraftCacheRef.current = newCache;
    },
    [generateCacheKey, validateCacheScope, validateAssetScope],
  );

  // Special cache operations for system-level clearing (bypasses asset scope validation)
  const clearCacheEntryUnsafe = useCallback(
    (spawnId: string | undefined, spawnAssetId: string | undefined) => {
      // Only validate cache scope, not asset scope (for system operations)
      validateCacheScope(spawnId, spawnAssetId, "clear-unsafe");

      const key = generateCacheKey(spawnId, spawnAssetId);
      if (process.env.NODE_ENV === "development") {
        console.debug(
          "Clearing asset draft cache entry (unsafe system operation):",
          key,
        );
      }
      const newCache = { ...assetDraftCacheRef.current };
      delete newCache[key];
      assetDraftCacheRef.current = newCache;
    },
    [generateCacheKey, validateCacheScope],
  );

  const clearAllCacheEntries = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("Clearing all asset draft cache entries");
    }
    assetDraftCacheRef.current = {};
  }, []);

  return {
    setCacheEntry,
    getCacheEntry,
    clearCacheEntry,
    clearCacheEntryUnsafe,
    clearAllCacheEntries,
  };
}
