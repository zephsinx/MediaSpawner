import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { vi } from "vitest";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { Spawn } from "../../../types/spawn";

/**
 * Mock spawn data for testing
 */
export const createMockSpawn = (overrides: Partial<Spawn> = {}): Spawn => ({
  id: "spawn-1",
  name: "Test Spawn",
  description: "A test spawn for testing",
  enabled: true,
  trigger: {
    enabled: true,
    type: "manual",
    config: {},
  },
  duration: 0,
  assets: [],
  lastModified: Date.now(),
  order: 0,
  ...overrides,
});

/**
 * Mock spawns with different states
 */
export const mockSpawns: Spawn[] = [
  createMockSpawn({
    id: "spawn-1",
    name: "Enabled Spawn",
    description: "An enabled spawn",
    enabled: true,
    assets: [],
  }),
  createMockSpawn({
    id: "spawn-2",
    name: "Disabled Spawn",
    description: "A disabled spawn",
    enabled: false,
    assets: [],
  }),
  createMockSpawn({
    id: "spawn-3",
    name: "Spawn with Assets",
    description: "A spawn with assets",
    enabled: true,
    assets: [
      {
        id: "asset-1",
        assetId: "asset-1",
        enabled: true,
        order: 0,
        overrides: {},
      },
      {
        id: "asset-2",
        assetId: "asset-2",
        enabled: true,
        order: 1,
        overrides: {},
      },
    ],
  }),
  createMockSpawn({
    id: "spawn-4",
    name: "Spawn without Description",
    description: undefined,
    enabled: true,
    assets: [],
  }),
];

/**
 * Custom render function for spawn list components with TooltipProvider
 */
export const renderSpawnList = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Tooltip.Provider>{children}</Tooltip.Provider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

/**
 * Helper to create a mock SpawnService
 */
export const createMockSpawnService = () => ({
  getAllSpawns: vi.fn(),
});
