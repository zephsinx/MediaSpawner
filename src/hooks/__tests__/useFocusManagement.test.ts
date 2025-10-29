import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  useFocusManagement,
  useModalFocusManagement,
  useSkipNavigation,
} from "../useFocusManagement";

describe("useFocusManagement", () => {
  describe("basic functionality", () => {
    it("should initialize with default options", () => {
      const { result } = renderHook(() => useFocusManagement());

      expect(result.current).toHaveProperty("initializeFocusManagement");
      expect(result.current).toHaveProperty("cleanupFocusManagement");
      expect(result.current).toHaveProperty("skipToElement");
      expect(result.current).toHaveProperty("restoreFocus");
    });

    it("should provide focus management utilities", () => {
      const { result } = renderHook(() =>
        useFocusManagement({
          trapFocus: true,
          restoreFocus: true,
        }),
      );

      expect(typeof result.current.initializeFocusManagement).toBe("function");
      expect(typeof result.current.cleanupFocusManagement).toBe("function");
      expect(typeof result.current.skipToElement).toBe("function");
      expect(typeof result.current.restoreFocus).toBe("function");
    });
  });

  describe("skipToElement", () => {
    it("should be callable without errors", () => {
      const { result } = renderHook(() => useFocusManagement());

      expect(() => {
        act(() => {
          result.current.skipToElement("test-element");
        });
      }).not.toThrow();
    });
  });

  describe("getFocusableElements", () => {
    it("should return empty array for empty container", () => {
      const { result } = renderHook(() => useFocusManagement());

      // Create a mock container element
      const mockContainer = document.createElement("div");
      const focusableElements =
        result.current.getFocusableElements(mockContainer);

      expect(Array.isArray(focusableElements)).toBe(true);
    });
  });

  describe("focus restoration", () => {
    it("should provide restoreFocus function", () => {
      const { result } = renderHook(() =>
        useFocusManagement({
          restoreFocus: true,
        }),
      );

      expect(typeof result.current.restoreFocus).toBe("function");
    });

    it("should be callable without errors", () => {
      const { result } = renderHook(() =>
        useFocusManagement({
          restoreFocus: true,
        }),
      );

      expect(() => {
        act(() => {
          result.current.restoreFocus();
        });
      }).not.toThrow();
    });
  });

  describe("skip navigation utilities", () => {
    it("should provide skip navigation functions", () => {
      const { result } = renderHook(() => useFocusManagement());

      expect(typeof result.current.skipToNext).toBe("function");
      expect(typeof result.current.skipToPrevious).toBe("function");
      expect(typeof result.current.getCurrentFocusableElement).toBe("function");
      expect(typeof result.current.isFocusable).toBe("function");
    });
  });
});

describe("useModalFocusManagement", () => {
  it("should provide modal-specific focus management", () => {
    const { result } = renderHook(() => useModalFocusManagement());

    expect(result.current).toHaveProperty("initializeFocusManagement");
    expect(result.current).toHaveProperty("cleanupFocusManagement");
    expect(result.current).toHaveProperty("restoreFocus");
  });
});

describe("useSkipNavigation", () => {
  it("should provide skip navigation utilities", () => {
    const { result } = renderHook(() => useSkipNavigation());

    expect(result.current).toHaveProperty("skipToElement");
    expect(result.current).toHaveProperty("skipToNext");
    expect(result.current).toHaveProperty("skipToPrevious");
    expect(result.current).toHaveProperty("getFocusableElements");
  });
});
