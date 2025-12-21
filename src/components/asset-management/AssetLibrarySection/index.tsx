import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePanelState } from "../../../hooks/useLayout";
import { SpawnService } from "../../../services/spawnService";
import { AssetService } from "../../../services/assetService";
import type { MediaAsset } from "../../../types/media";
import {
  detectAssetTypeFromPath,
  getSupportedExtensions,
} from "../../../utils/assetTypeDetection";
import { validateUrlFormat } from "../../../utils/assetValidation";
import { toast } from "sonner";
import {
  dispatchMediaSpawnerEvent,
  MediaSpawnerEvents,
  useMediaSpawnerEvent,
} from "../../../hooks/useMediaSpawnerEvent";
import { AddAssetControls } from "./AddAssetControls";
import { AssetLibraryItem } from "./AssetLibraryItem";

/**
 * Section displaying the global asset library with search, filtering, and add functionality.
 */
export function AssetLibrarySection() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddingUrl, setIsAddingUrl] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>("");
  const [addError, setAddError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { selectedSpawnId } = usePanelState();
  const [spawnAssetIds, setSpawnAssetIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [renamingAssetId, setRenamingAssetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => {
    setAssets(AssetService.getAssets());
  }, []);

  useMediaSpawnerEvent(MediaSpawnerEvents.ASSETS_UPDATED, () => {
    setAssets(AssetService.getAssets());
  });

  // Track which assets are already in the selected spawn
  useEffect(() => {
    const loadSpawnAssets = async () => {
      if (!selectedSpawnId) {
        setSpawnAssetIds(new Set());
        return;
      }
      const spawn = await SpawnService.getSpawn(selectedSpawnId);
      const ids = new Set((spawn?.assets ?? []).map((sa) => sa.assetId));
      setSpawnAssetIds(ids);
    };
    void loadSpawnAssets();
  }, [selectedSpawnId]);

  useMediaSpawnerEvent(
    MediaSpawnerEvents.SPAWN_UPDATED,
    (event) => {
      const detail = event.detail;
      if (detail.spawnId === selectedSpawnId) {
        const loadSpawnAssets = async () => {
          const spawn = await SpawnService.getSpawn(selectedSpawnId);
          if (spawn) {
            const ids = new Set((spawn?.assets ?? []).map((sa) => sa.assetId));
            setSpawnAssetIds(ids);
          }
        };
        void loadSpawnAssets();
      }
    },
    [selectedSpawnId],
  );

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
      dispatchMediaSpawnerEvent(MediaSpawnerEvents.ASSETS_UPDATED, {});
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add URL asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportedAccept = useMemo(() => {
    const all = getSupportedExtensions();
    return all.map((ext) => `.${ext}`).join(",");
  }, []);

  // Build Combobox suggestions
  const searchOptions = useMemo(() => {
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

  const filteredAssets = useMemo(() => {
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
      const ext = filename.split(".").pop()?.toLowerCase();
      if (!ext || !getSupportedExtensions().includes(ext)) {
        errors.push(`${filename}: unsupported file type`);
        continue;
      }
      const name = filename;
      AssetService.addAsset(type, name, filename);
    }
    setAssets(AssetService.getAssets());
    dispatchMediaSpawnerEvent(MediaSpawnerEvents.ASSETS_UPDATED, {});
    if (errors.length > 0) {
      setFilesError(
        `${errors.length} file(s) skipped: ${errors.slice(0, 3).join("; ")}${
          errors.length > 3 ? "…" : ""
        }`,
      );
    } else {
      setFilesError(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddToSpawn = (asset: MediaAsset) => {
    if (!selectedSpawnId) return;
    dispatchMediaSpawnerEvent(MediaSpawnerEvents.REQUEST_ADD_ASSET_TO_SPAWN, {
      assetId: asset.id,
      assetName: asset.name,
    });
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredAssets.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min(filteredAssets.length - 1, (i < 0 ? -1 : i) + 1);
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
        handleAddToSpawn(asset);
      }
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <AddAssetControls
        searchQuery={searchQuery}
        searchOptions={searchOptions}
        isAddingUrl={isAddingUrl}
        urlInput={urlInput}
        addError={addError}
        filesError={filesError}
        isSubmitting={isSubmitting}
        supportedAccept={supportedAccept}
        fileInputRef={fileInputRef}
        onSearchChange={setSearchQuery}
        onSearchSelect={setSearchQuery}
        onAddFilesClick={() => fileInputRef.current?.click()}
        onOpenUrlForm={() => {
          setAddError(null);
          setUrlInput("");
          setIsAddingUrl(true);
        }}
        onUrlChange={setUrlInput}
        onAddUrl={handleAddUrl}
        onCancelUrl={() => {
          setIsAddingUrl(false);
          setAddError(null);
          setUrlInput("");
        }}
        onFilesSelected={handleFilesSelected}
      />
      <div
        className="flex-1 overflow-auto p-3 lg:p-4"
        role="region"
        aria-label="Asset Library"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {assets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[rgb(var(--color-muted-foreground))] text-sm">
            No assets in library
          </div>
        ) : (
          <ul ref={listRef} role="list" className="space-y-2">
            {filteredAssets.map((asset, idx) => (
              <AssetLibraryItem
                key={asset.id}
                asset={asset}
                index={idx}
                isActive={activeIndex === idx}
                isInSpawn={!!selectedSpawnId && spawnAssetIds.has(asset.id)}
                canAddToSpawn={!!selectedSpawnId}
                isRenaming={renamingAssetId === asset.id}
                renameValue={renameValue}
                renameError={renameError}
                onAdd={handleAddToSpawn}
                onRenameStart={startRename}
                onRenameChange={(val) => {
                  setRenameValue(val);
                  if (renameError) setRenameError(null);
                }}
                onRenameCommit={commitRename}
                onRenameCancel={cancelRename}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
