import { memo, useEffect, useRef, useState } from "react";
import type { MediaAsset } from "../../types/media";
import { computeDisplayPath } from "../../utils/pathDisplay";
import { MediaPreview } from "../common/MediaPreview";
import { AssetService } from "../../services/assetService";

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
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(asset.name);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setDraftName(asset.name);
      setErrorText(null);
    }
  }, [asset.name, isEditing]);

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

  const beginEdit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    setDraftName(asset.name);
    setErrorText(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraftName(asset.name);
    setErrorText(null);
  };

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "Name is required";
    if (trimmed.length > 120) return "Name must be 120 characters or fewer";
    return null;
  };

  const commitEdit = async () => {
    if (isSaving) return;
    const trimmed = draftName.trim();
    if (trimmed === asset.name) {
      setIsEditing(false);
      return;
    }
    const validationError = validateName(draftName);
    if (validationError) {
      setErrorText(validationError);
      return;
    }
    try {
      setIsSaving(true);
      const ok = AssetService.updateAsset({ ...asset, name: trimmed });
      if (!ok) {
        setErrorText("Failed to rename asset");
        return;
      }
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = async (
    e
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      await commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelEdit();
    }
  };

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = e.target.value;
    setDraftName(value);
    if (errorText) {
      const v = validateName(value);
      setErrorText(v);
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
    return <MediaPreview asset={asset} fit="contain" />;
  };

  const nameField = (
    <div className="font-medium truncate text-gray-900">
      {isEditing ? (
        <div className="flex items-center gap-2 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={draftName}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Save on blur; guard to avoid double-commit with Enter
              void commitEdit();
            }}
            aria-label="Asset name"
            aria-invalid={errorText ? true : false}
            aria-describedby={
              errorText ? `asset-${asset.id}-name-error` : undefined
            }
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            disabled={isSaving}
          />
          <button
            type="button"
            className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void commitEdit()}
            disabled={isSaving || Boolean(validateName(draftName))}
          >
            Save
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelEdit}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      ) : (
        <span onDoubleClick={beginEdit} className="truncate" title={asset.name}>
          {asset.name}
        </span>
      )}
      {isEditing && errorText && (
        <div
          id={`asset-${asset.id}-name-error`}
          className="mt-1 text-xs text-red-600"
        >
          {errorText}
        </div>
      )}
    </div>
  );

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
        onKeyDown={(e) => {
          if (!isEditing && e.key === "F2") {
            beginEdit();
          }
        }}
        tabIndex={0}
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 w-16">{renderPreview()}</div>
          <div className="flex-1 min-w-0">{nameField}</div>
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
            <button
              onClick={beginEdit}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Rename asset"
              aria-label="Rename asset"
            >
              ✏️
            </button>
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
      onKeyDown={(e) => {
        if (!isEditing && e.key === "F2") {
          beginEdit();
        }
      }}
      tabIndex={0}
    >
      <div className="flex flex-col">
        {/* Preview */}
        <div className="mb-3">{renderPreview()}</div>

        {/* Asset Information */}
        <div className="text-center">
          <div className="text-sm truncate w-full mb-1 text-gray-900">
            {nameField}
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
            <button
              onClick={beginEdit}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              title="Rename asset"
              aria-label="Rename asset"
            >
              ✏️ Rename
            </button>
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
