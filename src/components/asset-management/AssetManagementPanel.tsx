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
import { Button } from "../ui/Button";
import {
  buildSpawnAssetsDiff,
  type SpawnAssetsDiff,
} from "../../utils/spawnAssetsDiff";
import { HUICombobox } from "../common";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { Disclosure } from "@headlessui/react";
import {
  GripVertical,
  Settings,
  MoreVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Shuffle,
} from "lucide-react";

/**
 * AssetManagementPanel renders the right-panel structure for Epic 4 (MS-32):
 * two vertically-stacked sections with clear separation that adapt to height.
 * Data wiring and interactivity are intentionally deferred to later stories.
 */

type ResolvedSpawnAsset = {
  spawnAsset: SpawnAsset;
  baseAsset: MediaAsset;
};

function SpawnAssetsCount() {
  const { selectedSpawnId } = usePanelState();
  const [savedCount, setSavedCount] = useState<number>(0);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!selectedSpawnId) {
        if (active) setSavedCount(0);
        return;
      }
      const s = await SpawnService.getSpawn(selectedSpawnId);
      if (active) setSavedCount(s?.assets.length ?? 0);
    };
    void load();
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | { spawnId?: string }
        | undefined;
      if (detail?.spawnId === selectedSpawnId) void load();
    };
    window.addEventListener(
      "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
      handler as EventListener,
    );
    return () => {
      active = false;
      window.removeEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        handler as EventListener,
      );
    };
  }, [selectedSpawnId]);

  // Listen for draft count changes
  useEffect(() => {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | { spawnId?: string; count: number; isDraft: boolean }
        | undefined;
      if (detail && detail.spawnId === selectedSpawnId) {
        setDraftCount(detail.isDraft ? detail.count : null);
      }
    };
    window.addEventListener(
      "mediaspawner:draft-asset-count-changed" as unknown as keyof WindowEventMap,
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:draft-asset-count-changed" as unknown as keyof WindowEventMap,
        handler as EventListener,
      );
    };
  }, [selectedSpawnId]);

  const displayCount = draftCount !== null ? draftCount : savedCount;

  return (
    <span className="ml-2 text-[rgb(var(--color-muted-foreground))]">
      ({displayCount})
    </span>
  );
}

function AssetLibraryCount() {
  const [count, setCount] = useState<number>(AssetService.getAssets().length);
  useEffect(() => {
    const handler = () => setCount(AssetService.getAssets().length);
    window.addEventListener(
      "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
        handler as EventListener,
      );
    };
  }, []);
  return (
    <span className="ml-2 text-[rgb(var(--color-muted-foreground))]">
      ({count})
    </span>
  );
}

