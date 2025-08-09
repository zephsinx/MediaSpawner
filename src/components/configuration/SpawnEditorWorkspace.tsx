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

  const formatDate = (ms: number | undefined) => {
    if (!ms) return "-";
    try {
      return new Date(ms).toLocaleString();
    } catch {
      return String(ms);
    }
  };

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
        {selectedSpawn ? (
          <div className="max-w-2xl space-y-5">
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Basic Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="spawn-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="spawn-name"
                    type="text"
                    value={selectedSpawn.name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spawn-enabled"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Status
                  </label>
                  <input
                    id="spawn-enabled"
                    type="text"
                    value={selectedSpawn.enabled ? "Enabled" : "Disabled"}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
                <div className="md:col-span-2">
                  <label
                    htmlFor="spawn-description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="spawn-description"
                    value={selectedSpawn.description || ""}
                    disabled
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 resize-none"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Metadata
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="spawn-id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    ID
                  </label>
                  <input
                    id="spawn-id"
                    type="text"
                    value={selectedSpawn.id}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spawn-modified"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Modified
                  </label>
                  <input
                    id="spawn-modified"
                    type="text"
                    value={formatDate(selectedSpawn.lastModified)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spawn-duration"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Duration (ms)
                  </label>
                  <input
                    id="spawn-duration"
                    type="number"
                    value={selectedSpawn.duration ?? 0}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="spawn-assets"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Assets
                  </label>
                  <input
                    id="spawn-assets"
                    type="text"
                    value={`${selectedSpawn.assets.length} item${
                      selectedSpawn.assets.length === 1 ? "" : "s"
                    }`}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                  />
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Loading spawn...</div>
        )}
      </div>
    </div>
  );
};

export default SpawnEditorWorkspace;
