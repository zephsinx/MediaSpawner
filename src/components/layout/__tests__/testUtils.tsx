import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { vi } from "vitest";
import { LayoutProvider } from "../LayoutContext";

/**
 * Custom render function that wraps components with LayoutProvider
 */
export const renderWithLayoutProvider = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <LayoutProvider>{children}</LayoutProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

/**
 * Mock localStorage for layout context tests
 */
export const mockLocalStorage = () => {
  const mock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  Object.defineProperty(window, "localStorage", {
    value: mock,
    writable: true,
  });

  return mock;
};
