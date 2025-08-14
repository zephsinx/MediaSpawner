import React, { useEffect, useMemo, useState } from "react";
import { usePanelState } from "../../hooks/useLayout";
import { SpawnService } from "../../services/spawnService";
import { AssetService } from "../../services/assetService";
import type { Spawn, SpawnAsset } from "../../types/spawn";
import type { MediaAsset } from "../../types/media";
import { MediaPreview } from "../common/MediaPreview";
import {
  detectAssetTypeFromPath,
  getSupportedExtensions,
} from "../../utils/assetTypeDetection";
import { validateUrlFormat } from "../../utils/assetValidation";
import { createSpawnAsset } from "../../types/spawn";
import { ConfirmDialog } from "../common/ConfirmDialog";

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
  const { selectedSpawnId, selectSpawnAsset, setCenterPanelMode } =
    usePanelState();
  const [spawn, setSpawn] = useState<Spawn | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [skipRemoveConfirm, setSkipRemoveConfirm] = useState<boolean>(false);

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

    const onSpawnUpdated = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | { spawnId?: string }
        | undefined;
      if (!detail || !detail.spawnId) return;
      if (detail.spawnId === selectedSpawnId) {
        void load();
      }
    };

    window.addEventListener(
      "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
      onSpawnUpdated as EventListener
    );

    return () => {
      isActive = false;
      window.removeEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        onSpawnUpdated as EventListener
      );
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

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (!spawn || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const current = [...spawn.assets].sort((a, b) => a.order - b.order);
    if (fromIndex >= current.length || toIndex >= current.length) return;
    const moved = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, moved);
    const reindexed: SpawnAsset[] = current.map((sa, idx) => ({
      ...sa,
      order: idx,
    }));
    if (!selectedSpawnId) return;
    const result = await SpawnService.updateSpawn(selectedSpawnId, {
      assets: reindexed,
    });
    if (!result.success) {
      setRemoveError(result.error || "Failed to reorder assets");
      return;
    }
    window.dispatchEvent(
      new CustomEvent(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        { detail: { spawnId: selectedSpawnId } } as CustomEventInit
      )
    );
  };

  const performRemove = async (removeId: string) => {
    if (!selectedSpawnId || !spawn) return;
    setIsRemoving(true);
    setRemoveError(null);
    try {
      const remaining = spawn.assets.filter((sa) => sa.id !== removeId);
      const reindexed: SpawnAsset[] = remaining.map((sa, idx) => ({
        ...sa,
        order: idx,
      }));
      const result = await SpawnService.updateSpawn(selectedSpawnId, {
        assets: reindexed,
      });
      if (!result.success) {
        setRemoveError(result.error || "Failed to remove asset from spawn");
        return;
      }
      window.dispatchEvent(
        new CustomEvent(
          "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
          { detail: { spawnId: selectedSpawnId } } as CustomEventInit
        )
      );
    } catch (e) {
      setRemoveError(
        e instanceof Error ? e.message : "Failed to remove asset from spawn"
      );
    } finally {
      setIsRemoving(false);
      setConfirmRemoveId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemoveId) return;
    await performRemove(confirmRemoveId);
  };

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
        {removeError && (
          <div className="mb-2 text-xs text-red-600" role="alert">
            {removeError}
          </div>
        )}
        {!spawn || spawn.assets.length === 0 || resolvedAssets.length === 0 ? (
          renderEmptyState()
        ) : (
          <ul role="list" className="space-y-2">
            {resolvedAssets.map(({ baseAsset, spawnAsset }, index) => (
              <li
                role="listitem"
                key={spawnAsset.id}
                className={`border border-gray-200 rounded-md bg-white p-2 ${
                  draggingId === spawnAsset.id ? "opacity-70" : ""
                }`}
                draggable
                onDragStart={(e) => {
                  setDraggingId(spawnAsset.id);
                  e.dataTransfer.setData("text/plain", String(index));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverIndex(index);
                }}
                onDragLeave={() =>
                  setDragOverIndex((cur) => (cur === index ? null : cur))
                }
                onDrop={async (e) => {
                  e.preventDefault();
                  const fromIndexStr = e.dataTransfer.getData("text/plain");
                  const fromIndex = Number(fromIndexStr);
                  const toIndex = index;
                  setDraggingId(null);
                  setDragOverIndex(null);
                  if (!Number.isNaN(fromIndex)) {
                    await handleReorder(fromIndex, toIndex);
                  }
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverIndex(null);
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 text-gray-400 cursor-grab select-none"
                    title="Drag to reorder"
                    aria-hidden
                  >
                    ⋮⋮
                  </div>
                  <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded">
                    <MediaPreview
                      asset={baseAsset}
                      className="h-full"
                      fit="contain"
                    />
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
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={`mr-2 text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
                      onClick={() => {
                        selectSpawnAsset(spawnAsset.id);
                        setCenterPanelMode("asset-settings");
                      }}
                    >
                      Configure
                    </button>
                    <button
                      type="button"
                      className={`text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 ${
                        isRemoving
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-50"
                      }`}
                      aria-label="Remove from Spawn"
                      onClick={() => {
                        if (skipRemoveConfirm) {
                          // Remove immediately without opening modal
                          void performRemove(spawnAsset.id);
                        } else {
                          // Open modal
                          setConfirmRemoveId(spawnAsset.id);
                        }
                      }}
                      disabled={isRemoving}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {dragOverIndex === index && draggingId !== null && (
                  <div className="mt-2 h-0.5 bg-blue-500 rounded" aria-hidden />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog
        isOpen={Boolean(confirmRemoveId)}
        title="Remove asset from spawn?"
        message="This will remove the asset from the current spawn. The asset will remain available in the library."
        confirmText={isRemoving ? "Removing…" : "Remove"}
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (skipRemoveConfirm && confirmRemoveId) {
            // Persist skip and remove; dialog will close via performRemove
            void performRemove(confirmRemoveId);
          } else {
            void handleConfirmRemove();
          }
        }}
        onCancel={() => setConfirmRemoveId(null)}
        extraContent={
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={skipRemoveConfirm}
              onChange={(e) => setSkipRemoveConfirm(e.target.checked)}
            />
            Don’t ask again (this session)
          </label>
        }
      />
    </div>
  );
}

function AssetLibrarySection() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isAddingUrl, setIsAddingUrl] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>("");
  const [addError, setAddError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { selectedSpawnId } = usePanelState();
  const [assigningAssetId, setAssigningAssetId] = useState<string | null>(null);
  const [lastAddedAssetId, setLastAddedAssetId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const validateUrl = (value: string): string | null => {
    const res = validateUrlFormat(value);
    return res.isValid ? null : res.error || "Invalid URL";
  };

  const handleAddUrl = async () => {
    const error = validateUrl(urlInput);
    if (error) {
      setAddError(error);
      return;
    }
    const trimmed = urlInput.trim();

    // Duplicate prevention by path for URL assets
    const existing = AssetService.getAssets();
    if (existing.some((a) => a.isUrl && a.path === trimmed)) {
      setAddError("Asset with this URL already exists");
      return;
    }

    setIsSubmitting(true);
    setAddError(null);
    try {
      const type = detectAssetTypeFromPath(trimmed);
      const name = trimmed.split("/").pop() || trimmed;
      AssetService.addAsset(type, name, trimmed);
      setUrlInput("");
      setIsAddingUrl(false);
      setAssets(AssetService.getAssets());
      window.dispatchEvent(
        new Event(
          "mediaspawner:assets-updated" as unknown as keyof WindowEventMap
        )
      );
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add URL asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportedAccept = React.useMemo(() => {
    const all = getSupportedExtensions();
    return all.map((ext) => `.${ext}`).join(",");
  }, []);

  const handleFilesSelected: React.ChangeEventHandler<HTMLInputElement> = (
    e
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const existing = AssetService.getAssets();
    const errors: string[] = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const f = fileList[i];
      const filename = f.name.trim();
      if (!filename) {
        errors.push("Skipped an unnamed file");
        continue;
      }
      // Duplicate prevention by filename for local assets
      if (existing.some((a) => a.isUrl === false && a.path === filename)) {
        errors.push(`${filename}: already in library`);
        continue;
      }
      const type = detectAssetTypeFromPath(filename);
      // Basic format-only validation via extension mapping already used by detector
      const ext = filename.split(".").pop()?.toLowerCase();
      if (!ext || !getSupportedExtensions().includes(ext)) {
        errors.push(`${filename}: unsupported file type`);
        continue;
      }
      const name = filename;
      AssetService.addAsset(type, name, filename);
    }
    setAssets(AssetService.getAssets());
    window.dispatchEvent(
      new Event(
        "mediaspawner:assets-updated" as unknown as keyof WindowEventMap
      )
    );
    // Compose error summary
    if (errors.length > 0) {
      setFilesError(
        `${errors.length} file(s) skipped: ${errors.slice(0, 3).join("; ")}${
          errors.length > 3 ? "…" : ""
        }`
      );
    } else {
      setFilesError(null);
    }
    // Reset input so the same files can be reselected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddToSpawn = async (asset: MediaAsset) => {
    if (!selectedSpawnId) return;
    setAssigningAssetId(asset.id);
    setAddError(null);
    try {
      const spawn = await SpawnService.getSpawn(selectedSpawnId);
      if (!spawn) {
        setAddError("Failed to load selected spawn");
        return;
      }

      const isDuplicate = spawn.assets.some((sa) => sa.assetId === asset.id);
      if (isDuplicate) {
        setAddError("Asset already exists in this spawn");
        return;
      }

      const newOrder = spawn.assets.length;
      const newSpawnAsset: SpawnAsset = createSpawnAsset(
        asset.id,
        newOrder,
        spawn.defaultProperties
          ? { properties: { ...spawn.defaultProperties } }
          : undefined
      );
      const result = await SpawnService.updateSpawn(selectedSpawnId, {
        assets: [...spawn.assets, newSpawnAsset],
      });
      if (!result.success) {
        setAddError(result.error || "Failed to add asset to spawn");
        return;
      }

      setLastAddedAssetId(asset.id);
      window.dispatchEvent(
        new CustomEvent(
          "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
          { detail: { spawnId: selectedSpawnId } } as CustomEventInit
        )
      );

      window.setTimeout(
        () => setLastAddedAssetId((id) => (id === asset.id ? null : id)),
        1200
      );
    } catch (e) {
      setAddError(
        e instanceof Error ? e.message : "Failed to add asset to spawn"
      );
    } finally {
      setAssigningAssetId(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 lg:px-4 lg:py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm lg:text-base font-semibold text-gray-800">
            <span>Asset Library</span>
            <span className="ml-2 text-gray-600">({assets.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add local assets"
            >
              Add Asset
            </button>
            {!isAddingUrl && (
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setAddError(null);
                  setUrlInput("");
                  setIsAddingUrl(true);
                }}
                aria-label="Add URL Asset"
              >
                Add URL
              </button>
            )}
          </div>
        </div>
        {addError && (
          <div className="mt-2 text-xs text-red-600" role="alert">
            {addError}
          </div>
        )}
        {filesError && (
          <div className="mt-2 text-xs text-orange-700" role="alert">
            {filesError}
          </div>
        )}
        {/* Hidden file input for local assets (kept inside header container to preserve sibling order for tests) */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={supportedAccept}
          onChange={handleFilesSelected}
          className="hidden"
          aria-hidden
        />
      </div>
      {isAddingUrl && (
        <div className="px-3 lg:px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/media.png"
              className="flex-1 min-w-0 sm:w-96 max-w-full px-2 py-1 border border-gray-300 rounded text-sm"
              aria-label="Asset URL"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`text-xs px-2 py-1 rounded text-white ${
                  isSubmitting
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                onClick={handleAddUrl}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setIsAddingUrl(false);
                  setAddError(null);
                  setUrlInput("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
                  <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded">
                    <MediaPreview
                      asset={asset}
                      className="h-full"
                      fit="contain"
                    />
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
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={`text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 ${
                        !selectedSpawnId || assigningAssetId === asset.id
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-50"
                      }`}
                      aria-label="Add to Spawn"
                      onClick={() => handleAddToSpawn(asset)}
                      disabled={
                        !selectedSpawnId || assigningAssetId === asset.id
                      }
                    >
                      {lastAddedAssetId === asset.id
                        ? "Added"
                        : assigningAssetId === asset.id
                        ? "Adding…"
                        : "Add to Spawn"}
                    </button>
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
