import { memo, useEffect, useRef, useState } from "react";
import {
  Image,
  Video,
  Music,
  Edit,
  Eye,
  Trash2,
  Globe,
  Folder,
} from "lucide-react";
import type { MediaAsset } from "../../types/media";
import { computeDisplayPath } from "../../utils/pathDisplay";
import { MediaPreview } from "../common/MediaPreview";
import { AssetService } from "../../services/assetService";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cn } from "../../utils/cn";

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

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return Image;
      case "video":
        return Video;
      case "audio":
        return Music;
      default:
        return Music;
    }
  };

  const getAssetSourceIcon = (isUrl: boolean) => {
    return isUrl ? Globe : Folder;
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
    <div className="font-medium truncate text-[rgb(var(--color-fg))]">
      {isEditing ? (
        <div className="flex items-center gap-2 min-w-0">
          <Input
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
            variant={errorText ? "error" : "default"}
            className="flex-1 text-sm"
            disabled={isSaving}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void commitEdit()}
            disabled={isSaving || Boolean(validateName(draftName))}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelEdit}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <span onDoubleClick={beginEdit} className="truncate" title={asset.name}>
          {asset.name}
        </span>
      )}
      {isEditing && errorText && (
        <div
          id={`asset-${asset.id}-name-error`}
          className="mt-1 text-xs text-[rgb(var(--color-error))]"
        >
          {errorText}
        </div>
      )}
    </div>
  );

  if (variant === "list") {
    const TypeIcon = getAssetTypeIcon(asset.type);
    const SourceIcon = getAssetSourceIcon(asset.isUrl);

    return (
      <Card
        variant={isSelected ? "selected" : "default"}
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md",
          className
        )}
        onClick={handleCardClick}
        title={computeDisplayPath(asset.path)}
        onKeyDown={(e) => {
          if (!isEditing && e.key === "F2") {
            beginEdit();
          } else if (!isEditing && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleCardClick(e as unknown as React.MouseEvent);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Asset: ${asset.name}, ${asset.type}, ${
          asset.isUrl ? "URL" : "file"
        }`}
        aria-selected={isSelected}
        aria-describedby={`asset-${asset.id}-list-description`}
      >
        <div className="flex items-center space-x-4 p-4">
          <div className="flex-shrink-0 w-16">{renderPreview()}</div>
          <div className="flex-1 min-w-0">{nameField}</div>
          <div
            id={`asset-${asset.id}-list-description`}
            className="flex-shrink-0 flex items-center space-x-2"
          >
            <div
              className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))] bg-[rgb(var(--color-muted))]/10 px-2 py-1 rounded"
              aria-label={`Asset type: ${asset.type}`}
            >
              <TypeIcon className="h-3 w-3" aria-hidden="true" />
              <span className="capitalize">{asset.type}</span>
            </div>
            <div
              className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))] bg-[rgb(var(--color-muted))]/10 px-2 py-1 rounded"
              title={getAssetSourceTooltip(asset.isUrl)}
              aria-label={getAssetSourceTooltip(asset.isUrl)}
            >
              <SourceIcon className="h-3 w-3" aria-hidden="true" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={beginEdit}
              className="h-8 w-8 p-0 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))]"
              title="Rename asset"
              aria-label={`Rename asset: ${asset.name}`}
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
            </Button>
            {canPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviewClick}
                className="h-8 w-8 p-0 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))]"
                title="Preview asset"
                aria-label={`Preview asset: ${asset.name}`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="h-8 w-8 p-0 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-error))]"
                title="Delete asset"
                aria-label={`Delete asset: ${asset.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const TypeIcon = getAssetTypeIcon(asset.type);
  const SourceIcon = getAssetSourceIcon(asset.isUrl);

  return (
    <Card
      variant={isSelected ? "selected" : "default"}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        className
      )}
      onClick={handleCardClick}
      title={computeDisplayPath(asset.path)}
      onKeyDown={(e) => {
        if (!isEditing && e.key === "F2") {
          beginEdit();
        } else if (!isEditing && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleCardClick(e as unknown as React.MouseEvent);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Asset: ${asset.name}, ${asset.type}, ${
        asset.isUrl ? "URL" : "file"
      }`}
      aria-selected={isSelected}
      aria-describedby={`asset-${asset.id}-description`}
    >
      <div className="flex flex-col p-3">
        {/* Preview */}
        <div className="mb-3">{renderPreview()}</div>

        {/* Asset Information */}
        <div className="text-center">
          <div className="text-sm truncate w-full mb-1 text-[rgb(var(--color-fg))]">
            {nameField}
          </div>
          <div
            id={`asset-${asset.id}-description`}
            className="flex items-center justify-center space-x-1 mb-2"
          >
            <div
              className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))] bg-[rgb(var(--color-muted))]/10 px-2 py-1 rounded"
              aria-label={`Asset type: ${asset.type}`}
            >
              <TypeIcon className="h-3 w-3" aria-hidden="true" />
              <span className="capitalize">{asset.type}</span>
            </div>
            <div
              className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))] bg-[rgb(var(--color-muted))]/10 px-2 py-1 rounded"
              title={getAssetSourceTooltip(asset.isUrl)}
              aria-label={getAssetSourceTooltip(asset.isUrl)}
            >
              <SourceIcon className="h-3 w-3" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(canPreview || onDelete) && (
          <div
            className="mt-2 flex justify-center space-x-2"
            role="group"
            aria-label="Asset actions"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={beginEdit}
              className="text-xs text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))] h-7 px-2"
              title="Rename asset"
              aria-label={`Rename asset: ${asset.name}`}
            >
              <Edit className="h-3 w-3 mr-1" aria-hidden="true" />
              Rename
            </Button>
            {canPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviewClick}
                className="text-xs text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))] h-7 px-2"
                title="Preview asset"
                aria-label={`Preview asset: ${asset.name}`}
              >
                <Eye className="h-3 w-3 mr-1" aria-hidden="true" />
                Preview
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="text-xs text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-error))] h-7 px-2"
                title="Delete asset"
                aria-label={`Delete asset: ${asset.name}`}
              >
                <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});
