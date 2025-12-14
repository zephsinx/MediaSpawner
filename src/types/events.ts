import type { Spawn } from "./spawn";

export const MediaSpawnerEvents = {
  SPAWN_UPDATED: "mediaspawner:spawn-updated",
  SPAWN_DELETED: "mediaspawner:spawn-deleted",
  ASSETS_UPDATED: "mediaspawner:assets-updated",
  PROFILE_CHANGED: "mediaspawner:profile-changed",
  REQUEST_CENTER_SWITCH: "mediaspawner:request-center-switch",
  DRAFT_ASSET_COUNT_CHANGED: "mediaspawner:draft-asset-count-changed",
  REQUEST_ADD_ASSET_TO_SPAWN: "mediaspawner:request-add-asset-to-spawn",
  CONFIGURATION_IMPORTED: "mediaspawner:configuration-imported",
} as const;

export type MediaSpawnerEventName =
  (typeof MediaSpawnerEvents)[keyof typeof MediaSpawnerEvents];

export interface SpawnUpdatedDetail {
  spawnId: string;
  updatedSpawn?: Spawn;
}

export interface SpawnDeletedDetail {
  id: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AssetsUpdatedDetail {
  // No payload currently used
}

export interface ProfileChangedDetail {
  profileId: string | undefined;
  previousProfileId: string | undefined;
}

export interface RequestCenterSwitchDetail {
  mode: "spawn-settings" | "asset-settings";
  spawnAssetId?: string;
  skipGuard?: boolean;
}

export interface DraftAssetCountChangedDetail {
  spawnId: string;
  count: number;
  isDraft: boolean;
}

export interface RequestAddAssetToSpawnDetail {
  assetId: string;
  assetName: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ConfigurationImportedDetail {
  // No payload currently used
}

export interface MediaSpawnerEventMap {
  [MediaSpawnerEvents.SPAWN_UPDATED]: CustomEvent<SpawnUpdatedDetail>;
  [MediaSpawnerEvents.SPAWN_DELETED]: CustomEvent<SpawnDeletedDetail>;
  [MediaSpawnerEvents.ASSETS_UPDATED]: CustomEvent<AssetsUpdatedDetail>;
  [MediaSpawnerEvents.PROFILE_CHANGED]: CustomEvent<ProfileChangedDetail>;
  [MediaSpawnerEvents.REQUEST_CENTER_SWITCH]: CustomEvent<RequestCenterSwitchDetail>;
  [MediaSpawnerEvents.DRAFT_ASSET_COUNT_CHANGED]: CustomEvent<DraftAssetCountChangedDetail>;
  [MediaSpawnerEvents.REQUEST_ADD_ASSET_TO_SPAWN]: CustomEvent<RequestAddAssetToSpawnDetail>;
  [MediaSpawnerEvents.CONFIGURATION_IMPORTED]: CustomEvent<ConfigurationImportedDetail>;
}
