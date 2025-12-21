import type { MediaAsset } from "../../../types/media";
import { MediaPreview } from "../../common/MediaPreview";
import * as Popover from "@radix-ui/react-popover";

interface AssetPopoverContentProps {
  asset: MediaAsset;
}

/**
 * Shared popover content displaying asset preview and details.
 */
export function AssetPopoverContent({ asset }: AssetPopoverContentProps) {
  return (
    <Popover.Content
      sideOffset={6}
      className="z-10 w-72 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] shadow-md p-2"
    >
      <div className="w-full h-40 overflow-hidden rounded mb-2">
        <MediaPreview asset={asset} className="h-full" fit="contain" />
      </div>
      <div className="text-xs text-[rgb(var(--color-fg))] space-y-1">
        <div>
          <span className="text-[rgb(var(--color-muted-foreground))]">
            Name:
          </span>{" "}
          {asset.name}
        </div>
        <div>
          <span className="text-[rgb(var(--color-muted-foreground))]">
            Type:
          </span>{" "}
          {asset.type}
        </div>
        <div className="truncate" title={asset.path}>
          <span className="text-[rgb(var(--color-muted-foreground))]">
            Path:
          </span>{" "}
          {asset.path}
        </div>
      </div>
      <Popover.Arrow className="fill-[rgb(var(--color-bg))]" />
    </Popover.Content>
  );
}
