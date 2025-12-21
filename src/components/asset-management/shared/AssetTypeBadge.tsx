import type { MediaAsset } from "../../../types/media";
import { getAssetTypeIcon } from "./assetTypeUtils";

interface AssetTypeBadgeProps {
  type: MediaAsset["type"];
}

/**
 * Renders a badge showing the asset type with its icon.
 */
export function AssetTypeBadge({ type }: AssetTypeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 capitalize bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))] px-1.5 py-0.5 rounded">
      <span>{getAssetTypeIcon(type)}</span>
      <span>{type}</span>
    </span>
  );
}
