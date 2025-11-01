import { describe, it, expect } from "vitest";
import { buildSpawnAssetsDiff } from "../spawnAssetsDiff";
import type { SpawnAsset } from "../../types/spawn";

const sa = (assetId: string, order: number): SpawnAsset => ({
  id: `${assetId}-sa`,
  assetId,
  overrides: {},
  enabled: true,
  order,
});

describe("buildSpawnAssetsDiff", () => {
  it("returns empty diffs when arrays are identical", () => {
    const saved = [sa("a1", 0), sa("a2", 1)];
    const draft = [sa("a1", 0), sa("a2", 1)];
    const diff = buildSpawnAssetsDiff(saved, draft);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.reordered).toHaveLength(0);
  });

  it("detects added items", () => {
    const saved = [sa("a1", 0)];
    const draft = [sa("a1", 0), sa("a2", 1)];
    const diff = buildSpawnAssetsDiff(saved, draft);
    expect(diff.added).toEqual([{ assetId: "a2", index: 1 }]);
    expect(diff.removed).toHaveLength(0);
    expect(diff.reordered).toHaveLength(0);
  });

  it("detects removed items", () => {
    const saved = [sa("a1", 0), sa("a2", 1)];
    const draft = [sa("a1", 0)];
    const diff = buildSpawnAssetsDiff(saved, draft);
    expect(diff.removed).toEqual([{ assetId: "a2", prevIndex: 1 }]);
    expect(diff.added).toHaveLength(0);
    expect(diff.reordered).toHaveLength(0);
  });

  it("detects reorders for items present in both", () => {
    const saved = [sa("a1", 0), sa("a2", 1), sa("a3", 2)];
    const draft = [sa("a3", 0), sa("a1", 1), sa("a2", 2)];
    const diff = buildSpawnAssetsDiff(saved, draft);
    // All three moved
    expect(diff.reordered).toEqual([
      { assetId: "a3", prevIndex: 2, nextIndex: 0 },
      { assetId: "a1", prevIndex: 0, nextIndex: 1 },
      { assetId: "a2", prevIndex: 1, nextIndex: 2 },
    ]);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it("handles mixed added, removed, and reordered", () => {
    const saved = [sa("a1", 0), sa("a2", 1), sa("a3", 2)];
    const draft = [sa("a1", 0), sa("a4", 1), sa("a3", 2)];
    const diff = buildSpawnAssetsDiff(saved, draft);
    expect(diff.added).toEqual([{ assetId: "a4", index: 1 }]);
    expect(diff.removed).toEqual([{ assetId: "a2", prevIndex: 1 }]);
    // a1 and a3 kept their relative positions (no reorder expected)
    expect(diff.reordered).toHaveLength(0);
  });
});
