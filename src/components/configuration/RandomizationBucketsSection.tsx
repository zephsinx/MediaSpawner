import React, { useMemo, useState } from "react";
import type { Spawn } from "../../types/spawn";
import type {
  RandomizationBucket,
  RandomizationBucketMember,
} from "../../types/spawn";
import { Modal } from "../common/Modal";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { AssetService } from "../../services/assetService";
import * as Tooltip from "@radix-ui/react-tooltip";

export interface RandomizationBucketsSectionProps {
  spawn: Spawn;
  buckets: RandomizationBucket[];
  onChange: (buckets: RandomizationBucket[]) => void;
}

export const RandomizationBucketsSection: React.FC<
  RandomizationBucketsSectionProps
> = ({ spawn, buckets, onChange }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    selection: "one" | "n";
    n?: number;
  }>({
    name: "",
    selection: "one",
    n: 1,
  });

  const [memberEditFor, setMemberEditFor] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    assetId: string;
    fromBucketId: string;
    toBucketId: string;
  } | null>(null);

  const bucketByAssetId = useMemo(() => {
    const map = new Map<string, string>();
    buckets.forEach((b) => {
      b.members.forEach((m) => map.set(m.spawnAssetId, b.id));
    });
    return map;
  }, [buckets]);

  const canCreate = useMemo(() => {
    if (!createForm.name.trim()) return false;
    if (createForm.selection === "n") return (createForm.n || 0) >= 1;
    return true;
  }, [createForm]);

  const addBucket = () => {
    if (!canCreate) return;
    const newBucket: RandomizationBucket = {
      id: crypto.randomUUID(),
      name: createForm.name.trim(),
      selection: createForm.selection,
      n:
        createForm.selection === "n"
          ? Math.max(1, Number(createForm.n) || 1)
          : undefined,
      members: [],
    };
    onChange([...(buckets || []), newBucket]);
    setCreateForm({ name: "", selection: "one", n: 1 });
    setIsCreateOpen(false);
  };

  const removeBucket = (bucketId: string) => {
    onChange((buckets || []).filter((b) => b.id !== bucketId));
  };

  const updateBucket = (
    bucketId: string,
    update: Partial<RandomizationBucket>,
  ) => {
    onChange(
      (buckets || []).map((b) => (b.id === bucketId ? { ...b, ...update } : b)),
    );
  };

  const openMembersEditor = (bucketId: string) => setMemberEditFor(bucketId);
  const closeMembersEditor = () => setMemberEditFor(null);

  const toggleMember = (bucketId: string, spawnAssetId: string) => {
    const existing = bucketByAssetId.get(spawnAssetId);
    if (existing && existing !== bucketId) {
      setPendingMove({
        assetId: spawnAssetId,
        fromBucketId: existing,
        toBucketId: bucketId,
      });
      return;
    }

    onChange(
      (buckets || []).map((b) => {
        if (b.id !== bucketId) return b;
        const isMember = b.members.some((m) => m.spawnAssetId === spawnAssetId);
        return {
          ...b,
          members: isMember
            ? b.members.filter((m) => m.spawnAssetId !== spawnAssetId)
            : [...b.members, { spawnAssetId } as RandomizationBucketMember],
        };
      }),
    );
  };

  const confirmMove = () => {
    const move = pendingMove;
    if (!move) return;
    const { assetId, fromBucketId, toBucketId } = move;
    onChange(
      (buckets || []).map((b) => {
        if (b.id === fromBucketId) {
          return {
            ...b,
            members: b.members.filter((m) => m.spawnAssetId !== assetId),
          };
        }
        if (b.id === toBucketId) {
          if (b.members.some((m) => m.spawnAssetId === assetId)) return b;
          return { ...b, members: [...b.members, { spawnAssetId: assetId }] };
        }
        return b;
      }),
    );
    setPendingMove(null);
  };

  const cancelMove = () => setPendingMove(null);

  return (
    <section className="bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-[rgb(var(--color-fg))]">
          Randomization Buckets
        </h3>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-3 py-1.5 rounded-md text-[rgb(var(--color-accent-foreground))] bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent-hover))]"
        >
          Add Bucket
        </button>
      </div>

      {(buckets || []).length === 0 ? (
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
          No buckets yet. Create one to randomize selected assets.
        </p>
      ) : (
        <div className="space-y-3">
          {buckets.map((b) => (
            <div
              key={b.id}
              className="border border-[rgb(var(--color-border))] rounded-md p-3"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[rgb(var(--color-fg))] truncate">
                    {b.name}
                  </div>
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    {b.selection === "one" ? "Pick one" : `Pick ${b.n ?? 1}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-1))] text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))]"
                    onClick={() => openMembersEditor(b.id)}
                  >
                    Edit Members ({b.members.length})
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-1))] text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))]"
                    onClick={() =>
                      updateBucket(b.id, {
                        selection: b.selection === "one" ? "n" : "one",
                        n:
                          b.selection === "one"
                            ? Math.min(1, (b.n as number) || 1)
                            : undefined,
                      })
                    }
                  >
                    Toggle Mode
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-error-border))] bg-[rgb(var(--color-surface-1))] text-[rgb(var(--color-error))] hover:bg-[rgb(var(--color-muted))]"
                    onClick={() => removeBucket(b.id)}
                    aria-label="Delete bucket"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {b.selection === "n" && (
                <div className="mt-2">
                  <label className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    N to select
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={b.n ?? 1}
                    onChange={(e) =>
                      updateBucket(b.id, {
                        n: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="ml-2 w-20 px-2 py-1 text-sm border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input))] text-[rgb(var(--color-fg))] rounded"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateForm({ name: "", selection: "one", n: 1 });
        }}
        title="Create Bucket"
        size="md"
      >
        <div className="space-y-3">
          <div>
            <label
              htmlFor="bucket-name"
              className="block text-sm font-medium text-[rgb(var(--color-muted-foreground))] mb-1"
            >
              Name
            </label>
            <input
              id="bucket-name"
              type="text"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input))] text-[rgb(var(--color-fg))] rounded-md"
            />
          </div>
          <div className="flex items-center gap-3">
            <label
              htmlFor="bucket-selection"
              className="text-sm text-[rgb(var(--color-muted-foreground))]"
            >
              Selection
            </label>
            <select
              id="bucket-selection"
              value={createForm.selection}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  selection: e.target.value as "one" | "n",
                }))
              }
              className="px-2 py-1 text-sm border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input))] text-[rgb(var(--color-fg))] rounded"
            >
              <option value="one">Pick one</option>
              <option value="n">Pick N</option>
            </select>
            {createForm.selection === "n" && (
              <>
                <label
                  htmlFor="bucket-n"
                  className="text-sm text-[rgb(var(--color-muted-foreground))]"
                >
                  N
                </label>
                <input
                  id="bucket-n"
                  type="number"
                  min={1}
                  value={createForm.n ?? 1}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      n: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-20 px-2 py-1 text-sm border border-[rgb(var(--color-border))] bg-[rgb(var(--color-input))] text-[rgb(var(--color-fg))] rounded"
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-4"></div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-1))] text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))]"
              onClick={() => {
                setIsCreateOpen(false);
                setCreateForm({ name: "", selection: "one", n: 1 });
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canCreate}
              className={`px-3 py-1.5 rounded-md text-[rgb(var(--color-accent-foreground))] ${
                canCreate
                  ? "bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent-hover))]"
                  : "bg-[rgb(var(--color-muted))] cursor-not-allowed"
              }`}
              onClick={addBucket}
            >
              Create
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={memberEditFor !== null}
        onClose={closeMembersEditor}
        title="Edit Bucket Members"
        size="xl"
      >
        {memberEditFor && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-auto">
              {spawn.assets.map((sa) => {
                const inBucket = (
                  buckets.find((b) => b.id === memberEditFor)?.members || []
                ).some((m) => m.spawnAssetId === sa.id);
                const otherBucket = bucketByAssetId.get(sa.id);
                const base = AssetService.getAssetById(sa.assetId);
                return (
                  <label
                    key={sa.id}
                    className="flex items-center gap-2 text-sm border border-[rgb(var(--color-border))] rounded p-2"
                  >
                    <input
                      type="checkbox"
                      checked={inBucket}
                      onChange={() => toggleMember(memberEditFor, sa.id)}
                    />
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <span className="text-[rgb(var(--color-fg))] truncate">
                          {base?.name || sa.assetId}
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          sideOffset={6}
                          className="z-[60] rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-1))] px-2 py-1 text-xs text-[rgb(var(--color-fg))] shadow-md"
                        >
                          {base?.path || sa.assetId}
                          <Tooltip.Arrow className="fill-white" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                    <span className="inline-flex items-center gap-1 capitalize bg-[rgb(var(--color-surface-2))] text-[rgb(var(--color-muted-foreground))] px-2 py-0.5 rounded">
                      {base?.type || "asset"}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-[rgb(var(--color-surface-2))] text-[rgb(var(--color-muted-foreground))] px-2 py-0.5 rounded">
                      #{sa.order}
                    </span>
                    {otherBucket && otherBucket !== memberEditFor && (
                      <span className="ml-auto text-xs text-[rgb(var(--color-muted-foreground))]">
                        In another bucket
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-1))] text-[rgb(var(--color-muted-foreground))] hover:bg-gray-50"
                onClick={closeMembersEditor}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={pendingMove !== null}
        title="Move asset to this bucket?"
        message="This asset already belongs to a different bucket. Moving it will remove it from the other bucket."
        confirmText="Move"
        cancelText="Cancel"
        variant="warning"
        onConfirm={confirmMove}
        onCancel={cancelMove}
      />
    </section>
  );
};
