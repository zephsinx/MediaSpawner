import { useCallback, useEffect, useRef, useState } from "react";
import { useStreamerbotStatus } from "./useStreamerbotStatus";
import { StreamerbotService } from "../services/streamerbotService";
import type { StreamerbotCommand } from "@streamerbot/client";

export interface UseStreamerbotCommandsResult {
  commands: StreamerbotCommand[];
  loading: boolean;
  error?: string;
  refresh: () => void;
}

export function useStreamerbotCommands(): UseStreamerbotCommandsResult {
  const { state } = useStreamerbotStatus();
  const [commands, setCommands] = useState<StreamerbotCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const inFlight = useRef(false);

  const fetchCommands = useCallback(
    async (forceRefresh: boolean) => {
      if (inFlight.current) return;
      if (state !== "connected") {
        setCommands([]);
        setLoading(false);
        setError(undefined);
        return;
      }
      inFlight.current = true;
      setLoading(true);
      setError(undefined);
      try {
        const data = await StreamerbotService.getCommands({ forceRefresh });
        setCommands(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch commands");
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [state]
  );

  useEffect(() => {
    // Fetch on connect
    if (state === "connected") {
      fetchCommands(false);
    } else {
      setCommands([]);
    }
  }, [state, fetchCommands]);

  const refresh = useCallback(() => {
    void fetchCommands(true);
  }, [fetchCommands]);

  return { commands, loading, error, refresh };
}
