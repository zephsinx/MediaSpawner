import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
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
    getAssetById: vi.fn(),
    getAssets: vi.fn(),
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

describe("AssetManagementPanel (MS-38)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.selectedSpawnId = "s1";
    vi.mocked(AssetService.getAssetById).mockImplementation((id: string) =>
      makeAsset({ id })
    );
    vi.mocked(AssetService.getAssets).mockReturnValue([] as MediaAsset[]);
  });

  it("renders remove control and requires confirmation; removes on confirm and updates count", async () => {
    const a0 = makeSpawnAsset("a1", 0);
    const a1 = makeSpawnAsset("a2", 1);
    let current = makeSpawn("s1", [a0, a1]);
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

    // Two assets shown with count (2)
    expect(await screen.findByText("(2)"));

    // Click first remove
    const removeBtn = await screen.findAllByRole("button", {
      name: "Remove from Spawn",
    });
    await act(async () => {
      removeBtn[0].click();
    });

    // Confirm dialog
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: /remove/i });
    await act(async () => {
      confirm.click();
    });

    // Count should be (1) and only one asset remains
    const topHeader = (await screen.findByLabelText("Assets in Current Spawn"))
      .previousElementSibling as HTMLElement | null;
    expect(topHeader?.textContent || "").toMatch(/\(1\)/);
    const items = await screen.findAllByRole("listitem");
    expect(items.length).toBe(1);
  });
});
