import { useEffect, useState } from "react";
import {
  StreamerbotService,
  type StreamerbotConnectionStatus,
} from "../services/streamerbotService";

export function useStreamerbotStatus(): StreamerbotConnectionStatus {
  const [status, setStatus] = useState<StreamerbotConnectionStatus>(
    StreamerbotService.getStatus(),
  );

  useEffect(() => {
    StreamerbotService.connectIfNeeded();
    const unsubscribe = StreamerbotService.subscribe(setStatus);
    return () => unsubscribe();
  }, []);

  return status;
}
