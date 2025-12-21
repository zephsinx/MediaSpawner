import type { SpawnAsset } from "../../types/spawn";
import type { MediaAsset } from "../../types/media";

/**
 * A spawn asset paired with its resolved base asset from the library.
 */
export type ResolvedSpawnAsset = {
  spawnAsset: SpawnAsset;
  baseAsset: MediaAsset;
};
