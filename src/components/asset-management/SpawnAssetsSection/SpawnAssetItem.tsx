import type { Spawn, SpawnAsset } from "../../../types/spawn";
import type { MediaAsset } from "../../../types/media";
import { MediaPreview } from "../../common/MediaPreview";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  GripVertical,
  Settings,
  MoreVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Shuffle,
} from "lucide-react";
import {
  dispatchMediaSpawnerEvent,
  MediaSpawnerEvents,
} from "../../../hooks/useMediaSpawnerEvent";
import { AssetTypeBadge } from "../shared/AssetTypeBadge";
import { AssetPopoverContent } from "../shared/AssetPopoverContent";

interface SpawnAssetItemProps {
  spawnAsset: SpawnAsset;
  baseAsset: MediaAsset;
  index: number;
  spawn: Spawn | null;
  totalCount: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, index: number, id: string) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: (index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
}

/**
 * Renders a single draggable spawn asset item with actions.
 */
export function SpawnAssetItem({
  spawnAsset,
  baseAsset,
  index,
  spawn,
  totalCount,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onReorder,
  onRemove,
}: SpawnAssetItemProps) {
  const bucket = spawn?.randomizationBuckets?.find((b) =>
    b.members.some((m) => m.spawnAssetId === spawnAsset.id),
  );

  return (
    <li
      role="listitem"
      className={`border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-bg))] p-2 focus-within:ring-2 focus-within:ring-[rgb(var(--color-ring))] ${
        isDragging ? "opacity-70" : ""
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, index, spawnAsset.id)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={() => onDragLeave(index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <div
          className="w-4 text-[rgb(var(--color-muted))] cursor-grab select-none"
          title="Drag to reorder"
          aria-hidden
        >
          <GripVertical size={16} />
        </div>

        {/* Thumbnail with popover */}
        <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded">
          <Popover.Root>
            <Popover.Trigger asChild>
              <div className="w-16 h-16 overflow-hidden rounded">
                <MediaPreview
                  asset={baseAsset}
                  className="h-full"
                  fit="contain"
                />
              </div>
            </Popover.Trigger>
            <Popover.Portal>
              <AssetPopoverContent asset={baseAsset} />
            </Popover.Portal>
          </Popover.Root>
        </div>

        {/* Asset info */}
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-medium text-[rgb(var(--color-fg))] truncate"
            title={baseAsset.name}
          >
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span
                  className="truncate inline-block max-w-full align-middle"
                  tabIndex={-1}
                >
                  {baseAsset.name}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  sideOffset={6}
                  className="z-10 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-xs text-[rgb(var(--color-fg))] shadow-md"
                >
                  {baseAsset.name}
                  <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
          <div className="text-xs text-[rgb(var(--color-muted-foreground))] flex items-center gap-1.5">
            <AssetTypeBadge type={baseAsset.type} />
            {bucket && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span
                    className="inline-flex items-center justify-center bg-[rgb(var(--color-accent))]/10 text-[rgb(var(--color-accent))] w-6 h-6 rounded border border-[rgb(var(--color-accent))]"
                    aria-label={`Bucket: ${bucket.name}`}
                    tabIndex={-1}
                  >
                    <Shuffle size={14} />
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    sideOffset={6}
                    className="z-10 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-2 py-1 text-xs text-[rgb(var(--color-fg))] shadow-md"
                  >
                    Bucket: {bucket.name}
                    <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}
            {!spawnAsset.enabled && (
              <span className="inline-flex items-center gap-1 bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))] px-1.5 py-0.5 rounded text-[11px]">
                Disabled
              </span>
            )}
            <span className="text-[rgb(var(--color-muted))]">•</span>
            <span className="text-[rgb(var(--color-muted-foreground))]">
              Order: {spawnAsset.order}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex items-center justify-center text-xs rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 w-7 h-7"
            onClick={() => {
              dispatchMediaSpawnerEvent(
                MediaSpawnerEvents.REQUEST_CENTER_SWITCH,
                {
                  mode: "asset-settings",
                  spawnAssetId: spawnAsset.id,
                },
              );
            }}
            aria-label="Configure"
          >
            <Settings size={14} />
          </button>
          <button
            type="button"
            aria-label="Remove from Spawn"
            className="inline-flex items-center justify-center text-xs rounded border border-[rgb(var(--color-error))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-error))] hover:bg-[rgb(var(--color-error-bg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 w-7 h-7"
            onClick={() => onRemove(spawnAsset.id)}
          >
            <Trash2 size={14} />
          </button>
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
                  onSelect={() => {
                    const toIndex = Math.max(0, index - 1);
                    if (toIndex !== index) onReorder(index, toIndex);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <ChevronUp size={14} /> Move up
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="px-3 py-2 rounded data-[highlighted]:bg-[rgb(var(--color-muted))] dark:data-[highlighted]:bg-[rgb(var(--color-border))] data-[highlighted]:text-[rgb(var(--color-fg))] outline-none cursor-pointer"
                  onSelect={() => {
                    const toIndex = Math.min(totalCount - 1, index + 1);
                    if (toIndex !== index) onReorder(index, toIndex);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <ChevronDown size={14} /> Move down
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-[rgb(var(--color-border))]" />
                <DropdownMenu.Item
                  className="px-3 py-2 rounded text-[rgb(var(--color-error))] data-[highlighted]:bg-[rgb(var(--color-error-bg))] outline-none cursor-pointer"
                  onSelect={() => onRemove(spawnAsset.id)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 size={14} /> Remove
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Arrow className="fill-[rgb(var(--color-bg))]" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Drag indicator */}
      {isDragOver && (
        <div
          className="mt-2 h-0.5 bg-[rgb(var(--color-accent))] rounded"
          aria-hidden
        />
      )}
    </li>
  );
}
