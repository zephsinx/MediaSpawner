import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Streamer.bot services globally to prevent connection attempts and logs during tests
vi.mock("./services/streamerbotService", () => ({
  StreamerbotService: {
    subscribeToSyncStatus: vi.fn(() => () => {}),
    pushConfiguration: vi.fn(() => Promise.resolve({ success: true })),
    checkConfigSyncStatus: vi.fn(() =>
      Promise.resolve({ success: true, statusInfo: { status: "synced" } }),
    ),
  },
}));

// Mock useStreamerbotStatus hook globally
vi.mock("./hooks/useStreamerbotStatus", () => ({
  useStreamerbotStatus: vi.fn(() => ({
    state: "connected",
    host: "localhost",
    port: 8080,
    errorMessage: undefined,
  })),
}));

// Polyfill ResizeObserver for Headless UI components in JSDOM
class ResizeObserverPolyfill {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || ResizeObserverPolyfill;
