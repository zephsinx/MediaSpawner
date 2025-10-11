import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 100));
    expect(result.current).toBe("initial");
  });

  it("should debounce value updates", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 100 },
      },
    );

    expect(result.current).toBe("initial");

    // Change value
    rerender({ value: "updated", delay: 100 });
    expect(result.current).toBe("initial"); // Should still be initial

    // Fast-forward time by 50ms
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe("initial"); // Should still be initial

    // Fast-forward time by another 50ms (total 100ms)
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe("updated"); // Should now be updated
  });

  it("should reset timer on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 100 },
      },
    );

    expect(result.current).toBe("initial");

    // Rapid changes
    rerender({ value: "change1", delay: 100 });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ value: "change2", delay: 100 });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ value: "change3", delay: 100 });

    expect(result.current).toBe("initial"); // Should still be initial

    // Complete the debounce
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("change3"); // Should be the last value
  });

  it("should work with different delay values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 200 },
      },
    );

    expect(result.current).toBe("initial");

    rerender({ value: "updated", delay: 200 });
    expect(result.current).toBe("initial");

    // Should not update after 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("initial");

    // Should update after 200ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("updated");
  });

  it("should work with different value types", () => {
    // Test with number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } },
    );

    expect(numberResult.current).toBe(0);
    numberRerender({ value: 42 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(numberResult.current).toBe(42);

    // Test with boolean
    const { result: boolResult, rerender: boolRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: false } },
    );

    expect(boolResult.current).toBe(false);
    boolRerender({ value: true });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(boolResult.current).toBe(true);

    // Test with object
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { id: 1, name: "test" } } },
    );

    expect(objResult.current).toEqual({ id: 1, name: "test" });
    objRerender({ value: { id: 2, name: "updated" } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(objResult.current).toEqual({ id: 2, name: "updated" });
  });

  it("should use default delay of 150ms", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "initial" },
    });

    expect(result.current).toBe("initial");

    rerender({ value: "updated" });
    expect(result.current).toBe("initial");

    // Should not update after 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("initial");

    // Should update after 150ms
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe("updated");
  });

  it("should cleanup timeout on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const { unmount } = renderHook(() => useDebounce("test", 100));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("should cleanup previous timeout when value changes", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const { rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "updated" });
    rerender({ value: "updated2" });

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2); // Once for each change
    clearTimeoutSpy.mockRestore();
  });
});
