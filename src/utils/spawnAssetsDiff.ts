import type { SpawnAsset } from "../types/spawn";

export type SpawnAssetsAddedItem = {
  assetId: string;
  index: number;
};

export type SpawnAssetsRemovedItem = {
  assetId: string;
  prevIndex: number;
};

export type SpawnAssetsReorderedItem = {
  assetId: string;
  prevIndex: number;
  nextIndex: number;
};

export type SpawnAssetsDiff = {
  added: SpawnAssetsAddedItem[];
  removed: SpawnAssetsRemovedItem[];
  reordered: SpawnAssetsReorderedItem[];
};

/**
 * Build a diff between saved and draft spawn.assets arrays.
 *
 * - added: present in draft but not in saved
 * - removed: present in saved but not in draft
 * - reordered: present in both but with a different index
 */
export function buildSpawnAssetsDiff(
  saved: ReadonlyArray<SpawnAsset>,
  draft: ReadonlyArray<SpawnAsset>,
): SpawnAssetsDiff {
  const savedIndexByAssetId: Record<string, number> = Object.create(null);
  const draftIndexByAssetId: Record<string, number> = Object.create(null);

  for (let i = 0; i < saved.length; i++) {
    const id = saved[i]?.assetId;
    if (id) savedIndexByAssetId[id] = i;
  }
  for (let i = 0; i < draft.length; i++) {
    const id = draft[i]?.assetId;
    if (id) draftIndexByAssetId[id] = i;
  }

  const added: SpawnAssetsAddedItem[] = [];
  const removed: SpawnAssetsRemovedItem[] = [];
  const reordered: SpawnAssetsReorderedItem[] = [];

  // Added: in draft but not in saved
  for (const [assetId, dIndex] of Object.entries(draftIndexByAssetId)) {
    if (!(assetId in savedIndexByAssetId)) {
      added.push({ assetId, index: dIndex });
    }
  }

  // Removed: in saved but not in draft
  for (const [assetId, sIndex] of Object.entries(savedIndexByAssetId)) {
    if (!(assetId in draftIndexByAssetId)) {
      removed.push({ assetId, prevIndex: sIndex });
    }
  }

  // Reordered: present in both with different indices
  for (const [assetId, sIndex] of Object.entries(savedIndexByAssetId)) {
    const dIndex = draftIndexByAssetId[assetId];
    if (typeof dIndex === "number" && dIndex !== sIndex) {
      reordered.push({ assetId, prevIndex: sIndex, nextIndex: dIndex });
    }
  }

  // Sort for stable display (optional but helpful):
  added.sort((a, b) => a.index - b.index);
  removed.sort((a, b) => a.prevIndex - b.prevIndex);
  reordered.sort((a, b) => a.nextIndex - b.nextIndex);

  return { added, removed, reordered };
}
