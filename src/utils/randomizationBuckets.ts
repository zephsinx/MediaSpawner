import type { Spawn } from "../types/spawn";

export interface RandomizationBucketsValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateRandomizationBuckets(spawn: Spawn): RandomizationBucketsValidationResult {
  const errors: string[] = [];
  const buckets = spawn.randomizationBuckets || [];

  const spawnAssetIds = new Set(spawn.assets.map((a) => a.id));
  const memberToBucket: Record<string, string> = {};

  for (const bucket of buckets) {
    if (!bucket.id || bucket.id.trim() === "") {
      errors.push("Bucket must have a valid id");
    }
    if (!bucket.name || bucket.name.trim() === "") {
      errors.push(`Bucket ${bucket.id || "<no-id>"} must have a name`);
    }
    if (bucket.selection === "n") {
      if (bucket.n === undefined || bucket.n === null) {
        errors.push(`Bucket ${bucket.name} requires 'n' for selection='n'`);
      } else if (bucket.n < 1) {
        errors.push(`Bucket ${bucket.name} has invalid n < 1`);
      }
    }

    const uniqueMembers = new Set<string>();
    for (const m of bucket.members) {
      if (!spawnAssetIds.has(m.spawnAssetId)) {
        errors.push(
          `Bucket ${bucket.name} references missing spawn asset ${m.spawnAssetId}`
        );
      }
      if (uniqueMembers.has(m.spawnAssetId)) {
        errors.push(
          `Bucket ${bucket.name} has duplicate member ${m.spawnAssetId}`
        );
      } else {
        uniqueMembers.add(m.spawnAssetId);
      }
      if (
        memberToBucket[m.spawnAssetId] &&
        memberToBucket[m.spawnAssetId] !== bucket.id
      ) {
        errors.push(
          `Spawn asset ${m.spawnAssetId} appears in multiple buckets (${
            memberToBucket[m.spawnAssetId]
          } and ${bucket.id})`
        );
      } else {
        memberToBucket[m.spawnAssetId] = bucket.id;
      }
      if (bucket.weighted && m.weight !== undefined && m.weight <= 0) {
        errors.push(
          `Bucket ${bucket.name} member ${m.spawnAssetId} has non-positive weight`
        );
      }
    }

    const enabledMemberCount = bucket.members.filter((m) => {
      const sa = spawn.assets.find((a) => a.id === m.spawnAssetId);
      return !!sa?.enabled;
    }).length;

    if (bucket.selection === "n" && bucket.n && bucket.n > enabledMemberCount) {
      errors.push(
        `Bucket ${bucket.name} selects ${bucket.n} but only ${enabledMemberCount} enabled members`
      );
    }

    if (bucket.members.length === 0) {
      errors.push(`Bucket ${bucket.name} must have at least one member`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function reconcileBucketsWithAssets(spawn: Spawn): Spawn {
  const buckets = spawn.randomizationBuckets;
  if (!buckets || buckets.length === 0) return spawn;

  const existingIds = new Set(spawn.assets.map((a) => a.id));

  const pruned = buckets
    .map((b) => ({
      ...b,
      members: b.members.filter((m) => existingIds.has(m.spawnAssetId)),
    }))
    .filter((b) => b.members.length > 0);

  return { ...spawn, randomizationBuckets: pruned };
}
