import {
  StreamerbotClient,
  type StreamerbotClientOptions,
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
