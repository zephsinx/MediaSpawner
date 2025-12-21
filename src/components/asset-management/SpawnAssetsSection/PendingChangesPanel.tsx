import type { MediaAsset } from "../../../types/media";
import type { SpawnAssetsDiff } from "../../../utils/spawnAssetsDiff";
import { getAssetTypeIcon } from "../shared/assetTypeUtils";

interface PendingChangesPanelProps {
  diff: SpawnAssetsDiff;
  assetInfoById: Map<string, MediaAsset>;
}

/**
 * Displays a panel showing pending asset changes (added, removed, reordered).
 */
export function PendingChangesPanel({
  diff,
  assetInfoById,
}: PendingChangesPanelProps) {
  const renderAssetTypeBadge = (asset: MediaAsset | undefined) => (
    <span className="inline-flex items-center gap-1 capitalize bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))] px-1.5 py-0.5 rounded">
      <span>{asset ? getAssetTypeIcon(asset.type) : ""}</span>
      <span>{asset?.type ?? "asset"}</span>
    </span>
  );

  return (
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
        {/* Added assets */}
        {diff.added.length > 0 && (
          <div>
            <div className="text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
              Added ({diff.added.length})
            </div>
            <ul role="list" className="space-y-1">
              {diff.added.map((it) => {
                const a = assetInfoById.get(it.assetId);
                return (
                  <li
                    role="listitem"
                    key={`add-${it.assetId}`}
                    className="text-xs text-[rgb(var(--color-fg))] flex items-center gap-2"
                  >
                    {renderAssetTypeBadge(a)}
                    <span className="truncate" title={a?.name}>
                      {a?.name ?? it.assetId}
                    </span>
                    <span className="text-[rgb(var(--color-muted))]">•</span>
                    <span className="text-[rgb(var(--color-muted-foreground))]">
                      #{it.index}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Removed assets */}
        {diff.removed.length > 0 && (
          <div>
            <div className="text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
              Removed ({diff.removed.length})
            </div>
            <ul role="list" className="space-y-1">
              {diff.removed.map((it) => {
                const a = assetInfoById.get(it.assetId);
                return (
                  <li
                    role="listitem"
                    key={`rem-${it.assetId}`}
                    className="text-xs text-[rgb(var(--color-fg))] flex items-center gap-2"
                  >
                    {renderAssetTypeBadge(a)}
                    <span className="truncate" title={a?.name}>
                      {a?.name ?? it.assetId}
                    </span>
                    <span className="text-[rgb(var(--color-muted))]">•</span>
                    <span className="text-[rgb(var(--color-muted-foreground))]">
                      was #{it.prevIndex}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Reordered assets */}
        {diff.reordered.length > 0 && (
          <div>
            <div className="text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
              Reordered ({diff.reordered.length})
            </div>
            <ul role="list" className="space-y-1">
              {diff.reordered.map((it) => {
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
                    <span className="text-[rgb(var(--color-muted))]">•</span>
                    <span className="text-[rgb(var(--color-muted-foreground))]">
                      #{it.prevIndex} → #{it.nextIndex}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* No changes */}
        {diff.added.length === 0 &&
          diff.removed.length === 0 &&
          diff.reordered.length === 0 && (
            <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
              No changes
            </div>
          )}
      </div>
    </div>
  );
}
