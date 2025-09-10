import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
} from "lucide-react";
import type { MediaAsset } from "../../types/media";
import { Button } from "../ui/Button";

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
  const [videoDimensions, setVideoDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Reset states when asset changes
  useEffect(() => {
    if (asset) {
      setImageError(false);
      setVideoDimensions(null);
      setIsPlaying(false);
      setIsMuted(false);
      setIsLoading(true);
      setError(null);
    }
  }, [asset]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    } else if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDownload = () => {
    if (asset) {
      const link = document.createElement("a");
      link.href = asset.path;
      link.download = asset.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDimensions({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });
      setIsLoading(false);
    }
  };

  const handleMediaLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleMediaError = () => {
    setIsLoading(false);
    setError("Failed to load media");
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
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--color-bg))]/80">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-[rgb(var(--color-accent))] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[rgb(var(--color-muted-foreground))] text-sm">
                  Loading image...
                </span>
              </div>
            </div>
          )}
          <img
            src={asset.path}
            alt={asset.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            ref={(el) => {
              mediaRef.current = el as HTMLImageElement | null;
            }}
            onLoad={handleMediaLoad}
            onError={handleMediaError}
          />
        </div>
      );
    } else if (asset.type === "video" && canPreview) {
      return (
        <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--color-bg))]/80">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-[rgb(var(--color-accent))] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[rgb(var(--color-muted-foreground))] text-sm">
                  Loading video...
                </span>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            src={asset.path}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            onLoadedMetadata={handleVideoLoadedMetadata}
            onLoadedData={() => {
              mediaRef.current = videoRef.current;
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={handleMediaError}
          />
        </div>
      );
    } else if (asset.type === "audio" && canPreview) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full text-[rgb(var(--color-fg))]">
          <div className="w-32 h-32 bg-[rgb(var(--color-accent))]/10 rounded-full flex items-center justify-center mb-8">
            <Volume2 className="w-16 h-16 text-[rgb(var(--color-accent))]" />
          </div>
          <div className="text-2xl font-medium mb-4 text-center">
            {asset.name}
          </div>
          <audio
            ref={audioRef}
            src={asset.path}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={handleMediaError}
            className="mb-4"
          />
          <div className="text-[rgb(var(--color-muted-foreground))]">
            Audio Preview
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full text-[rgb(var(--color-fg))]">
          <div className="w-32 h-32 bg-[rgb(var(--color-muted))]/10 rounded-full flex items-center justify-center mb-8">
            {asset.type === "image" ? (
              <img className="w-16 h-16 text-[rgb(var(--color-muted))]" />
            ) : asset.type === "video" ? (
              <Play className="w-16 h-16 text-[rgb(var(--color-muted))]" />
            ) : (
              <Volume2 className="w-16 h-16 text-[rgb(var(--color-muted))]" />
            )}
          </div>
          <div className="text-2xl font-medium mb-4 text-center">
            {asset.name}
          </div>
          <div className="text-[rgb(var(--color-muted-foreground))] text-center max-w-md">
            {error || imageError
              ? "Failed to load preview"
              : "Preview not available for local files"}
          </div>
          <div className="text-sm text-[rgb(var(--color-muted))] mt-2">
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
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-hidden="true"
        />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-7xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-[rgb(var(--color-bg))] p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg border-[rgb(var(--color-border))] h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="asset-preview-title"
          aria-describedby="asset-preview-description"
        >
          {/* Header with Close Button */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <Dialog.Title
                id="asset-preview-title"
                className="text-lg font-semibold text-[rgb(var(--color-fg))] truncate"
              >
                {asset.name}
              </Dialog.Title>
              <Dialog.Description
                id="asset-preview-description"
                className="text-sm text-[rgb(var(--color-muted-foreground))]"
              >
                {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)} file
                preview
              </Dialog.Description>
            </div>
            <div className="flex items-center gap-2">
              {/* Media Controls */}
              {(asset.type === "video" || asset.type === "audio") &&
                canPreview && (
                  <div role="group" aria-label="Media playback controls">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayPause}
                      className="h-8 w-8 p-0"
                      aria-label={isPlaying ? "Pause playback" : "Play media"}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Play className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMuteToggle}
                      className="h-8 w-8 p-0"
                      aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Volume2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-8 w-8 p-0"
                aria-label={`Download ${asset.name}`}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="Close preview dialog"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          {/* Navigation Buttons */}
          {hasPrevious && onPrevious && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 h-12 w-12 p-0 bg-black/50 hover:bg-black/70 text-white"
              aria-label="View previous asset"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </Button>
          )}

          {hasNext && onNext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 h-12 w-12 p-0 bg-black/50 hover:bg-black/70 text-white"
              aria-label="View next asset"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </Button>
          )}

          {/* Preview Content */}
          <div
            className="flex-1 min-h-0 flex items-center justify-center overflow-hidden"
            role="img"
            aria-label={`Preview of ${asset.name}`}
          >
            {renderPreviewContent()}
          </div>

          {/* Asset Information */}
          <div className="mt-4 bg-[rgb(var(--color-muted))]/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-4 text-sm text-[rgb(var(--color-muted-foreground))]">
                  <span className="capitalize font-medium">{asset.type}</span>
                  <span aria-hidden="true">•</span>
                  <span className="truncate" title={asset.path}>
                    {asset.path}
                  </span>
                  {videoDimensions && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>
                        {videoDimensions.width} × {videoDimensions.height}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {(hasNext || hasPrevious) && (
                <div className="flex-shrink-0 ml-4 text-sm text-[rgb(var(--color-muted))]">
                  Use ← → keys to navigate between assets
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
