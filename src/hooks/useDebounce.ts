import { useEffect, useState } from "react";

/**
 * Hook that debounces a value, delaying its update until after a specified delay
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 150ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 150): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
