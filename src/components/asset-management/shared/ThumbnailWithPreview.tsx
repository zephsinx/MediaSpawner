import { useState } from "react";
import type { MediaAsset } from "../../../types/media";
import { MediaPreview } from "../../common/MediaPreview";
import * as Popover from "@radix-ui/react-popover";
import { AssetPopoverContent } from "./AssetPopoverContent";

interface ThumbnailWithPreviewProps {
  asset: MediaAsset;
}

/**
 * Renders a small thumbnail that shows a larger preview popover on hover (for URL assets).
 * Local assets show the thumbnail without hover preview.
 */
export function ThumbnailWithPreview({ asset }: ThumbnailWithPreviewProps) {
  const [open, setOpen] = useState(false);

  if (!asset.isUrl) {
    return (
      <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded">
        <MediaPreview
          asset={asset}
          className="h-full"
          fit="contain"
          size="small"
        />
      </div>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <div
          className="w-10 h-10 flex-shrink-0 overflow-hidden rounded"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <MediaPreview
            asset={asset}
            className="h-full"
            fit="contain"
            size="small"
          />
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <AssetPopoverContent asset={asset} />
      </Popover.Portal>
    </Popover.Root>
  );
}
