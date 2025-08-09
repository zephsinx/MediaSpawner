export type DeepEqualOptions = {
  ignoreKeys?: Set<string>;
};

export function deepEqual(
  a: unknown,
  b: unknown,
  options: DeepEqualOptions = {}
): boolean {
  const { ignoreKeys } = options;

  if (Object.is(a, b)) return true;

  if (typeof a !== typeof b) return false;

  if (a === null || b === null) return a === b;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== (b as unknown[]).length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], (b as unknown[])[i], options)) return false;
    }
    return true;
  }

  if (typeof a === "object") {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;

    const keysA = Object.keys(objA).filter(
      (k) => !(ignoreKeys && ignoreKeys.has(k))
    );
    const keysB = Object.keys(objB).filter(
      (k) => !(ignoreKeys && ignoreKeys.has(k))
    );

    if (keysA.length !== keysB.length) return false;
    // Compare keys set equality regardless of order
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
    }
    for (const key of keysA) {
      if (!deepEqual(objA[key], objB[key], options)) return false;
    }
    return true;
  }

  // For number/string/boolean/undefined/symbol/bigint
  return Object.is(a, b);
}
