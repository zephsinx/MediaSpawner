import { useEffect, useRef, useState } from "react";
import type { MediaAsset } from "../../types/media";

export interface AssetPreviewProps {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function AssetPreview({
  asset,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: AssetPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [videoDimensions, setVideoDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Reset states when asset changes
  useEffect(() => {
    if (asset) {
      setImageError(false);
      setImageLoading(true);
      setVideoDimensions(null);
    }
  }, [asset]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrevious && onPrevious) {
            onPrevious();
          }
          break;
        case "ArrowRight":
          if (hasNext && onNext) {
            onNext();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDimensions({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });
    }
  };

  const isImageOrVideo = asset?.type === "image" || asset?.type === "video";
  const isUrlPath =
    asset?.path.startsWith("http://") || asset?.path.startsWith("https://");
  const canPreview =
    asset && isImageOrVideo && (isUrlPath || asset.path.startsWith("data:"));

  const renderPreviewContent = () => {
    if (!asset) return null;

    if (asset.type === "image" && canPreview && !imageError) {
      return (
        <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={asset.path}
            alt={asset.name}
            className="max-w-full max-h-full object-contain"
            style={{ width: "100%", height: "100%" }}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        </div>
      );
    } else if (asset.type === "video" && canPreview) {
      return (
        <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
          <video
            ref={videoRef}
            src={asset.path}
            className="max-w-full max-h-full object-contain"
            controls
            onLoadedMetadata={handleVideoLoadedMetadata}
          />
        </div>
      );
    } else if (asset.type === "audio" && canPreview) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full text-white">
          <div className="text-8xl mb-8">🎵</div>
          <div className="text-2xl font-medium mb-4">{asset.name}</div>
          <audio ref={audioRef} src={asset.path} controls className="mb-4" />
          <div className="text-gray-300">Audio Preview</div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full text-white">
          <div className="text-8xl mb-8">
            {asset.type === "image"
              ? "🖼️"
              : asset.type === "video"
              ? "🎥"
              : "🎵"}
          </div>
          <div className="text-2xl font-medium mb-4">{asset.name}</div>
          <div className="text-gray-300 text-center max-w-md">
            {imageError
              ? "Failed to load preview"
              : "Preview not available for local files"}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)} file
          </div>
        </div>
      );
    }
  };

  if (!isOpen || !asset) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/80 flex items-center justify-center"
      onClick={handleBackdropClick}
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-preview-title"
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-xl transition-colors"
        aria-label="Close preview"
      >
        ✕
      </button>

      {/* Navigation Buttons */}
      {hasPrevious && onPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          aria-label="Previous asset"
        >
          ←
        </button>
      )}

      {hasNext && onNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          aria-label="Next asset"
        >
          →
        </button>
      )}

      {/* Preview Content */}
      <div className="w-full h-full p-6 md:p-10 lg:p-16 flex flex-col">
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          {renderPreviewContent()}
        </div>

        {/* Asset Information */}
        <div className="mt-8 bg-black/50 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2
                id="asset-preview-title"
                className="text-lg font-medium truncate"
              >
                {asset.name}
              </h2>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-300">
                <span className="capitalize">{asset.type}</span>
                <span>•</span>
                <span className="truncate" title={asset.path}>
                  {asset.path}
                </span>
                {videoDimensions && (
                  <>
                    <span>•</span>
                    <span>
                      {videoDimensions.width} × {videoDimensions.height}
                    </span>
                  </>
                )}
              </div>
            </div>
            {(hasNext || hasPrevious) && (
              <div className="flex-shrink-0 ml-4 text-sm text-gray-400">
                Navigation: ← → keys
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
