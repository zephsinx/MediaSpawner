import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import AssetManagementPanel from "../AssetManagementPanel";
import type { Spawn, SpawnAsset } from "../../../types/spawn";
import type { MediaAsset } from "../../../types/media";

// Mock services used by the panel
vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getSpawn: vi.fn(),
    updateSpawn: vi.fn(),
  },
}));
vi.mock("../../../services/assetService", () => ({
  AssetService: {
    getAssets: vi.fn(),
    getAssetById: vi.fn(),
  },
}));

// Controlled mock for usePanelState
type MockPanelState = { selectedSpawnId: string | undefined };
const mockState: MockPanelState = { selectedSpawnId: undefined };
vi.mock("../../../hooks/useLayout", () => ({
  usePanelState: () => ({
    selectedSpawnId: mockState.selectedSpawnId,
  }),
}));

// Imports after mocks
import { SpawnService } from "../../../services/spawnService";
import { AssetService } from "../../../services/assetService";

function makeSpawn(id: string, assets: SpawnAsset[]): Spawn {
  return {
    id,
    name: id,
    description: undefined,
    enabled: true,
    trigger: {
      enabled: true,
      type: "manual",
      config: { type: "manual" },
      priority: 0,
    },
    duration: 5000,
    assets,
    lastModified: Date.now(),
    order: 0,
  };
}

function makeSpawnAsset(assetId: string, order: number): SpawnAsset {
  return {
    id: `${assetId}-${order}`,
    assetId,
    overrides: {},
    enabled: true,
    order,
  };
}

const makeAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
  id: overrides.id || Math.random().toString(36).slice(2),
  type: overrides.type || "image",
  name: overrides.name || "Sample",
  path: overrides.path || "https://example.com/sample.png",
  isUrl: overrides.isUrl ?? true,
  properties: overrides.properties || {},
});

describe("AssetManagementPanel (MS-36)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.selectedSpawnId = "s1";
    vi.mocked(AssetService.getAssetById).mockImplementation((id: string) =>
      makeAsset({ id })
    );
  });

  it("assigns asset by drag and drop and highlights drop zone", async () => {
    // Library with one asset and spawn initially empty
    vi.mocked(AssetService.getAssets).mockReturnValue([
      makeAsset({ id: "a1" }),
    ]);
    let current = makeSpawn("s1", []);
    vi.mocked(SpawnService.getSpawn).mockImplementation(async () => ({
      ...current,
    }));
    vi.mocked(SpawnService.updateSpawn).mockImplementation(
      async (_id, updates) => {
        current = {
          ...current,
          assets: (updates.assets as SpawnAsset[]) ?? current.assets,
        };
        return { success: true, spawn: { ...current } };
      }
    );

    render(<AssetManagementPanel />);

    const libraryItem = await screen.findByRole("listitem");
    const spawnRegion = await screen.findByLabelText("Assets in Current Spawn");

    // Drag enter highlights
    await act(async () => {
      const dragEnter = new Event("dragenter", {
        bubbles: true,
        cancelable: true,
      });
      (dragEnter as unknown as { dataTransfer: unknown }).dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn(() => "a1"),
        dropEffect: "copy",
        effectAllowed: "copy",
      } as unknown;
      spawnRegion.dispatchEvent(dragEnter);
    });

    // Expect highlight style applied
    expect(spawnRegion.className).toMatch(/ring-2|bg-blue-50/);

    // Perform drop with payload set
    await act(async () => {
      const dropEvt = new Event("drop", { bubbles: true, cancelable: true });
      (dropEvt as unknown as { dataTransfer: unknown }).dataTransfer = {
        getData: vi.fn(() => "a1"),
      } as unknown;
      spawnRegion.dispatchEvent(dropEvt);
    });

    // Count should increment to (1)
    const topHeader = (await screen.findByLabelText("Assets in Current Spawn"))
      .previousElementSibling as HTMLElement | null;
    expect(topHeader?.textContent || "").toMatch(/\(1\)/);
    expect(SpawnService.updateSpawn).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate assignment on drop", async () => {
    vi.mocked(AssetService.getAssets).mockReturnValue([
      makeAsset({ id: "a1" }),
    ]);
    let current = makeSpawn("s1", [makeSpawnAsset("a1", 0)]);
    vi.mocked(SpawnService.getSpawn).mockImplementation(async () => ({
      ...current,
    }));
    vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
      success: true,
      spawn: { ...current },
    });

    render(<AssetManagementPanel />);

    const spawnRegion = await screen.findByLabelText("Assets in Current Spawn");

    await act(async () => {
      const dropEvt = new Event("drop", { bubbles: true, cancelable: true });
      (dropEvt as unknown as { dataTransfer: unknown }).dataTransfer = {
        getData: vi.fn(() => "a1"),
      } as unknown;
      spawnRegion.dispatchEvent(dropEvt);
    });

    expect(SpawnService.updateSpawn).not.toHaveBeenCalled();
  });
});