function ThumbnailWithPreview({ asset }: { asset: MediaAsset }) {
  const [open, setOpen] = useState(false);
  if (!asset.isUrl) {
    return (
      <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded">
        <MediaPreview
          asset={asset}
          className="h-full"
          fit="contain"
          size="small"
        />
      </div>
    );
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div
          className="w-10 h-10 flex-shrink-0 overflow-hidden rounded"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <MediaPreview
            asset={asset}
            className="h-full"
            fit="contain"
            size="small"
          />
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          className="z-10 w-72 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] shadow-md p-2"
        >
          <div className="w-full h-40 overflow-hidden rounded mb-2">
            <MediaPreview
              asset={asset}
              className="h-full"
              fit="contain"
              size="small"
            />
          </div>
          <div className="text-xs text-[rgb(var(--color-fg))] space-y-1">
            <div>
              <span className="text-[rgb(var(--color-muted-foreground))]">
                Name:
              </span>{" "}
              {asset.name}
            </div>
            <div>
              <span className="text-[rgb(var(--color-muted-foreground))]">
                Type:
              </span>{" "}
              {asset.type}
            </div>
            <div className="truncate" title={asset.path}>
              <span className="text-[rgb(var(--color-muted-foreground))]">
                Path:
              </span>{" "}
              {asset.path}
            </div>
          </div>
          <Popover.Arrow className="fill-[rgb(var(--color-bg))]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SpawnAssetsSection() {
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
    let isActive = true;
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
        if (isActive) {
          setSpawn(s);
          setDraftAssets(null); // Clear draft when loading new spawn
        }
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
      onSpawnUpdated as EventListener,
    );

    return () => {
      isActive = false;
      window.removeEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        onSpawnUpdated as EventListener,
      );
    };
  }, [selectedSpawnId]);

  // Listen for profile changes to reset spawn-related state
  useEffect(() => {
    const handleProfileChanged = (e: Event) => {
      const ce = e as CustomEvent<{
        profileId?: string;
        previousProfileId?: string;
      }>;
      const { profileId } = ce.detail || {};
      if (profileId) {
        // Reset spawn-related state when profile changes
        setSpawn(null);
        setLoadError(null);
        setIsLoading(false);
        setDraggingId(null);
        setDragOverIndex(null);
        setRemoveError(null);
        setDraftAssets(null);
        setSaveError(null);
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

  // Listen for requests to add assets to spawn
  useEffect(() => {
    const handleAddAssetRequest = (e: Event) => {
      const ce = e as CustomEvent<{ assetId: string; assetName: string }>;
      const { assetId, assetName } = ce.detail || {};
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
    };

    window.addEventListener(
      "mediaspawner:request-add-asset-to-spawn" as unknown as keyof WindowEventMap,
      handleAddAssetRequest as EventListener,
    );

    return () => {
      window.removeEventListener(
        "mediaspawner:request-add-asset-to-spawn" as unknown as keyof WindowEventMap,
        handleAddAssetRequest as EventListener,
      );
    };
  }, [spawn, draftAssets]);

  // Listen for asset library updates to refresh resolved assets
  useEffect(() => {
    // Initial load
    setAssets(AssetService.getAssets());

    // Listen for external updates to refresh assets
    const handler = () => setAssets(AssetService.getAssets());
    window.addEventListener(
      "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
        handler as EventListener,
      );
    };
  }, []);

  // Use draft assets if available, otherwise use spawn assets
  const currentAssets = useMemo(() => {
    return draftAssets ?? spawn?.assets ?? [];
  }, [draftAssets, spawn?.assets]);

  // Emit draft count for header display
  useEffect(() => {
    const count = currentAssets.length;
    const isDraft = draftAssets !== null;
    window.dispatchEvent(
      new CustomEvent("mediaspawner:draft-asset-count-changed", {
        detail: { spawnId: selectedSpawnId, count, isDraft },
      }),
    );
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

  const getTypeIcon = (type: MediaAsset["type"]) =>
    type === "image" ? "🖼️" : type === "video" ? "🎥" : "🎵";

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
      window.dispatchEvent(
        new CustomEvent(
          "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
          { detail: { spawnId: selectedSpawnId } } as CustomEventInit,
        ),
      );
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
              <li
                role="listitem"
                key={spawnAsset.id}
                className={`border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-bg))] p-2 focus-within:ring-2 focus-within:ring-[rgb(var(--color-ring))] ${
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
                    className="w-4 text-[rgb(var(--color-muted))] cursor-grab select-none"
                    title="Drag to reorder"
                    aria-hidden
                  >
                    <GripVertical size={16} />
                  </div>
                  <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded">
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <div className="w-16 h-16 overflow-hidden rounded">
                          <MediaPreview
                            asset={baseAsset}
                            className="h-full"
                            fit="contain"
                          />
                        </div>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content
                          sideOffset={6}
                          className="z-10 w-72 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] shadow-md p-2"
                        >
                          <div className="w-full h-40 overflow-hidden rounded mb-2">
                            <MediaPreview
                              asset={baseAsset}
                              className="h-full"
                              fit="contain"
                            />
                          </div>
                          <div className="text-xs text-[rgb(var(--color-fg))] space-y-1">
                            <div>
                              <span className="text-[rgb(var(--color-muted-foreground))]">
                                Name:
                              </span>{" "}
                              {baseAsset.name}
                            </div>
                            <div>
                              <span className="text-[rgb(var(--color-muted-foreground))]">
                                Type:
                              </span>{" "}
                              {baseAsset.type}
                            </div>
                            <div className="truncate" title={baseAsset.path}>
                              <span className="text-[rgb(var(--color-muted-foreground))]">
                                Path:
                              </span>{" "}
                              {baseAsset.path}
                            </div>
                          </div>
                          <Popover.Arrow className="fill-[rgb(var(--color-bg))]" />
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium text-[rgb(var(--color-fg))] truncate"
                      title={baseAsset.name}
                    >
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <span className="truncate inline-block max-w-full align-middle">
                            {baseAsset.name}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            sideOffset={6}
                            className="z-10 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-xs text-[rgb(var(--color-fg))] shadow-md"
                          >
                            {baseAsset.name}
                            <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </div>
                    <div className="text-xs text-[rgb(var(--color-muted-foreground))] flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 capitalize bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))] px-1.5 py-0.5 rounded">
                        <span>{getTypeIcon(baseAsset.type)}</span>
                        <span>{baseAsset.type}</span>
                      </span>
                      {spawn?.randomizationBuckets?.length
                        ? (() => {
                            const bucket = (
                              spawn.randomizationBuckets || []
                            ).find((b) =>
                              b.members.some(
                                (m) => m.spawnAssetId === spawnAsset.id,
                              ),
                            );
                            return bucket ? (
                              <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                  <span
                                    className="inline-flex items-center justify-center bg-[rgb(var(--color-accent))]/10 text-[rgb(var(--color-accent))] w-6 h-6 rounded border border-[rgb(var(--color-accent))]"
                                    aria-label={`Bucket: ${bucket.name}`}
                                  >
                                    <Shuffle size={14} />
                                  </span>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    sideOffset={6}
                                    className="z-10 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-xs text-[rgb(var(--color-fg))] shadow-md"
                                  >
                                    Bucket: {bucket.name}
                                    <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            ) : null;
                          })()
                        : null}
                      {!spawnAsset.enabled && (
                        <span className="inline-flex items-center gap-1 bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))] px-1.5 py-0.5 rounded text-[11px]">
                          Disabled
                        </span>
                      )}
                      <span className="text-[rgb(var(--color-muted))]">•</span>
                      <span className="text-[rgb(var(--color-muted-foreground))]">
                        Order: {spawnAsset.order}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center text-xs rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 w-7 h-7"
                      onClick={() => {
                        const detail = {
                          mode: "asset-settings",
                          spawnAssetId: spawnAsset.id,
                        } as const;
                        window.dispatchEvent(
                          new CustomEvent(
                            "mediaspawner:request-center-switch" as unknown as keyof WindowEventMap,
                            { detail } as CustomEventInit,
                          ),
                        );
                      }}
                      aria-label="Configure"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove from Spawn"
                      className="inline-flex items-center justify-center text-xs rounded border border-[rgb(var(--color-error))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-error))] hover:bg-[rgb(var(--color-error-bg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 w-7 h-7"
                      onClick={() => {
                        void performRemove(spawnAsset.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
                          aria-label="More actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          sideOffset={6}
                          className="z-10 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] shadow-md p-1 text-sm"
                        >
                          <DropdownMenu.Item
                            className="px-3 py-2 rounded data-[highlighted]:bg-[rgb(var(--color-muted))]/5 outline-none cursor-pointer"
                            onSelect={() => {
                              const toIndex = Math.max(0, index - 1);
                              if (toIndex !== index)
                                void handleReorder(index, toIndex);
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              <ChevronUp size={14} /> Move up
                            </span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="px-3 py-2 rounded data-[highlighted]:bg-[rgb(var(--color-muted))]/5 outline-none cursor-pointer"
                            onSelect={() => {
                              const toIndex = Math.min(
                                resolvedAssets.length - 1,
                                index + 1,
                              );
                              if (toIndex !== index)
                                void handleReorder(index, toIndex);
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              <ChevronDown size={14} /> Move down
                            </span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="my-1 h-px bg-[rgb(var(--color-border))]" />
                          <DropdownMenu.Item
                            className="px-3 py-2 rounded text-[rgb(var(--color-error))] data-[highlighted]:bg-[rgb(var(--color-error-bg))] outline-none cursor-pointer"
                            onSelect={() => {
                              void performRemove(spawnAsset.id);
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Trash2 size={14} /> Remove
                            </span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Arrow className="fill-[rgb(var(--color-bg))]" />
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </div>
                {dragOverIndex === index && draggingId !== null && (
                  <div
                    className="mt-2 h-0.5 bg-[rgb(var(--color-accent))] rounded"
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Save/Cancel buttons and status indicator */}
      {hasAssetChanges && (
        <div className="flex-shrink-0 border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/5 p-3 lg:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
              {(() => {
                const added = changesDiff?.added.length ?? 0;
                const removed = changesDiff?.removed.length ?? 0;
                const reordered = changesDiff?.reordered.length ?? 0;
                const parts: string[] = [];
                if (added > 0) parts.push(`+${added}`);
                if (removed > 0) parts.push(`-${removed}`);
                if (reordered > 0 && added === 0 && removed === 0)
                  parts.push("Reordered");
                return (
                  <span className="text-[rgb(var(--color-warning))]">
                    {parts.length > 0
                      ? parts.join(" / ") + " asset(s)"
                      : "Changes pending"}
                  </span>
                );
              })()}
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
            <div
              id="pending-asset-changes"
              role="region"
              aria-labelledby="pending-asset-changes-heading"
              className="mt-3 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-bg))] p-2"
            >
              <div
                id="pending-asset-changes-heading"
                className="text-xs font-medium text-[rgb(var(--color-fg))] mb-2"
              >
                Pending changes
              </div>
              <div className="space-y-2">
                {changesDiff.added.length > 0 && (
                  <div>
                    <div className="text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                      Added ({changesDiff.added.length})
                    </div>
                    <ul role="list" className="space-y-1">
                      {changesDiff.added.map((it) => {
                        const a = assetInfoById.get(it.assetId);
                        return (
                          <li
                            role="listitem"
                            key={`add-${it.assetId}`}
                            className="text-xs text-[rgb(var(--color-fg))] flex items-center gap-2"
                          >
                            <span className="inline-flex items-center gap-1 capitalize bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))] px-1.5 py-0.5 rounded">
                              <span>
                                {a
                                  ? a.type === "image"
                                    ? "🖼️"
                                    : a.type === "video"
                                      ? "🎥"
                                      : "🎵"
                                  : ""}
                              </span>
                              <span>{a?.type ?? "asset"}</span>
                            </span>
                            <span className="truncate" title={a?.name}>
                              {a?.name ?? it.assetId}
                            </span>
                            <span className="text-[rgb(var(--color-muted))]">
                              •
                            </span>
                            <span className="text-[rgb(var(--color-muted-foreground))]">
                              #{it.index}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {changesDiff.removed.length > 0 && (
                  <div>
                    <div className="text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                      Removed ({changesDiff.removed.length})
                    </div>
                    <ul role="list" className="space-y-1">
                      {changesDiff.removed.map((it) => {
                        const a = assetInfoById.get(it.assetId);
                        return (
                          <li
                            role="listitem"
                            key={`rem-${it.assetId}`}
                            className="text-xs text-[rgb(var(--color-fg))] flex items-center gap-2"
                          >
                            <span className="inline-flex items-center gap-1 capitalize bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))] px-1.5 py-0.5 rounded">
                              <span>
                                {a
                                  ? a.type === "image"
                                    ? "🖼️"
                                    : a.type === "video"
                                      ? "🎥"
                                      : "🎵"
                                  : ""}
                              </span>
                              <span>{a?.type ?? "asset"}</span>
                            </span>
                            <span className="truncate" title={a?.name}>
                              {a?.name ?? it.assetId}
                            </span>
                            <span className="text-[rgb(var(--color-muted))]">
                              •
                            </span>
                            <span className="text-[rgb(var(--color-muted-foreground))]">
                              was #{it.prevIndex}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {changesDiff.reordered.length > 0 && (
                  <div>
                    <div className="text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                      Reordered ({changesDiff.reordered.length})
                    </div>
                    <ul role="list" className="space-y-1">
                      {changesDiff.reordered.map((it) => {
                        const a = assetInfoById.get(it.assetId);
                        return (
                          <li
                            role="listitem"
                            key={`re-${it.assetId}`}
                            className="text-xs text-[rgb(var(--color-fg))] flex items-center gap-2"
                          >
                            <span className="truncate" title={a?.name}>
                              {a?.name ?? it.assetId}
                            </span>
                            <span className="text-[rgb(var(--color-muted))]">
                              •
                            </span>
                            <span className="text-[rgb(var(--color-muted-foreground))]">
                              #{it.prevIndex} → #{it.nextIndex}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {changesDiff.added.length === 0 &&
                  changesDiff.removed.length === 0 &&
                  changesDiff.reordered.length === 0 && (
                    <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                      No changes
                    </div>
                  )}
              </div>
            </div>
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

function AssetLibrarySection() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddingUrl, setIsAddingUrl] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>("");
  const [addError, setAddError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { selectedSpawnId } = usePanelState();
  const [spawnAssetIds, setSpawnAssetIds] = useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [renamingAssetId, setRenamingAssetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => {
    // Initial load
    setAssets(AssetService.getAssets());

    // Listen for external updates to refresh list
    const handler = () => setAssets(AssetService.getAssets());
    window.addEventListener(
      "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
        handler as EventListener,
      );
    };
  }, []);

  // Track which assets are already in the selected spawn
  useEffect(() => {
    let isActive = true;
    const loadSpawnAssets = async () => {
      if (!selectedSpawnId) {
        if (isActive) setSpawnAssetIds(new Set());
        return;
      }
      const spawn = await SpawnService.getSpawn(selectedSpawnId);
      if (isActive) {
        const ids = new Set((spawn?.assets ?? []).map((sa) => sa.assetId));
        setSpawnAssetIds(ids);
      }
    };
    void loadSpawnAssets();

    const onSpawnUpdated = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as
        | { spawnId?: string }
        | undefined;
      if (!detail || !detail.spawnId) return;
      if (detail.spawnId === selectedSpawnId) {
        void loadSpawnAssets();
      }
    };
    window.addEventListener(
      "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
      onSpawnUpdated as EventListener,
    );
    return () => {
      isActive = false;
      window.removeEventListener(
        "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
        onSpawnUpdated as EventListener,
      );
    };
  }, [selectedSpawnId]);

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
          "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
        ),
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

  // Build Combobox suggestions: type:* and ext:* tokens, plus a sample of asset names
  const searchOptions = React.useMemo(() => {
    const nameSet = new Set<string>();
    assets.forEach((a) => {
      const n = a.name.trim();
      if (n) nameSet.add(n);
    });
    return Array.from(nameSet)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 50)
      .map((n) => ({ value: n }));
  }, [assets]);

  const filteredAssets = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assets;
    const tokens = q.split(/\s+/);
    return assets.filter((a) =>
      tokens.every((t) => {
        if (t.startsWith("type:")) {
          const want = t.slice(5);
          return a.type.toLowerCase() === want;
        }
        if (t.startsWith("ext:")) {
          const want = t.slice(4);
          const ext = a.path.split(".").pop()?.toLowerCase();
          return ext === want;
        }
        const hay = `${a.name} ${a.path}`.toLowerCase();
        return hay.includes(t);
      }),
    );
  }, [assets, searchQuery]);

  useEffect(() => {
    if (activeIndex >= filteredAssets.length) {
      setActiveIndex(
        filteredAssets.length > 0 ? filteredAssets.length - 1 : -1,
      );
    }
  }, [filteredAssets, activeIndex]);

  const focusRow = (index: number) => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-asset-index="${index}"]`,
    );
    el?.focus();
  };

  const handleFilesSelected: React.ChangeEventHandler<HTMLInputElement> = (
    e,
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
        "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
      ),
    );
    // Compose error summary
    if (errors.length > 0) {
      setFilesError(
        `${errors.length} file(s) skipped: ${errors.slice(0, 3).join("; ")}${
          errors.length > 3 ? "…" : ""
        }`,
      );
    } else {
      setFilesError(null);
    }
    // Reset input so the same files can be reselected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddToSpawn = (asset: MediaAsset) => {
    if (!selectedSpawnId) return;
    // Dispatch event for SpawnAssetsSection to handle
    window.dispatchEvent(
      new CustomEvent(
        "mediaspawner:request-add-asset-to-spawn" as unknown as keyof WindowEventMap,
        {
          detail: { assetId: asset.id, assetName: asset.name },
        } as CustomEventInit,
      ),
    );
  };

  const startRename = (asset: MediaAsset) => {
    setRenamingAssetId(asset.id);
    setRenameValue(asset.name);
    setRenameError(null);
  };

  const cancelRename = () => {
    setRenamingAssetId(null);
    setRenameValue("");
    setRenameError(null);
  };

  const commitRename = (asset: MediaAsset) => {
    const next = renameValue.trim();
    if (next.length === 0) {
      setRenameError("Name is required");
      return;
    }
    if (!AssetService.isNameAvailable(next, asset.id)) {
      setRenameError("Name must be unique");
      return;
    }
    const ok = AssetService.updateAsset({ ...asset, name: next });
    if (ok) {
      toast.success(`Renamed to "${next}"`);
      cancelRename();
      setAssets(AssetService.getAssets());
    } else {
      toast.error("Failed to rename asset");
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 lg:px-4 lg:py-3 bg-[rgb(var(--color-muted))]/5 border-b border-[rgb(var(--color-border))]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add local assets"
            >
              Add Asset
            </button>
            {!isAddingUrl && (
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5"
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
          <div className="flex-1" />
        </div>
        <div className="mt-2">
          <HUICombobox
            value={searchQuery}
            onChange={(v) => setSearchQuery(v)}
            onSelect={(v) => setSearchQuery(v)}
            options={searchOptions}
            placeholder="Search assets..."
          />
        </div>
        {addError && (
          <div
            className="mt-2 text-xs text-[rgb(var(--color-error))]"
            role="alert"
          >
            {addError}
          </div>
        )}
        {filesError && (
          <div
            className="mt-2 text-xs text-[rgb(var(--color-warning))]"
            role="alert"
          >
            {filesError}
          </div>
        )}
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
        <div className="flex-shrink-0 px-3 lg:px-4 py-2 bg-[rgb(var(--color-muted))]/5 border-b border-[rgb(var(--color-border))]">
          <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/media.png"
              className="flex-1 min-w-0 sm:w-96 max-w-full px-2 py-1 border border-[rgb(var(--color-border))] rounded text-sm"
              aria-label="Asset URL"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`text-xs px-2 py-1 rounded text-[rgb(var(--color-accent-foreground))] ${
                  isSubmitting
                    ? "bg-[rgb(var(--color-accent))]/50 cursor-not-allowed"
                    : "bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent-hover))]"
                }`}
                onClick={handleAddUrl}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5"
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
        onKeyDown={(e) => {
          if (filteredAssets.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => {
              const next = Math.min(
                filteredAssets.length - 1,
                (i < 0 ? -1 : i) + 1,
              );
              window.requestAnimationFrame(() => focusRow(next));
              return next;
            });
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => {
              const next = Math.max(0, (i < 0 ? 0 : i) - 1);
              window.requestAnimationFrame(() => focusRow(next));
              return next;
            });
          } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            const asset = filteredAssets[activeIndex];
            if (asset && selectedSpawnId && !spawnAssetIds.has(asset.id)) {
              void handleAddToSpawn(asset);
            }
          }
        }}
        tabIndex={0}
      >
        {assets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[rgb(var(--color-muted-foreground))] text-sm">
            No assets in library
          </div>
        ) : (
          <ul ref={listRef} role="list" className="space-y-2">
            {filteredAssets.map((asset, idx) => (
              <li
                role="listitem"
                key={asset.id}
                className={`border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-bg))] p-1.5 outline-none ${
                  activeIndex === idx
                    ? "ring-2 ring-[rgb(var(--color-ring))]"
                    : ""
                }`}
                data-asset-index={idx}
                tabIndex={-1}
              >
                <div className="flex items-center gap-2">
                  <ThumbnailWithPreview asset={asset} />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium text-[rgb(var(--color-fg))] truncate"
                      title={asset.name}
                    >
                      {renamingAssetId === asset.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            aria-label="Rename asset"
                            value={renameValue}
                            onChange={(e) => {
                              setRenameValue(e.target.value);
                              if (renameError) setRenameError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                commitRename(asset);
                              } else if (e.key === "Escape") {
                                cancelRename();
                              }
                            }}
                            onBlur={() => cancelRename()}
                            className="w-full px-2 py-1 border border-[rgb(var(--color-border))] rounded text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
                          />
                          {renameError && (
                            <div
                              className="text-xs text-[rgb(var(--color-error))]"
                              role="alert"
                            >
                              {renameError}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <span
                              className="truncate inline-block max-w-full align-middle"
                              onDoubleClick={() => startRename(asset)}
                            >
                              {asset.name}
                            </span>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              sideOffset={6}
                              className="z-10 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-xs text-[rgb(var(--color-fg))] shadow-md"
                            >
                              {asset.name}
                              <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      )}
                    </div>
                    <div className="text-xs text-[rgb(var(--color-muted-foreground))] flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 capitalize bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))] px-1.5 py-0.5 rounded">
                        <span>{getTypeIcon(asset.type)}</span>
                        <span>{asset.type}</span>
                      </span>
                      <span className="text-[rgb(var(--color-muted))]">•</span>
                      <span
                        className="text-[rgb(var(--color-muted-foreground))]"
                        title={asset.isUrl ? "URL asset" : "Local file"}
                      >
                        {asset.isUrl ? "🌐" : "📁"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedSpawnId && spawnAssetIds.has(asset.id) ? (
                      <span
                        className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-muted-foreground))] cursor-default"
                        aria-label="Already in spawn"
                      >
                        Added ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={`p-1.5 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] ${
                          !selectedSpawnId
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[rgb(var(--color-muted))]/5"
                        }`}
                        aria-label="Add to Spawn"
                        onClick={() => handleAddToSpawn(asset)}
                        disabled={!selectedSpawnId}
                      >
                        +
                      </button>
                    )}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
                          aria-label="More actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          sideOffset={6}
                          className="z-10 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] shadow-md p-1 text-sm"
                        >
                          <DropdownMenu.Item
                            className="px-3 py-2 rounded data-[highlighted]:bg-[rgb(var(--color-muted))]/5 outline-none cursor-pointer"
                            onSelect={() => startRename(asset)}
                          >
                            Rename
                          </DropdownMenu.Item>
                          <DropdownMenu.Arrow className="fill-[rgb(var(--color-bg))]" />
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
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

  const [spawnOpen, setSpawnOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("ms_disclosure_spawn_assets");
      return v ? v === "1" : true;
    } catch {
      return true;
    }
  });
  const [libraryOpen, setLibraryOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("ms_disclosure_asset_library");
      return v ? v === "1" : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ms_disclosure_spawn_assets", spawnOpen ? "1" : "0");
    } catch (e) {
      void e;
    }
  }, [spawnOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "ms_disclosure_asset_library",
        libraryOpen ? "1" : "0",
      );
    } catch (e) {
      void e;
    }
  }, [libraryOpen]);

  return (
    <div className="h-full flex flex-col">
      <Disclosure as="section" defaultOpen={spawnOpen}>
        {({ open }) => (
          <div className="flex-shrink-0 flex flex-col overflow-hidden border-b border-[rgb(var(--color-border))]">
            <Disclosure.Button
              onClick={() => setSpawnOpen(!open)}
              className="flex items-center justify-between w-full px-3 py-2 lg:px-4 lg:py-3 bg-[rgb(var(--color-muted))]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))]"
              aria-label="Toggle Assets in Current Spawn"
            >
              <div className="text-sm lg:text-base font-semibold text-[rgb(var(--color-fg))] flex items-center">
                <span>Assets in Current Spawn</span>
                <SpawnAssetsCount />
              </div>
              <span
                className="text-[rgb(var(--color-muted-foreground))]"
                aria-hidden
              >
                {open ? "−" : "+"}
              </span>
            </Disclosure.Button>
            <Disclosure.Panel className="min-h-[80px]">
              <div className="min-h-0">
                <SpawnAssetsSection />
              </div>
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>

      <Disclosure as="section" defaultOpen={libraryOpen}>
        {({ open }) => (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <Disclosure.Button
              onClick={() => setLibraryOpen(!open)}
              className="flex items-center justify-between w-full px-3 py-2 lg:px-4 lg:py-3 bg-[rgb(var(--color-muted))]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))]"
              aria-label="Toggle Asset Library"
            >
              <div className="text-sm lg:text-base font-semibold text-[rgb(var(--color-fg))] flex items-center">
                <span id={bottomHeaderId}>Asset Library</span>
                <AssetLibraryCount />
              </div>
              <span
                className="text-[rgb(var(--color-muted-foreground))]"
                aria-hidden
              >
                {open ? "−" : "+"}
              </span>
            </Disclosure.Button>
            <Disclosure.Panel className="flex-1 min-h-0">
              <div className="h-full">
                <AssetLibrarySection />
              </div>
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>
    </div>
  );
};

export default AssetManagementPanel;
