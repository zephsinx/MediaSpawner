import { describe, it, expect } from "vitest";
import { createSpawn, createSpawnAsset } from "../../types/spawn";
import type { Spawn } from "../../types/spawn";
import {
  validateRandomizationBuckets,
  reconcileBucketsWithAssets,
} from "../randomizationBuckets";

describe("randomization buckets validation", () => {
  it("accepts a valid single-pick bucket with existing member", () => {
    const sa1 = createSpawnAsset("asset-1", 0);
    const spawn = createSpawn("Test", undefined, [sa1]);
    const candidate: Spawn = {
      ...spawn,
      randomizationBuckets: [
        {
          id: "b1",
          name: "Audio",
          selection: "one",
          members: [{ spawnAssetId: sa1.id }],
        },
      ],
    };
    const result = validateRandomizationBuckets(candidate);
    expect(result.isValid).toBe(true);
  });

  it("rejects duplicate membership across buckets", () => {
    const sa1 = createSpawnAsset("asset-1", 0);
    const spawn = createSpawn("Test", undefined, [sa1]);
    const candidate: Spawn = {
      ...spawn,
      randomizationBuckets: [
        {
          id: "b1",
          name: "A",
          selection: "one",
          members: [{ spawnAssetId: sa1.id }],
        },
        {
          id: "b2",
          name: "B",
          selection: "one",
          members: [{ spawnAssetId: sa1.id }],
        },
      ],
    };
    const result = validateRandomizationBuckets(candidate);
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("appears in multiple buckets")),
    ).toBe(true);
  });

  it("rejects n greater than enabled members", () => {
    const sa1 = createSpawnAsset("asset-1", 0);
    const sa2 = createSpawnAsset("asset-2", 1);
    sa2.enabled = false;
    const spawn = createSpawn("Test", undefined, [sa1, sa2]);
    const candidate: Spawn = {
      ...spawn,
      randomizationBuckets: [
        {
          id: "b1",
          name: "Pick2",
          selection: "n",
          n: 2,
          members: [{ spawnAssetId: sa1.id }, { spawnAssetId: sa2.id }],
        },
      ],
    };
    const result = validateRandomizationBuckets(candidate);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("selects 2"))).toBe(true);
  });

  it("reconciles buckets by removing members whose spawn assets were deleted", () => {
    const sa1 = createSpawnAsset("asset-1", 0);
    const sa2 = createSpawnAsset("asset-2", 1);
    const spawn = createSpawn("Test", undefined, [sa1, sa2]);
    const withBucket: Spawn = {
      ...spawn,
      randomizationBuckets: [
        {
          id: "b1",
          name: "A",
          selection: "one",
          members: [{ spawnAssetId: sa1.id }, { spawnAssetId: sa2.id }],
        },
      ],
    };
    const afterDelete = reconcileBucketsWithAssets({
      ...withBucket,
      assets: [sa1],
    });
    expect(afterDelete.randomizationBuckets?.[0].members).toHaveLength(1);
    expect(afterDelete.randomizationBuckets?.[0].members[0].spawnAssetId).toBe(
      sa1.id,
    );
  });
});
