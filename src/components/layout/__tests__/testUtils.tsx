import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import * as Tooltip from "@radix-ui/react-tooltip";
import { LayoutProvider } from "../LayoutContext";

/**
 * Custom render function that wraps components with LayoutProvider
 */
export const renderWithLayoutProvider = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <LayoutProvider>{children}</LayoutProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

/**
 * Custom render function that wraps components with all required providers
 * Includes MemoryRouter for Router context, LayoutProvider for layout state,
 * and Tooltip.Provider for Radix UI tooltips
 */
export const renderWithAllProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <LayoutProvider>
        <Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
          {children}
        </Tooltip.Provider>
      </LayoutProvider>
    </MemoryRouter>
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
