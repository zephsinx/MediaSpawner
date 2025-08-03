import React, { useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [processingToggles, setProcessingToggles] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const loadSpawns = () => {
      setIsLoading(true);
      setError(null);

      try {
        const allSpawns = SpawnService.getAllSpawns();
        setSpawns(allSpawns);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load spawns");
      } finally {
        setIsLoading(false);
      }
    };

    loadSpawns();
  }, []);

  const handleSpawnClick = (spawn: Spawn) => {
    onSpawnClick?.(spawn);
  };

  const handleToggle = async (spawn: Spawn, enabled: boolean) => {
    // Add to processing set
    setProcessingToggles((prev) => new Set(prev).add(spawn.id));

    // Optimistic update
    const originalSpawns = [...spawns];
    setSpawns((prev) =>
      prev.map((s) => (s.id === spawn.id ? { ...s, enabled } : s))
    );

    try {
      const result = enabled
        ? SpawnService.enableSpawn(spawn.id)
        : SpawnService.disableSpawn(spawn.id);

      if (!result.success) {
        // Revert optimistic update on error
        setSpawns(originalSpawns);
        setError(
          result.error || `Failed to ${enabled ? "enable" : "disable"} spawn`
        );
      } else {
        // Update with the actual result from service
        setSpawns((prev) =>
          prev.map((s) => (s.id === spawn.id ? result.spawn! : s))
        );
        setError(null);
      }
    } catch (err) {
      // Revert optimistic update on exception
      setSpawns(originalSpawns);
      setError(
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

  if (error) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <p className="text-sm text-gray-600">Failed to load spawns</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (spawns.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
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
        </div>
      </div>

      {/* Error message for toggle operations */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Spawn List */}
      <div className="flex-1 overflow-y-auto">
        {spawns.map((spawn) => (
          <SpawnListItem
            key={spawn.id}
            spawn={spawn}
            isSelected={spawn.id === selectedSpawnId}
            onClick={handleSpawnClick}
            onToggle={handleToggle}
            isToggleProcessing={processingToggles.has(spawn.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default SpawnList;
