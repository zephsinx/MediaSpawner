import { useState } from "react";
import { AssetService } from "../../../services/assetService";
import {
  MediaSpawnerEvents,
  useMediaSpawnerEvent,
} from "../../../hooks/useMediaSpawnerEvent";

/**
 * Displays the count of assets in the global asset library.
 */
export function AssetLibraryCount() {
  const [count, setCount] = useState<number>(AssetService.getAssets().length);

  useMediaSpawnerEvent(MediaSpawnerEvents.ASSETS_UPDATED, () => {
    setCount(AssetService.getAssets().length);
  });

  return (
    <span className="ml-2 text-[rgb(var(--color-muted-foreground))]">
      ({count})
    </span>
  );
}
