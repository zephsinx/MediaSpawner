import { useState } from "react";
// @ts-expect-error - react-freezeframe doesn't have TypeScript declarations
import ReactFreezeframe from "react-freezeframe";
import type { MediaAsset } from "../../types/media";

export interface MediaPreviewProps {
  asset: MediaAsset;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  fit?: "cover" | "contain";
  size?: "small" | "medium" | "large";
}

/**
 * Animated image formats that should be paused by default
 */
const ANIMATED_IMAGE_EXTENSIONS = [
  "gif",
  "webp", // Animated WebP
  "apng", // Animated PNG
  "avif", // Animated AVIF
];

/**
 * Check if an asset path likely contains an animated image format
 */
function isLikelyAnimatedImage(path: string): boolean {
  // Remove query parameters and fragments from URLs
  const cleanPath = path.split("?")[0].split("#")[0];
  const lastDot = cleanPath.lastIndexOf(".");
  const lastSlash = Math.max(
    cleanPath.lastIndexOf("/"),
    cleanPath.lastIndexOf("\\"),
  );

  if (lastDot > lastSlash && lastDot !== -1) {
    const extension = cleanPath.slice(lastDot + 1).toLowerCase();
    return ANIMATED_IMAGE_EXTENSIONS.includes(extension);
  }
  return false;
}

export function MediaPreview({
  asset,
  className = "",
  onLoad,
  onError,
  fit = "cover",
  size = "medium",
}: MediaPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleLoad = () => {
    setImageLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    setImageLoading(false);
    onError?.();
  };

  const isImageOrVideo = asset.type === "image" || asset.type === "video";
  const canPreview = isImageOrVideo && asset.isUrl && !imageError;

  // Check if this is likely an animated image that should be paused
  const isAnimatedImage =
    asset.type === "image" && isLikelyAnimatedImage(asset.path);

  // Get size-based styling
  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return "w-8 h-8 aspect-square";
      case "medium":
        return "w-16 h-16 aspect-square";
      case "large":
        return "w-full h-24 aspect-square";
      default:
        return "w-16 h-16 aspect-square";
    }
  };

  if (asset.type === "image" && canPreview) {
    if (isAnimatedImage) {
      // Use react-freezeframe for animated images (GIF, WebP, APNG, etc.)
      return (
        <div
          className={`relative bg-gray-100 rounded overflow-hidden ${getSizeClasses()} ${className}`}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <ReactFreezeframe
            src={asset.path}
            options={{
              trigger: false, // Don't auto-play on hover
              overlay: true, // Show play/pause button
            }}
            onStart={() => handleLoad()}
            onStop={() => {}}
            onToggle={() => {}}
          />
        </div>
      );
    } else {
      // Regular static image
      return (
        <div
          className={`relative bg-gray-100 rounded overflow-hidden ${getSizeClasses()} ${className}`}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={asset.path}
            alt={asset.name}
            className={`w-full h-full ${
              fit === "contain" ? "object-contain" : "object-cover"
            }`}
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      );
    }
  } else if (asset.type === "video" && canPreview) {
    // Video with paused controls
    return (
      <div
        className={`relative bg-gray-100 rounded overflow-hidden ${getSizeClasses()} ${className}`}
      >
        <video
          src={asset.path}
          className={`w-full h-full ${
            fit === "contain" ? "object-contain" : "object-cover"
          }`}
          muted
          preload="metadata"
          autoPlay={false} // Explicitly paused by default
          onLoadedMetadata={handleLoad}
          onError={handleError}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-xs">
            ▶
          </div>
        </div>
      </div>
    );
  } else {
    // Fallback for audio or non-previewable assets
    const getAssetTypeIcon = (type: MediaAsset["type"]) => {
      switch (type) {
        case "image":
          return "🖼️";
        case "video":
          return "🎥";
        case "audio":
          return "🎵";
        default:
          return "📄";
      }
    };

    return (
      <div
        className={`bg-gray-100 rounded flex items-center justify-center ${getSizeClasses()} ${className}`}
      >
        <div className="text-3xl">{getAssetTypeIcon(asset.type)}</div>
      </div>
    );
  }
}
