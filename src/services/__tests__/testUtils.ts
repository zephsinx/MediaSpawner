import { vi } from "vitest";

/**
 * Mock interface for localStorage in tests
 */
export interface LocalStorageMock {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
}

/**
 * Create a localStorage mock with all methods mocked
 */
export const createLocalStorageMock = (): LocalStorageMock => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
});

/**
 * Setup localStorage mock on the window object
 */
export const setupLocalStorageMock = (mock: LocalStorageMock) => {
  Object.defineProperty(window, "localStorage", {
    value: mock,
    writable: true,
  });
};

/**
 * Helper to get typed localStorage mock from window
 */
export const getLocalStorageMock = (): LocalStorageMock => {
  return window.localStorage as unknown as LocalStorageMock;
};

/**
 * Reset all localStorage mock functions
 */
export const resetLocalStorageMock = (mock: LocalStorageMock) => {
  mock.getItem.mockReset();
  mock.setItem.mockReset();
  mock.removeItem.mockReset();
};
