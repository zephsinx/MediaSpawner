import { useEffect, useMemo, useState } from "react";
import { usePanelState } from "../../../hooks/useLayout";
import { SpawnService } from "../../../services/spawnService";
import { AssetService } from "../../../services/assetService";
import type { Spawn, SpawnAsset } from "../../../types/spawn";
import type { MediaAsset } from "../../../types/media";
import { createSpawnAsset } from "../../../types/spawn";
import { Button } from "../../ui/Button";
import {
  buildSpawnAssetsDiff,
  type SpawnAssetsDiff,
} from "../../../utils/spawnAssetsDiff";
import { toast } from "sonner";
import {
  dispatchMediaSpawnerEvent,
  MediaSpawnerEvents,
  useMediaSpawnerEvent,
} from "../../../hooks/useMediaSpawnerEvent";
import type { ResolvedSpawnAsset } from "../types";
import { SpawnAssetItem } from "./SpawnAssetItem";
import { PendingChangesPanel } from "./PendingChangesPanel";

/**
 * Section displaying assets in the currently selected spawn with drag-drop reordering.
 */
export function SpawnAssetsSection() {
  const { selectedSpawnId, setUnsavedChanges } = usePanelState();
  const [spawn, setSpawn] = useState<Spawn | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);

  // Draft state for asset operations
  const [draftAssets, setDraftAssets] = useState<SpawnAsset[] | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showChanges, setShowChanges] = useState<boolean>(false);

  // Compute if there are unsaved asset changes
  const hasAssetChanges = useMemo(() => {
    if (!spawn || !draftAssets) return false;
    return JSON.stringify(draftAssets) !== JSON.stringify(spawn.assets);
  }, [spawn, draftAssets]);

  // Update context unsaved changes state
  useEffect(() => {
    setUnsavedChanges(hasAssetChanges, hasAssetChanges ? "spawn" : "none");
  }, [hasAssetChanges, setUnsavedChanges]);

  // Reset expanded changes when draft cleared
  useEffect(() => {
    if (!hasAssetChanges) setShowChanges(false);
  }, [hasAssetChanges]);

  useEffect(() => {
    const load = async () => {
      if (!selectedSpawnId) {
        setSpawn(null);
        setDraftAssets(null);
        return;
      }
      setIsLoading(true);
      setLoadError(null);
      setSaveError(null);
      try {
        const s = await SpawnService.getSpawn(selectedSpawnId);
        setSpawn(s);
        setDraftAssets(null);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load spawn");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selectedSpawnId]);

  useMediaSpawnerEvent(
    MediaSpawnerEvents.SPAWN_UPDATED,
    (event) => {
      const detail = event.detail;
      if (detail.spawnId === selectedSpawnId && detail.updatedSpawn) {
        setSpawn(detail.updatedSpawn);
      } else if (detail.spawnId === selectedSpawnId) {
        const load = async () => {
          const s = await SpawnService.getSpawn(selectedSpawnId);
          setSpawn(s);
        };
        void load();
      }
    },
    [selectedSpawnId],
  );

  useMediaSpawnerEvent(MediaSpawnerEvents.PROFILE_CHANGED, (event) => {
    const { profileId } = event.detail;
    if (profileId) {
      setSpawn(null);
      setLoadError(null);
      setIsLoading(false);
      setDraggingId(null);
      setDragOverIndex(null);
      setRemoveError(null);
      setDraftAssets(null);
      setSaveError(null);
    }
  });

  useMediaSpawnerEvent(
    MediaSpawnerEvents.REQUEST_ADD_ASSET_TO_SPAWN,
    (event) => {
      const { assetId, assetName } = event.detail;
      if (!assetId || !spawn) return;

      const current = draftAssets ?? spawn.assets;

      // Check for duplicates
      const isDuplicate = current.some((sa) => sa.assetId === assetId);
      if (isDuplicate) {
        toast.error("Asset already exists in this spawn");
        return;
      }

      // Add to draft
      const newOrder = current.length;
      const newSpawnAsset: SpawnAsset = createSpawnAsset(assetId, newOrder);
      setDraftAssets([...current, newSpawnAsset]);
      toast.success(`Added to spawn: ${assetName} (unsaved)`);
    },
    [spawn, draftAssets],
  );

  useEffect(() => {
    setAssets(AssetService.getAssets());
  }, []);

  useMediaSpawnerEvent(MediaSpawnerEvents.ASSETS_UPDATED, () => {
    setAssets(AssetService.getAssets());
  });

  // Use draft assets if available, otherwise use spawn assets
  const currentAssets = useMemo(() => {
    return draftAssets ?? spawn?.assets ?? [];
  }, [draftAssets, spawn?.assets]);

  // Emit draft count for header display
  useEffect(() => {
    if (!selectedSpawnId) return;
    const count = currentAssets.length;
    const isDraft = draftAssets !== null;
    dispatchMediaSpawnerEvent(MediaSpawnerEvents.DRAFT_ASSET_COUNT_CHANGED, {
      spawnId: selectedSpawnId,
      count,
      isDraft,
    });
  }, [currentAssets, draftAssets, selectedSpawnId]);

  const resolvedAssets: ResolvedSpawnAsset[] = useMemo(() => {
    const assetsMap = new Map(assets.map((a) => [a.id, a]));
    const items = [...currentAssets]
      .sort((a, b) => a.order - b.order)
      .map((sa) => {
        const base = assetsMap.get(sa.assetId);
        return base ? { spawnAsset: sa, baseAsset: base } : null;
      })
      .filter(Boolean) as ResolvedSpawnAsset[];
    return items;
  }, [currentAssets, assets]);

  // Compute grouped diff for Added / Removed / Reordered
  const changesDiff: SpawnAssetsDiff | null = useMemo(() => {
    if (!spawn || !draftAssets) return null;
    return buildSpawnAssetsDiff(spawn.assets, draftAssets);
  }, [spawn, draftAssets]);

  const assetInfoById = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const current = [...currentAssets].sort((a, b) => a.order - b.order);
    if (fromIndex >= current.length || toIndex >= current.length) return;
    const moved = current.splice(fromIndex, 1)[0];
    current.splice(toIndex, 0, moved);
    const reindexed: SpawnAsset[] = current.map((sa, idx) => ({
      ...sa,
      order: idx,
    }));
    setDraftAssets(reindexed);
    setRemoveError(null);
  };

  const performRemove = (removeId: string) => {
    setRemoveError(null);
    try {
      const remaining = currentAssets.filter((sa) => sa.id !== removeId);
      const reindexed: SpawnAsset[] = remaining.map((sa, idx) => ({
        ...sa,
        order: idx,
      }));
      setDraftAssets(reindexed);
    } catch (e) {
      setRemoveError(
        e instanceof Error ? e.message : "Failed to remove asset from spawn",
      );
    }
  };

  const handleSaveAssets = async () => {
    if (!selectedSpawnId || !draftAssets) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await SpawnService.updateSpawn(selectedSpawnId, {
        assets: draftAssets,
      });
      if (!result.success) {
        setSaveError(result.error || "Failed to save asset changes");
        toast.error(result.error || "Failed to save asset changes");
        return;
      }
      // Clear draft and reload
      setDraftAssets(null);
      setSpawn(result.spawn || null);
      toast.success("Asset changes saved");
      if (result.spawn) {
        dispatchMediaSpawnerEvent(MediaSpawnerEvents.SPAWN_UPDATED, {
          spawnId: result.spawn.id,
          updatedSpawn: result.spawn,
        });
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to save asset changes";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAssets = () => {
    setDraftAssets(null);
    setSaveError(null);
    setRemoveError(null);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = (index: number) => {
    setDragOverIndex((cur) => (cur === index ? null : cur));
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndexStr = e.dataTransfer.getData("text/plain");
    const fromIndex = Number(fromIndexStr);
    setDraggingId(null);
    setDragOverIndex(null);
    if (!Number.isNaN(fromIndex)) {
      handleReorder(fromIndex, toIndex);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverIndex(null);
  };

  const renderEmptyState = () => {
    if (!selectedSpawnId) {
      return (
        <div className="h-full flex items-center justify-center text-[rgb(var(--color-muted-foreground))] text-sm">
          Select a spawn to see its assets
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[rgb(var(--color-accent))] mx-auto mb-2" />
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              Loading assets…
            </p>
          </div>
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="h-full flex items-center justify-center text-[rgb(var(--color-error))] text-sm">
          {loadError}
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center text-[rgb(var(--color-muted-foreground))] text-sm">
        No assets assigned to this spawn
      </div>
    );
  };

  const renderChangesSummary = () => {
    const added = changesDiff?.added.length ?? 0;
    const removed = changesDiff?.removed.length ?? 0;
    const reordered = changesDiff?.reordered.length ?? 0;
    const parts: string[] = [];
    if (added > 0) parts.push(`+${added}`);
    if (removed > 0) parts.push(`-${removed}`);
    if (reordered > 0 && added === 0 && removed === 0) parts.push("Reordered");
    return (
      <span className="text-[rgb(var(--color-warning))]">
        {parts.length > 0 ? parts.join(" / ") + " asset(s)" : "Changes pending"}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        className="flex-1 overflow-auto p-3 lg:p-4"
        role="region"
        aria-label="Assets in Current Spawn"
      >
        {removeError && (
          <div
            className="mb-2 text-xs text-[rgb(var(--color-error))]"
            role="alert"
          >
            {removeError}
          </div>
        )}
        {!spawn || spawn.assets.length === 0 || resolvedAssets.length === 0 ? (
          renderEmptyState()
        ) : (
          <ul role="list" className="space-y-2">
            {resolvedAssets.map(({ baseAsset, spawnAsset }, index) => (
              <SpawnAssetItem
                key={spawnAsset.id}
                spawnAsset={spawnAsset}
                baseAsset={baseAsset}
                index={index}
                spawn={spawn}
                totalCount={resolvedAssets.length}
                isDragging={draggingId === spawnAsset.id}
                isDragOver={dragOverIndex === index && draggingId !== null}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onReorder={handleReorder}
                onRemove={performRemove}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Save/Cancel buttons and status indicator */}
      {hasAssetChanges && (
        <div className="flex-shrink-0 border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/5 p-3 lg:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
              {renderChangesSummary()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChanges((v) => !v)}
                aria-expanded={showChanges}
                aria-controls="pending-asset-changes"
              >
                {showChanges ? "Hide changes" : "View changes"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelAssets}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAssets}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          {showChanges && changesDiff && (
            <PendingChangesPanel
              diff={changesDiff}
              assetInfoById={assetInfoById}
            />
          )}
          {saveError && (
            <div
              className="mt-2 text-xs text-[rgb(var(--color-error))]"
              role="alert"
            >
              {saveError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
