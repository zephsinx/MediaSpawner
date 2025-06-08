import { useState, memo } from "react";
import type { MediaAsset } from "../../types/media";
import { computeDisplayPath } from "../../utils/pathDisplay";

export interface AssetCardProps {
  asset: MediaAsset;
  variant?: "grid" | "list";
  isSelected?: boolean;
  onClick?: (asset: MediaAsset) => void;
  onPreview?: (asset: MediaAsset) => void;
  onDelete?: (asset: MediaAsset) => void;
  className?: string;
}

export const AssetCard = memo(function AssetCard({
  asset,
  variant = "grid",
  isSelected = false,
  onClick,
  onPreview,
  onDelete,
  className = "",
}: AssetCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(asset);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPreview) {
      onPreview(asset);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(asset);
    }
  };

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

  const getAssetSourceIndicator = (isUrl: boolean) => {
    return isUrl ? "🌐" : "📁";
  };

  const getAssetSourceTooltip = (isUrl: boolean) => {
    return isUrl
      ? "URL asset - supports preview"
      : "Local file - requires working directory";
  };

  const isImageOrVideo = asset.type === "image" || asset.type === "video";
  const canPreview = isImageOrVideo && asset.isUrl;

  const renderPreview = () => {
    if (asset.type === "image" && canPreview && !imageError) {
      return (
        <div className="relative w-full h-24 bg-gray-100 rounded overflow-hidden">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={asset.path}
            alt={asset.name}
            className="w-full h-full object-cover"
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
        <div className="relative w-full h-24 bg-gray-100 rounded overflow-hidden">
          <video
            src={asset.path}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-xs">
              ▶
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center">
          <div className="text-3xl">{getAssetTypeIcon(asset.type)}</div>
        </div>
      );
    }
  };

  if (variant === "list") {
    return (
      <div
        className={`
          border rounded-lg p-4 cursor-pointer transition-all duration-200
          hover:shadow-md hover:border-blue-300
          ${
            isSelected
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white"
          }
          ${className}
        `}
        onClick={handleCardClick}
        title={computeDisplayPath(asset.path)}
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 w-16">{renderPreview()}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-gray-900">
              {asset.name}
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center space-x-2">
            <span className="text-sm text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded text-xs">
              {asset.type}
            </span>
            <span
              className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs"
              title={getAssetSourceTooltip(asset.isUrl)}
            >
              {getAssetSourceIndicator(asset.isUrl)}
            </span>
            {canPreview && (
              <button
                onClick={handlePreviewClick}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Preview asset"
              >
                👁️
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Delete asset"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        border rounded-lg p-3 cursor-pointer transition-all duration-200
        hover:shadow-md hover:border-blue-300
        ${
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
        }
        ${className}
      `}
      onClick={handleCardClick}
      title={computeDisplayPath(asset.path)}
    >
      <div className="flex flex-col">
        {/* Preview */}
        <div className="mb-3">{renderPreview()}</div>

        {/* Asset Information */}
        <div className="text-center">
          <div
            className="text-sm font-medium truncate w-full mb-1 text-gray-900"
            title={asset.name}
          >
            {asset.name}
          </div>
          <div className="flex items-center justify-center space-x-1 mb-2">
            <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
              {asset.type}
            </span>
            <span
              className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
              title={getAssetSourceTooltip(asset.isUrl)}
            >
              {getAssetSourceIndicator(asset.isUrl)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {(canPreview || onDelete) && (
          <div className="mt-2 flex justify-center space-x-4">
            {canPreview && (
              <button
                onClick={handlePreviewClick}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                title="Preview asset"
              >
                👁️ Preview
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                title="Delete asset"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
