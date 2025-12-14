import { useEffect, useCallback } from "react";
import type {
  MediaSpawnerEventName,
  MediaSpawnerEventMap,
} from "../types/events";
import { MediaSpawnerEvents } from "../types/events";

/**
 * Type-safe hook for subscribing to MediaSpawner events
 *
 * @param eventName - The event name to listen for (type-safe)
 * @param handler - Handler function that receives the typed event
 * @param deps - Dependency array for the handler (defaults to empty array)
 *
 * @example
 * ```tsx
 * useMediaSpawnerEvent(
 *   MediaSpawnerEvents.SPAWN_UPDATED,
 *   (event) => {
 *     if (event.detail.spawnId === selectedSpawnId) void load();
 *   },
 *   [selectedSpawnId],
 * );
 * ```
 */
export function useMediaSpawnerEvent<E extends MediaSpawnerEventName>(
  eventName: E,
  handler: (event: MediaSpawnerEventMap[E]) => void,
  deps: React.DependencyList = [],
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableHandler = useCallback(handler, deps);

  useEffect(() => {
    window.addEventListener(eventName, stableHandler as EventListener);
    return () => {
      window.removeEventListener(eventName, stableHandler as EventListener);
    };
  }, [eventName, stableHandler]);
}

/**
 * Helper to dispatch typed MediaSpawner events
 *
 * @param eventName - The event name to dispatch (type-safe)
 * @param detail - The event detail payload (type-safe based on event name)
 *
 * @example
 * ```tsx
 * dispatchMediaSpawnerEvent(MediaSpawnerEvents.SPAWN_UPDATED, {
 *   spawnId: spawn.id,
 *   updatedSpawn: spawn,
 * });
 * ```
 */
export function dispatchMediaSpawnerEvent<E extends MediaSpawnerEventName>(
  eventName: E,
  detail: MediaSpawnerEventMap[E] extends CustomEvent<infer D> ? D : never,
): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export { MediaSpawnerEvents };
