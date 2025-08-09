import React, { useEffect, useRef, useState } from "react";
import type { Spawn } from "../../types/spawn";
import { SpawnService } from "../../services/spawnService";
import SpawnListItem from "./SpawnListItem";

/**
 * Props for the spawn list component
 */
export interface SpawnListProps {
  /** Callback when a spawn is clicked */
  onSpawnClick?: (spawn: Spawn) => void;
  /** Currently selected spawn ID */
  selectedSpawnId?: string;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Main spawn list component that displays all spawns
 */
const SpawnList: React.FC<SpawnListProps> = ({
  onSpawnClick,
  selectedSpawnId,
  className = "",
}) => {
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [processingToggles, setProcessingToggles] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const loadSpawns = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const allSpawns = await SpawnService.getAllSpawns();
        setSpawns(allSpawns);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load spawns"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSpawns();
  }, []);

  // Respond to external spawn deletion events to keep list in sync
  useEffect(() => {
    const handleDeleted = (e: Event) => {
      const ce = e as CustomEvent<{ id?: string }>;
      const id = ce.detail?.id;
      if (id) {
        setSpawns((prev) => prev.filter((s) => s.id !== id));
      } else {
        // Fallback: reload list
        SpawnService.getAllSpawns()
          .then(setSpawns)
          .catch(() => void 0);
      }
    };
    window.addEventListener(
      "mediaspawner:spawn-deleted" as unknown as keyof WindowEventMap,
      handleDeleted as EventListener
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:spawn-deleted" as unknown as keyof WindowEventMap,
        handleDeleted as EventListener
      );
    };
  }, []);

  // Keyboard navigation state and refs must be declared unconditionally
  const [, setFocusedIndex] = useState<number>(-1);
  const focusedIndexRef = useRef<number>(-1);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const handleSpawnClick = (spawn: Spawn) => {
    onSpawnClick?.(spawn);
  };

  const handleToggle = async (spawn: Spawn, enabled: boolean) => {
    // Add to processing set
    setProcessingToggles((prev) => new Set(prev).add(spawn.id));

    // Optimistic update
    const originalSpawns = [...spawns];

    setSpawns((prev) => {
      const updated = prev.map((s) =>
        s.id === spawn.id ? { ...s, enabled } : s
      );
      return updated;
    });

    try {
      const result = enabled
        ? await SpawnService.enableSpawn(spawn.id)
        : await SpawnService.disableSpawn(spawn.id);

      if (!result.success) {
        // Revert optimistic update on error
        setSpawns(originalSpawns);
        setToggleError(
          result.error || `Failed to ${enabled ? "enable" : "disable"} spawn`
        );
      } else {
        // Update with the actual result from service
        setSpawns((prev) => {
          const updated = prev.map((s) =>
            s.id === spawn.id ? result.spawn! : s
          );
          return updated;
        });
        setToggleError(null);
      }
    } catch (err) {
      // Revert optimistic update on exception
      setSpawns(originalSpawns);
      setToggleError(
        err instanceof Error
          ? err.message
          : `Failed to ${enabled ? "enable" : "disable"} spawn`
      );
    } finally {
      // Remove from processing set
      setProcessingToggles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(spawn.id);
        return newSet;
      });
    }
  };

  const generateDefaultName = (existing: string[]): string => {
    const base = "New Spawn";
    let i = 1;
    const set = new Set(existing);
    while (set.has(`${base} ${i}`)) i += 1;
    return `${base} ${i}`;
  };

  const handleCreateSpawn = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);
      const existingNames = spawns.map((s) => s.name);
      let candidate = generateDefaultName(existingNames);
      let attempt = 0;
      const maxAttempts = 50;
      // Try until success or non-duplicate error
      // Avoid scope creep: simple bounded retry loop for rare race conditions
      // Rely on service defaults for other fields
      while (attempt < maxAttempts) {
        const result = await SpawnService.createSpawn(candidate);
        if (result.success && result.spawn) {
          // Update local state immediately
          setSpawns((prev) => [...prev, result.spawn!]);
          // Request selection upstream
          onSpawnClick?.(result.spawn!);
          setIsCreating(false);
          return;
        }
        // If duplicate name error, bump and retry; otherwise surface error
        if (result.error && /already exists/i.test(result.error)) {
          attempt += 1;
          candidate = generateDefaultName([...existingNames, candidate]);
          continue;
        } else {
          setCreateError(result.error || "Failed to create spawn");
          setIsCreating(false);
          return;
        }
      }
      setCreateError("Failed to generate a unique name for the new spawn");
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create spawn"
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading spawns...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-sm text-gray-600">Failed to load spawns</p>
          <p className="text-xs text-gray-500 mt-1">{loadError}</p>
        </div>
      </div>
    );
  }

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (spawns.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const current = focusedIndexRef.current;
      const next = Math.min(spawns.length - 1, Math.max(0, current + 1));
      focusedIndexRef.current = next;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const current = focusedIndexRef.current;
      const next = Math.max(
        0,
        current === -1 ? spawns.length - 1 : current - 1
      );
      focusedIndexRef.current = next;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === "Enter") {
      const index = focusedIndexRef.current;
      if (index >= 0 && index < spawns.length) {
        e.preventDefault();
        handleSpawnClick(spawns[index]);
      }
    }
  };

  if (spawns.length === 0) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Spawns</h2>
              <p className="text-sm text-gray-600">0 spawns</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateSpawn}
                disabled={isCreating}
                className={`inline-flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${
                  isCreating ? "opacity-60 cursor-not-allowed" : ""
                }`}
                aria-label="Create New Spawn"
              >
                {isCreating && (
                  <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                New Spawn
              </button>
            </div>
          </div>
        </div>

        {(toggleError || createError) && (
          <div className="p-3 bg-red-50 border-b border-red-200">
            {toggleError && (
              <p className="text-sm text-red-700">{toggleError}</p>
            )}
            {createError && (
              <p className="text-sm text-red-700">{createError}</p>
            )}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-3">📋</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No Spawns Found
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              You haven't created any spawns yet. Create your first spawn to get
              started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Spawns</h2>
            <p className="text-sm text-gray-600">
              {spawns.length} spawn{spawns.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateSpawn}
              disabled={isCreating}
              className={`inline-flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${
                isCreating ? "opacity-60 cursor-not-allowed" : ""
              }`}
              aria-label="Create New Spawn"
            >
              {isCreating && (
                <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              New Spawn
            </button>
          </div>
        </div>
      </div>

      {/* Error banners */}
      {(toggleError || createError) && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          {toggleError && <p className="text-sm text-red-700">{toggleError}</p>}
          {createError && <p className="text-sm text-red-700">{createError}</p>}
        </div>
      )}

      {/* Spawn List */}
      <div
        className="flex-1 overflow-y-auto"
        role="listbox"
        aria-label="Spawns"
        onKeyDown={handleListKeyDown}
        tabIndex={0}
      >
        {spawns.map((spawn, index) => (
          <SpawnListItem
            key={spawn.id}
            spawn={spawn}
            isSelected={spawn.id === selectedSpawnId}
            onClick={handleSpawnClick}
            onToggle={handleToggle}
            isToggleProcessing={processingToggles.has(spawn.id)}
            itemRef={(el) => {
              itemRefs.current[index] = el;
            }}
            className="outline-none"
          />
        ))}
      </div>
    </div>
  );
};

export default SpawnList;
