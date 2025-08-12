import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
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

describe("AssetLibrarySection (MS-37)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.selectedSpawnId = undefined;
    // Default resolver for getAssetById to prevent crashes in SpawnAssetsSection
    vi.mocked(AssetService.getAssetById).mockImplementation((id: string) =>
      makeAsset({ id })
    );
  });

  it("disables Add to Spawn when no spawn is selected", () => {
    vi.mocked(AssetService.getAssets).mockReturnValue([
      makeAsset({ id: "a1" }),
    ]);

    render(<AssetManagementPanel />);

    const addBtn = screen.getByRole("button", { name: "Add to Spawn" });
    expect(addBtn).toBeDisabled();
  });

  it("adds library asset to selected spawn and updates top section count", async () => {
    mockState.selectedSpawnId = "s1";
    vi.mocked(AssetService.getAssets).mockReturnValue([
      makeAsset({ id: "a1" }),
    ]);

    // In-memory spawn state
    let currentSpawn = makeSpawn("s1", []);
    vi.mocked(SpawnService.getSpawn).mockImplementation(async (id: string) => {
      if (id === "s1") return { ...currentSpawn };
      return makeSpawn(id, []);
    });
    vi.mocked(SpawnService.updateSpawn).mockImplementation(
      async (_id: string, updates: Partial<Pick<Spawn, "assets">>) => {
        currentSpawn = {
          ...currentSpawn,
          assets: updates.assets || currentSpawn.assets,
        };
        return { success: true, spawn: { ...currentSpawn } };
      }
    );

    render(<AssetManagementPanel />);

    const addBtn = screen.getByRole("button", { name: "Add to Spawn" });
    await act(async () => {
      addBtn.click();
    });

    // Count in "Assets in Current Spawn" header should become (1)
    // Scope to the top section header to avoid matching the library count
    const region = await screen.findByLabelText("Assets in Current Spawn");
    await act(async () => {
      // allow microtasks to flush
    });
    await new Promise((r) => setTimeout(r, 0));
    const topHeader = region.previousElementSibling as HTMLElement | null;
    expect(topHeader?.textContent || "").toMatch(/\(1\)/);
    expect(SpawnService.updateSpawn).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate assignment and shows an error", async () => {
    mockState.selectedSpawnId = "s1";
    vi.mocked(AssetService.getAssets).mockReturnValue([
      makeAsset({ id: "a1" }),
    ]);

    // Spawn already contains a1
    const existing = makeSpawnAsset("a1", 0);
    const currentSpawn = makeSpawn("s1", [existing]);
    vi.mocked(SpawnService.getSpawn).mockResolvedValue(currentSpawn);
    vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
      success: true,
      spawn: currentSpawn,
    });

    render(<AssetManagementPanel />);

    const addBtn = screen.getByRole("button", { name: "Add to Spawn" });
    await act(async () => {
      addBtn.click();
    });

    // Should not call updateSpawn since it's duplicate
    expect(SpawnService.updateSpawn).not.toHaveBeenCalled();
    // Error message visible
    const alert = await screen.findByRole("alert");
    expect(alert.textContent || "").toMatch(/already exists/i);
  });
});
