import {
  StreamerbotClient,
  type StreamerbotClientOptions,
  type StreamerbotCommand,
} from "@streamerbot/client";

export type StreamerbotConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface StreamerbotConnectionStatus {
  state: StreamerbotConnectionState;
  host: string;
  port: number;
  endpoint: string;
  errorMessage?: string;
}

type StatusListener = (status: StreamerbotConnectionStatus) => void;

export class StreamerbotService {
  private static client: StreamerbotClient | undefined;
  private static listeners = new Set<StatusListener>();
  private static status: StreamerbotConnectionStatus = {
    state: "connecting",
    host: "127.0.0.1",
    port: 8080,
    endpoint: "/",
  };
  private static commandsCache:
    | { at: number; data: StreamerbotCommand[] }
    | undefined;

  static getStatus(): StreamerbotConnectionStatus {
    return { ...this.status };
  }

  static subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  static connectIfNeeded(): void {
    if (this.client) {
      return;
    }

    const options: Partial<StreamerbotClientOptions> = {
      host: this.status.host,
      port: this.status.port,
      endpoint: this.status.endpoint,
      immediate: true,
      autoReconnect: true,
      retries: -1,
      logLevel: "none",
      onConnect: () => {
        this.updateStatus({ state: "connected", errorMessage: undefined });
      },
      onDisconnect: () => {
        this.updateStatus({ state: "disconnected" });
      },
      onError: (error) => {
        this.updateStatus({ state: "error", errorMessage: error.message });
      },
    };

    this.updateStatus({ state: "connecting" });
    this.client = new StreamerbotClient(options);
  }

  static async getCommands(opts?: {
    forceRefresh?: boolean;
    cacheMs?: number;
  }): Promise<StreamerbotCommand[]> {
    const forceRefresh = opts?.forceRefresh === true;
    const cacheMs =
      typeof opts?.cacheMs === "number" ? opts!.cacheMs : 2 * 60 * 1000;

    if (this.status.state !== "connected" || !this.client) {
      return [];
    }

    if (!forceRefresh && this.commandsCache) {
      const fresh = Date.now() - this.commandsCache.at < cacheMs;
      if (fresh) {
        return this.commandsCache.data;
      }
    }

    try {
      const res = await this.client.getCommands();
      const data = Array.isArray(res?.commands) ? res.commands : [];
      this.commandsCache = { at: Date.now(), data };
      return data;
    } catch {
      return [];
    }
  }

  private static lastNotifyAt = 0;
  private static updateStatus(
    update: Partial<StreamerbotConnectionStatus>
  ): void {
    const prev = this.status;
    const next: StreamerbotConnectionStatus = { ...prev, ...update };

    const sameState = prev.state === next.state;
    const sameError = prev.errorMessage === next.errorMessage;

    const now = Date.now();
    const throttleMs = 10000;
    const shouldThrottle =
      (next.state === "error" || next.state === "disconnected") &&
      sameState &&
      sameError &&
      now - this.lastNotifyAt < throttleMs;

    this.status = next;
    if (shouldThrottle) {
      return;
    }
    this.lastNotifyAt = now;
    this.listeners.forEach((fn) => fn(this.getStatus()));
  }
}
