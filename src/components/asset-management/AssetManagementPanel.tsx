import React, { useEffect, useMemo, useState } from "react";
import { usePanelState } from "../../hooks/useLayout";
import { SpawnService } from "../../services/spawnService";
import { AssetService } from "../../services/assetService";
import type { Spawn, SpawnAsset } from "../../types/spawn";
import type { MediaAsset } from "../../types/media";
import { MediaPreview } from "../common/MediaPreview";

/**
 * AssetManagementPanel renders the right-panel structure for Epic 4 (MS-32):
 * two vertically-stacked sections with clear separation that adapt to height.
 * Data wiring and interactivity are intentionally deferred to later stories.
 */
type ResolvedSpawnAsset = {
  spawnAsset: SpawnAsset;
  baseAsset: MediaAsset;
};

function SpawnAssetsSection() {
  const { selectedSpawnId } = usePanelState();
  const [spawn, setSpawn] = useState<Spawn | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (!selectedSpawnId) {
        setSpawn(null);
        return;
      }
      setIsLoading(true);
      setLoadError(null);
      try {
        const s = await SpawnService.getSpawn(selectedSpawnId);
        if (isActive) setSpawn(s);
      } catch (e) {
        if (isActive)
          setLoadError(e instanceof Error ? e.message : "Failed to load spawn");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, [selectedSpawnId]);

  const resolvedAssets: ResolvedSpawnAsset[] = useMemo(() => {
    if (!spawn) return [];
    const items = [...spawn.assets]
      .sort((a, b) => a.order - b.order)
      .map((sa) => {
        const base = AssetService.getAssetById(sa.assetId);
        return base ? { spawnAsset: sa, baseAsset: base } : null;
      })
      .filter(Boolean) as ResolvedSpawnAsset[];
    return items;
  }, [spawn]);

  const renderEmptyState = () => {
    if (!selectedSpawnId) {
      return (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          Select a spawn to see its assets
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Loading assets…</p>
          </div>
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="h-full flex items-center justify-center text-red-600 text-sm">
          {loadError}
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No assets assigned to this spawn
      </div>
    );
  };

  const getTypeIcon = (type: MediaAsset["type"]) =>
    type === "image" ? "🖼️" : type === "video" ? "🎥" : "🎵";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 lg:px-4 lg:py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm lg:text-base font-semibold text-gray-800">
          <span>Assets in Current Spawn</span>
          {spawn && (
            <span className="ml-2 text-gray-600">({spawn.assets.length})</span>
          )}
        </h2>
      </div>
      <div
        className="flex-1 overflow-auto p-3 lg:p-4"
        role="region"
        aria-label="Assets in Current Spawn"
      >
        {!spawn || spawn.assets.length === 0 || resolvedAssets.length === 0 ? (
          renderEmptyState()
        ) : (
          <ul role="list" className="space-y-2">
            {resolvedAssets.map(({ baseAsset, spawnAsset }) => (
              <li
                role="listitem"
                key={spawnAsset.id}
                className="border border-gray-200 rounded-md bg-white p-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 flex-shrink-0">
                    <MediaPreview asset={baseAsset} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium text-gray-900 truncate"
                      title={baseAsset.name}
                    >
                      {baseAsset.name}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 capitalize bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        <span>{getTypeIcon(baseAsset.type)}</span>
                        <span>{baseAsset.type}</span>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">
                        Order: {spawnAsset.order}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AssetLibrarySection() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);

  useEffect(() => {
    // Initial load
    setAssets(AssetService.getAssets());

    // Listen for external updates to refresh list
    const handler = () => setAssets(AssetService.getAssets());
    window.addEventListener(
      "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
      handler as EventListener
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
        handler as EventListener
      );
    };
  }, []);

  const getTypeIcon = (type: MediaAsset["type"]) =>
    type === "image" ? "🖼️" : type === "video" ? "🎥" : "🎵";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 lg:px-4 lg:py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm lg:text-base font-semibold text-gray-800">
          <span>Asset Library</span>
          <span className="ml-2 text-gray-600">({assets.length})</span>
        </h2>
      </div>
      <div
        className="flex-1 overflow-auto p-3 lg:p-4"
        role="region"
        aria-label="Asset Library"
      >
        {assets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No assets in library
          </div>
        ) : (
          <ul role="list" className="space-y-2">
            {assets.map((asset) => (
              <li
                role="listitem"
                key={asset.id}
                className="border border-gray-200 rounded-md bg-white p-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 flex-shrink-0">
                    <MediaPreview asset={asset} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium text-gray-900 truncate"
                      title={asset.name}
                    >
                      {asset.name}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 capitalize bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        <span>{getTypeIcon(asset.type)}</span>
                        <span>{asset.type}</span>
                      </span>
                      <span className="text-gray-400">•</span>
                      <span
                        className="text-gray-500"
                        title={asset.isUrl ? "URL asset" : "Local file"}
                      >
                        {asset.isUrl ? "🌐" : "📁"}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const AssetManagementPanel: React.FC = () => {
  const bottomHeaderId = "asset-library-header";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Section: Assets in Current Spawn */}
      <section className="flex flex-col overflow-hidden flex-[3] min-h-[80px] border-b border-gray-200">
        <SpawnAssetsSection />
      </section>

      {/* Bottom Section: Asset Library */}
      <section
        aria-labelledby={bottomHeaderId}
        className="flex flex-col overflow-hidden flex-[7] min-h-[200px]"
      >
        <AssetLibrarySection />
      </section>
    </div>
  );
};

export default AssetManagementPanel;
