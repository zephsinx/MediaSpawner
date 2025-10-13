import React, { useEffect, useRef, useState } from "react";
import type { Spawn } from "../../types/spawn";
import { SpawnService } from "../../services/spawnService";
import SpawnListItem from "./SpawnListItem";
import { Button } from "../ui/Button";

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
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    const loadSpawns = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const allSpawns = await SpawnService.getAllSpawns();
        setSpawns(allSpawns);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load spawns",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSpawns();
  }, []);

  // Listen for profile changes to reload spawns
  useEffect(() => {
    const handleProfileChanged = (e: Event) => {
      const ce = e as CustomEvent<{
        profileId?: string;
        previousProfileId?: string;
      }>;
      const { profileId } = ce.detail || {};
      if (profileId) {
        // Reload spawns for the new profile
        const loadSpawns = async () => {
          setIsLoading(true);
          setLoadError(null);

          try {
            const allSpawns = await SpawnService.getAllSpawns();
            setSpawns(allSpawns);
          } catch (err) {
            setLoadError(
              err instanceof Error ? err.message : "Failed to load spawns",
            );
          } finally {
            setIsLoading(false);
          }
        };

        void loadSpawns();
      }
    };

    window.addEventListener(
      "mediaspawner:profile-changed" as unknown as keyof WindowEventMap,
      handleProfileChanged as EventListener,
    );

    return () => {
      window.removeEventListener(
        "mediaspawner:profile-changed" as unknown as keyof WindowEventMap,
        handleProfileChanged as EventListener,
      );
    };
  }, []);

  // Listen for external spawn updates to keep list in sync (name, enabled, etc.)
  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ spawnId?: string; updatedSpawn?: Spawn }>;
      const updatedSpawn = ce.detail?.updatedSpawn;
      if (updatedSpawn) {
        setSpawns((prev) =>
          prev.map((s) => (s.id === updatedSpawn.id ? updatedSpawn : s)),
        );
        return;
      }
      // If no payload provided, ignore to avoid clobbering optimistic UI with stale data
      // Other panels (editor) will send updatedSpawn payloads when needed
    };
    window.addEventListener(
      "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
      handleUpdated as EventListener,
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        handleUpdated as EventListener,
      );
    };
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
      handleDeleted as EventListener,
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:spawn-deleted" as unknown as keyof WindowEventMap,
        handleDeleted as EventListener,
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

  const handleToggle = (spawn: Spawn) => {
    // Select the spawn to open it in the editor where enabled can be changed
    handleSpawnClick(spawn);
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
        err instanceof Error ? err.message : "Failed to create spawn",
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--color-accent))] mx-auto mb-2"></div>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Loading spawns...
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-[rgb(var(--color-error))] text-2xl mb-2">⚠️</div>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Failed to load spawns
          </p>
          <p className="text-xs text-[rgb(var(--color-muted))] mt-1">
            {loadError}
          </p>
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
        current === -1 ? spawns.length - 1 : current - 1,
      );
      focusedIndexRef.current = next;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      const index = focusedIndexRef.current;
      if (index >= 0 && index < spawns.length) {
        e.preventDefault();
        handleSpawnClick(spawns[index]);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      focusedIndexRef.current = 0;
      setFocusedIndex(0);
      itemRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const lastIndex = spawns.length - 1;
      focusedIndexRef.current = lastIndex;
      setFocusedIndex(lastIndex);
      itemRefs.current[lastIndex]?.focus();
    } else if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCreateSpawn();
    }
  };

  if (spawns.length === 0) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <div className="p-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--color-fg))]">
                Spawns
              </h2>
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                0 spawns
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreateSpawn}
                disabled={isCreating}
                loading={isCreating}
                aria-label="Create New Spawn"
              >
                New Spawn
              </Button>
            </div>
          </div>
        </div>

        {createError && (
          <div className="p-3 bg-[rgb(var(--color-error-bg))] border-b border-[rgb(var(--color-error-border))]">
            <p className="text-sm text-[rgb(var(--color-error))]">
              {createError}
            </p>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[rgb(var(--color-muted))] text-4xl mb-3">
              📋
            </div>
            <h3 className="text-lg font-medium text-[rgb(var(--color-fg))] mb-2">
              No Spawns Found
            </h3>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))] max-w-xs">
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
      <div className="p-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--color-fg))]">
              Spawns
            </h2>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              {spawns.length} spawn{spawns.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreateSpawn}
              disabled={isCreating}
              loading={isCreating}
              aria-label="Create New Spawn"
            >
              New Spawn
            </Button>
          </div>
        </div>
      </div>

      {/* Error banners */}
      {createError && (
        <div className="p-3 bg-[rgb(var(--color-error-bg))] border-b border-[rgb(var(--color-error-border))]">
          <p className="text-sm text-[rgb(var(--color-error))]">
            {createError}
          </p>
        </div>
      )}

      {/* Spawn List */}
      <div
        className="flex-1 overflow-y-auto"
        role="listbox"
        aria-label={`Spawns list with ${spawns.length} spawn${
          spawns.length !== 1 ? "s" : ""
        }`}
        aria-describedby="spawn-list-instructions"
        onKeyDown={handleListKeyDown}
        tabIndex={0}
      >
        {/* Screen reader instructions */}
        <div id="spawn-list-instructions" className="sr-only">
          Use arrow keys to navigate between spawns. Press Enter or Space to
          select a spawn. Press Home to go to first spawn, End to go to last
          spawn. Press Ctrl+N or Cmd+N to create a new spawn. Press Tab to focus
          on individual spawn controls.
        </div>
        {spawns.map((spawn, index) => (
          <SpawnListItem
            key={spawn.id}
            spawn={spawn}
            isSelected={spawn.id === selectedSpawnId}
            onClick={handleSpawnClick}
            onToggle={handleToggle}
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
