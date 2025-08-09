import { describe, it, expect } from "vitest";
import { deepEqual } from "../deepEqual";

describe("deepEqual", () => {
  it("returns true for same reference via Object.is", () => {
    const obj = { a: 1 };
    expect(deepEqual(obj, obj)).toBe(true);
  });

  it("returns false for type mismatch", () => {
    expect(deepEqual(1, "1")).toBe(false);
  });

  it("handles nulls correctly", () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
  });

  it("compares arrays with length and element checks", () => {
    expect(deepEqual([1, 2], [1])).toBe(false);
    expect(deepEqual([1, 2], [1, 3])).toBe(false);
    expect(deepEqual([1, 2, [3, 4]], [1, 2, [3, 4]])).toBe(true);
  });

  it("returns false when one is array and the other is not", () => {
    expect(deepEqual([1, 2], { 0: 1, 1: 2, length: 2 })).toBe(false);
  });

  it("compares objects: key length mismatch and missing keys", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 3 } })).toBe(true);
    // keys set mismatch regardless of order
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
  });

  it("supports ignoreKeys for equality despite differences", () => {
    const a = { id: "1", name: "X", lastModified: 100, meta: { order: 1 } };
    const b = { id: "1", name: "X", lastModified: 200, meta: { order: 1 } };
    // Ignore lastModified so objects are equal
    expect(deepEqual(a, b, { ignoreKeys: new Set(["lastModified"]) })).toBe(
      true
    );

    // Ignore a key that exists only in one object; should still be equal
    const a2 = { id: "1", name: "X", temp: "t" } as const;
    const b2 = { id: "1", name: "X" } as const;
    expect(deepEqual(a2, b2, { ignoreKeys: new Set(["temp"]) })).toBe(true);
  });

  it("falls back to Object.is for primitives and symbols", () => {
    expect(deepEqual(10, 10)).toBe(true);
    expect(deepEqual(10, -10)).toBe(false);
    const s = Symbol("x");
    expect(deepEqual(s, s)).toBe(true);
    expect(deepEqual(Symbol("x"), Symbol("x"))).toBe(false);
  });
});
