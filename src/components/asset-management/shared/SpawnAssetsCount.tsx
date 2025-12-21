import { useEffect, useState } from "react";
import { usePanelState } from "../../../hooks/useLayout";
import { SpawnService } from "../../../services/spawnService";
import {
  MediaSpawnerEvents,
  useMediaSpawnerEvent,
} from "../../../hooks/useMediaSpawnerEvent";

/**
 * Displays the count of assets in the currently selected spawn.
 * Shows draft count when there are unsaved changes.
 */
export function SpawnAssetsCount() {
  const { selectedSpawnId } = usePanelState();
  const [savedCount, setSavedCount] = useState<number>(0);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!selectedSpawnId) {
        setSavedCount(0);
        return;
      }
      const s = await SpawnService.getSpawn(selectedSpawnId);
      setSavedCount(s?.assets.length ?? 0);
    };
    void load();
  }, [selectedSpawnId]);

  useMediaSpawnerEvent(
    MediaSpawnerEvents.SPAWN_UPDATED,
    (event) => {
      if (event.detail.spawnId === selectedSpawnId) {
        const load = async () => {
          const s = await SpawnService.getSpawn(selectedSpawnId);
          setSavedCount(s?.assets.length ?? 0);
        };
        void load();
      }
    },
    [selectedSpawnId],
  );

  useMediaSpawnerEvent(
    MediaSpawnerEvents.DRAFT_ASSET_COUNT_CHANGED,
    (event) => {
      const detail = event.detail;
      if (detail.spawnId === selectedSpawnId) {
        setDraftCount(detail.isDraft ? detail.count : null);
      }
    },
    [selectedSpawnId],
  );

  const displayCount = draftCount !== null ? draftCount : savedCount;

  return (
    <span className="ml-2 text-[rgb(var(--color-muted-foreground))]">
      ({displayCount})
    </span>
  );
}
