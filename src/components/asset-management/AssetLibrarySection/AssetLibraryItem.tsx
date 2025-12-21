import type { MediaAsset } from "../../../types/media";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import { ThumbnailWithPreview, AssetTypeBadge } from "../shared";

interface AssetLibraryItemProps {
  asset: MediaAsset;
  index: number;
  isActive: boolean;
  isInSpawn: boolean;
  canAddToSpawn: boolean;
  isRenaming: boolean;
  renameValue: string;
  renameError: string | null;
  onAdd: (asset: MediaAsset) => void;
  onRenameStart: (asset: MediaAsset) => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: (asset: MediaAsset) => void;
  onRenameCancel: () => void;
}

/**
 * Renders a single asset item in the library with add/rename actions.
 */
export function AssetLibraryItem({
  asset,
  index,
  isActive,
  isInSpawn,
  canAddToSpawn,
  isRenaming,
  renameValue,
  renameError,
  onAdd,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}: AssetLibraryItemProps) {
  return (
    <li
      role="listitem"
      className={`border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-bg))] p-1.5 outline-none ${
        isActive ? "ring-2 ring-[rgb(var(--color-ring))]" : ""
      }`}
      data-asset-index={index}
      tabIndex={-1}
    >
      <div className="flex items-center gap-2">
        <ThumbnailWithPreview asset={asset} />
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-medium text-[rgb(var(--color-fg))] truncate"
            title={asset.name}
          >
            {isRenaming ? (
              <div className="flex flex-col gap-1">
                <input
                  aria-label="Rename asset"
                  value={renameValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onRenameCommit(asset);
                    } else if (e.key === "Escape") {
                      onRenameCancel();
                    }
                  }}
                  onBlur={() => onRenameCancel()}
                  className="w-full px-2 py-1 border border-[rgb(var(--color-border))] rounded text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
                />
                {renameError && (
                  <div
                    className="text-xs text-[rgb(var(--color-error))]"
                    role="alert"
                  >
                    {renameError}
                  </div>
                )}
              </div>
            ) : (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span
                    className="truncate inline-block max-w-full align-middle"
                    onDoubleClick={() => onRenameStart(asset)}
                    tabIndex={-1}
                  >
                    {asset.name}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={6}
                    className="z-10 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-xs text-[rgb(var(--color-fg))] shadow-md"
                  >
                    {asset.name}
                    <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}
          </div>
          <div className="text-xs text-[rgb(var(--color-muted-foreground))] flex items-center gap-2">
            <AssetTypeBadge type={asset.type} />
            <span className="text-[rgb(var(--color-muted))]">•</span>
            <span
              className="text-[rgb(var(--color-muted-foreground))]"
              title={asset.isUrl ? "URL asset" : "Local file"}
            >
              {asset.isUrl ? "🌐" : "📁"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isInSpawn ? (
            <span
              className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-muted-foreground))] cursor-default"
              aria-label="Already in spawn"
            >
              Added ✓
            </span>
          ) : (
            <button
              type="button"
              className={`p-1.5 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] ${
                !canAddToSpawn
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-[rgb(var(--color-muted))]/5"
              }`}
              aria-label="Add to Spawn"
              onClick={() => onAdd(asset)}
              disabled={!canAddToSpawn}
            >
              +
            </button>
          )}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
                aria-label="More actions"
              >
                <MoreVertical size={16} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={6}
                className="z-10 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] shadow-md p-1 text-sm"
              >
                <DropdownMenu.Item
                  className="px-3 py-2 rounded data-[highlighted]:bg-[rgb(var(--color-muted))] dark:data-[highlighted]:bg-[rgb(var(--color-border))] data-[highlighted]:text-[rgb(var(--color-fg))] outline-none cursor-pointer"
                  onSelect={() => onRenameStart(asset)}
                >
                  Rename
                </DropdownMenu.Item>
                <DropdownMenu.Arrow className="fill-[rgb(var(--color-bg))]" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </li>
  );
}
