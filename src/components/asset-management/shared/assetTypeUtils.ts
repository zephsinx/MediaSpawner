import type { MediaAsset } from "../../../types/media";

/**
 * Returns the emoji icon for a given asset type.
 */
export function getAssetTypeIcon(type: MediaAsset["type"]): string {
  return type === "image" ? "🖼️" : type === "video" ? "🎥" : "🎵";
}
