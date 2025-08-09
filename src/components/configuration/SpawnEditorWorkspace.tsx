import React, { useEffect, useState } from "react";
import { usePanelState } from "../../hooks/useLayout";
import { SpawnService } from "../../services/spawnService";
import type { Spawn } from "../../types/spawn";

const SpawnEditorWorkspace: React.FC = () => {
  const { selectedSpawnId } = usePanelState();
  const [selectedSpawn, setSelectedSpawn] = useState<Spawn | null>(null);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (!selectedSpawnId) {
        if (isActive) setSelectedSpawn(null);
        return;
      }
      const allSpawns = await SpawnService.getAllSpawns();
      const found = allSpawns.find((s) => s.id === selectedSpawnId) || null;
      if (isActive) setSelectedSpawn(found);
    };
    load();
    return () => {
      isActive = false;
    };
  }, [selectedSpawnId]);

  if (!selectedSpawnId) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Spawn Editor</h2>
          <p className="text-sm text-gray-600">
            Select a spawn to edit its settings
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-600">
            Select a spawn from the list to begin editing.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">Spawn Editor</h2>
        <p className="text-sm text-gray-600">
          {selectedSpawn
            ? `Editing: ${selectedSpawn.name}`
            : "Loading spawn..."}
        </p>
      </div>
      <div className="flex-1 p-4">
        <div className="text-gray-500 text-sm">
          Basic editor workspace will appear here in MS-26.
        </div>
      </div>
    </div>
  );
};

export default SpawnEditorWorkspace;
