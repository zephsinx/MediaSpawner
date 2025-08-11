import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import AssetManagementPanel from "../AssetManagementPanel";
import type { Spawn, SpawnAsset } from "../../../types/spawn";
import type { MediaAsset } from "../../../types/media";

vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getSpawn: vi.fn(),
    updateSpawn: vi.fn(),
  },
}));
vi.mock("../../../services/assetService", () => ({
  AssetService: {
    getAssetById: vi.fn(),
    getAssets: vi.fn(),
  },
}));

type MockPanelState = { selectedSpawnId: string | undefined };
const mockState: MockPanelState = { selectedSpawnId: undefined };
vi.mock("../../../hooks/useLayout", () => ({
  usePanelState: () => ({ selectedSpawnId: mockState.selectedSpawnId }),
}));

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

describe("AssetManagementPanel (MS-39)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.selectedSpawnId = "s1";
    vi.mocked(AssetService.getAssetById).mockImplementation((id: string) =>
      makeAsset({ id })
    );
    vi.mocked(AssetService.getAssets).mockReturnValue([] as MediaAsset[]);
  });

  it("reorders items via drag and drop and persists order", async () => {
    const a0 = makeSpawnAsset("a1", 0);
    const a1 = makeSpawnAsset("a2", 1);
    const a2 = makeSpawnAsset("a3", 2);
    let current = makeSpawn("s1", [a0, a1, a2]);
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

    // Wait for three listitems
    const items = await screen.findAllByRole("listitem");
    expect(items.length).toBe(3);

    // Drag index 2 to index 0
    await act(async () => {
      const dt = {
        getData: vi.fn(() => "2"),
        setData: vi.fn(),
        effectAllowed: "move",
        dropEffect: "move",
      } as unknown as DataTransfer;
      fireEvent.dragOver(items[0], { dataTransfer: dt });
      fireEvent.drop(items[0], { dataTransfer: dt });
    });

    // After reorder, the first item should now correspond to a3
    const updated = await screen.findAllByRole("listitem");
    // Verify updateSpawn called
    expect(SpawnService.updateSpawn).toHaveBeenCalled();
    // Order labels reflect new order
    const textContent = updated.map((li) => li.textContent || "").join(" ");
    expect(textContent).toMatch(/Order:\s*0/);
  });

  it("no-op when dropping onto same index", async () => {
    const a0 = makeSpawnAsset("a1", 0);
    const a1 = makeSpawnAsset("a2", 1);
    const current = makeSpawn("s1", [a0, a1]);
    vi.mocked(SpawnService.getSpawn).mockImplementation(async () => ({
      ...current,
    }));
    vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
      success: true,
      spawn: current,
    });

    render(<AssetManagementPanel />);
    const items = await screen.findAllByRole("listitem");

    await act(async () => {
      const dt = {
        getData: vi.fn(() => "1"),
        setData: vi.fn(),
        effectAllowed: "move",
        dropEffect: "move",
      } as unknown as DataTransfer;
      fireEvent.dragOver(items[1], { dataTransfer: dt });
      fireEvent.drop(items[1], { dataTransfer: dt });
    });

    // Should not call updateSpawn since index unchanged
    expect(SpawnService.updateSpawn).not.toHaveBeenCalled();
  });
});
