import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Spawn } from "../../types/spawn";
import { SpawnService } from "../../services/spawnService";
import SpawnListItem from "./SpawnListItem";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { toast } from "sonner";
import { Search, X, ChevronDown, ArrowUpDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { getSpawnValidationStatus } from "../../utils/spawnValidation";
import { getTriggerTypeLabel } from "../../utils/triggerDisplay";
import { cn } from "../../utils/cn";

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
  const [toggleProcessingIds, setToggleProcessingIds] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "enabled" | "trigger" | "assets" | "status"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Filter and sort spawns
  const filteredAndSortedSpawns = useMemo(() => {
    let filtered = [...spawns];

    // Apply search/filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const tokens = q.split(/\s+/);
      filtered = filtered.filter((spawn) => {
        return tokens.every((token) => {
          // Prefix filters
          if (token.startsWith("trigger:")) {
            const want = token.slice(8).toLowerCase();
            const triggerType = getTriggerTypeLabel(
              spawn.trigger,
            ).toLowerCase();
            return triggerType === want || spawn.trigger?.type === want;
          }
          if (token.startsWith("status:")) {
            const want = token.slice(7).toLowerCase();
            const validation = getSpawnValidationStatus(spawn);
            return validation.status === want;
          }
          if (token.startsWith("enabled:")) {
            const want = token.slice(8).toLowerCase();
            const enabledStr = spawn.enabled ? "true" : "false";
            return enabledStr === want;
          }
          if (token.startsWith("assets:")) {
            const want = token.slice(7);
            const count = spawn.assets?.length || 0;
            if (want === "0" || want === "empty") {
              return count === 0;
            }
            const num = parseInt(want, 10);
            if (!isNaN(num)) {
              return count === num;
            }
            return false;
          }
          // Text search in name and description
          const hay = `${spawn.name} ${spawn.description || ""}`.toLowerCase();
          return hay.includes(token);
        });
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name": {
          comparison = a.name.localeCompare(b.name);
          break;
        }
        case "enabled": {
          comparison = a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1;
          break;
        }
        case "trigger": {
          const aTrigger = getTriggerTypeLabel(a.trigger);
          const bTrigger = getTriggerTypeLabel(b.trigger);
          comparison = aTrigger.localeCompare(bTrigger);
          break;
        }
        case "assets": {
          const aCount = a.assets?.length || 0;
          const bCount = b.assets?.length || 0;
          comparison = aCount - bCount;
          break;
        }
        case "status": {
          const aStatus = getSpawnValidationStatus(a);
          const bStatus = getSpawnValidationStatus(b);
          const statusOrder = { error: 0, warning: 1, valid: 2 };
          comparison =
            statusOrder[aStatus.status] - statusOrder[bStatus.status];
          break;
        }
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [spawns, searchQuery, sortBy, sortDirection]);

  // Reset focused index when filter changes
  useEffect(() => {
    focusedIndexRef.current = -1;
    setFocusedIndex(-1);
  }, [filteredAndSortedSpawns.length, searchQuery]);

  const handleSpawnClick = (spawn: Spawn) => {
    onSpawnClick?.(spawn);
  };

  const handleToggle = async (spawn: Spawn) => {
    // Prevent multiple simultaneous toggles for the same spawn
    if (toggleProcessingIds.has(spawn.id)) {
      return;
    }

    // Optimistically update local state
    const previousSpawn = spawn;
    const optimisticSpawn = {
      ...spawn,
      enabled: !spawn.enabled,
    };
    setSpawns((prev) =>
      prev.map((s) => (s.id === spawn.id ? optimisticSpawn : s)),
    );
    setToggleProcessingIds((prev) => new Set(prev).add(spawn.id));

    try {
      // Call service method based on current state
      const result = spawn.enabled
        ? await SpawnService.disableSpawn(spawn.id)
        : await SpawnService.enableSpawn(spawn.id);

      if (result.success && result.spawn) {
        // Update with actual spawn from service
        setSpawns((prev) =>
          prev.map((s) => (s.id === spawn.id ? result.spawn! : s)),
        );

        // Dispatch event to notify other panels
        try {
          window.dispatchEvent(
            new CustomEvent(
              "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
              {
                detail: {
                  spawnId: result.spawn.id,
                  updatedSpawn: result.spawn,
                },
              } as CustomEventInit,
            ),
          );
        } catch {
          // Best-effort notification
        }
      } else {
        // Revert optimistic update on error
        setSpawns((prev) =>
          prev.map((s) => (s.id === spawn.id ? previousSpawn : s)),
        );
        // Show error toast if available
        if (result.error) {
          toast.error(result.error);
        }
      }
    } catch (error) {
      // Revert optimistic update on exception
      setSpawns((prev) =>
        prev.map((s) => (s.id === spawn.id ? previousSpawn : s)),
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to toggle spawn enabled state",
      );
    } finally {
      setToggleProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(spawn.id);
        return next;
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
    if (filteredAndSortedSpawns.length === 0) return;

    if ((e.key === "f" || e.key === "F") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const current = focusedIndexRef.current;
      const next = Math.min(
        filteredAndSortedSpawns.length - 1,
        Math.max(0, current + 1),
      );
      focusedIndexRef.current = next;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const current = focusedIndexRef.current;
      const next = Math.max(
        0,
        current === -1 ? filteredAndSortedSpawns.length - 1 : current - 1,
      );
      focusedIndexRef.current = next;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      const index = focusedIndexRef.current;
      if (index >= 0 && index < filteredAndSortedSpawns.length) {
        e.preventDefault();
        handleSpawnClick(filteredAndSortedSpawns[index]);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      focusedIndexRef.current = 0;
      setFocusedIndex(0);
      itemRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const lastIndex = filteredAndSortedSpawns.length - 1;
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
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--color-fg))]">
              Spawns
            </h2>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              {filteredAndSortedSpawns.length === spawns.length
                ? `${spawns.length} spawn${spawns.length !== 1 ? "s" : ""}`
                : `${filteredAndSortedSpawns.length} of ${spawns.length} spawn${spawns.length !== 1 ? "s" : ""}`}
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
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search spawns... (e.g., trigger:manual, status:error)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8"
              aria-label="Search spawns"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[rgb(var(--color-muted))]/10"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
              </button>
            )}
          </div>
          {/* Sort Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="justify-between min-w-[140px]"
                aria-label={`Sort spawns by ${sortBy} ${sortDirection}`}
              >
                <div className="flex items-center gap-1">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="text-xs">
                    {sortBy === "name"
                      ? "Name"
                      : sortBy === "enabled"
                        ? "Enabled"
                        : sortBy === "trigger"
                          ? "Trigger"
                          : sortBy === "assets"
                            ? "Assets"
                            : "Status"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={cn(
                  "min-w-[180px] bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] rounded-md shadow-lg p-1 z-50",
                )}
                sideOffset={4}
                role="menu"
                aria-label="Sort options"
              >
                {(
                  [
                    { value: "name", label: "Name" },
                    { value: "enabled", label: "Enabled" },
                    { value: "trigger", label: "Trigger Type" },
                    { value: "assets", label: "Asset Count" },
                    { value: "status", label: "Status" },
                  ] as const
                ).map((option) => (
                  <DropdownMenu.Item
                    key={option.value}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors",
                      // Radix keyboard navigation highlight - use darker background in dark mode for better contrast
                      "data-[highlighted]:bg-[rgb(var(--color-muted))] dark:data-[highlighted]:bg-[rgb(var(--color-border))] data-[highlighted]:text-[rgb(var(--color-fg))]",
                      // Hover state
                      "hover:bg-[rgb(var(--color-muted))] dark:hover:bg-[rgb(var(--color-border))] hover:text-[rgb(var(--color-fg))]",
                      // Focus state (fallback)
                      "focus:bg-[rgb(var(--color-muted))] dark:focus:bg-[rgb(var(--color-border))] focus:text-[rgb(var(--color-fg))] focus:outline-none",
                      // Selected state
                      sortBy === option.value &&
                        "bg-[rgb(var(--color-accent))]/10 text-[rgb(var(--color-accent))]",
                    )}
                    onSelect={() => {
                      if (sortBy === option.value) {
                        setSortDirection(
                          sortDirection === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy(option.value);
                        setSortDirection("asc");
                      }
                    }}
                    role="menuitem"
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      <span className="text-xs opacity-70">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
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
      {filteredAndSortedSpawns.length === 0 && spawns.length > 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[rgb(var(--color-muted))] text-4xl mb-3">
              🔍
            </div>
            <h3 className="text-lg font-medium text-[rgb(var(--color-fg))] mb-2">
              No spawns match your search
            </h3>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))] max-w-xs mb-3">
              Try adjusting your search or filters to find what you're looking
              for.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto"
          role="listbox"
          aria-label={`Spawns list with ${filteredAndSortedSpawns.length} spawn${
            filteredAndSortedSpawns.length !== 1 ? "s" : ""
          }`}
          aria-describedby="spawn-list-instructions"
          onKeyDown={handleListKeyDown}
          tabIndex={0}
        >
          {/* Screen reader instructions */}
          <div id="spawn-list-instructions" className="sr-only">
            Use arrow keys to navigate between spawns. Press Enter or Space to
            select a spawn. Press Home to go to first spawn, End to go to last
            spawn. Press Ctrl+N or Cmd+N to create a new spawn. Press Ctrl+F or
            Cmd+F to focus search. Press Tab to focus on individual spawn
            controls.
          </div>
          {filteredAndSortedSpawns.map((spawn, index) => (
            <SpawnListItem
              key={spawn.id}
              spawn={spawn}
              isSelected={spawn.id === selectedSpawnId}
              onClick={handleSpawnClick}
              onToggle={handleToggle}
              isToggleProcessing={toggleProcessingIds.has(spawn.id)}
              itemRef={(el) => {
                itemRefs.current[index] = el;
              }}
              className="outline-none"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SpawnList;
