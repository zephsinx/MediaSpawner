import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import AssetManagementPanel from "../AssetManagementPanel";
import type { Spawn, SpawnAsset } from "../../../types/spawn";
import type { MediaAsset } from "../../../types/media";

// Mock services used by the panel
vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getSpawn: vi.fn(),
  },
}));
vi.mock("../../../services/assetService", () => ({
  AssetService: {
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

function makeAsset(
  id: string,
  type: MediaAsset["type"],
  name?: string,
  isUrl = true
): MediaAsset {
  return {
    id,
    type,
    name: name || id,
    path: isUrl ? `https://example.com/${id}` : `C:/media/${id}`,
    isUrl,
    properties: {},
  } as MediaAsset;
}

describe("AssetManagementPanel (MS-33)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.selectedSpawnId = undefined;
  });

  it("shows empty state when no spawn is selected", () => {
    mockState.selectedSpawnId = undefined;
    render(<AssetManagementPanel />);
    expect(screen.getByText("Assets in Current Spawn")).toBeInTheDocument();
    expect(
      screen.getByText("Select a spawn to see its assets")
    ).toBeInTheDocument();
  });

  it("shows loading state while spawn assets are loading", async () => {
    mockState.selectedSpawnId = "s1";
    vi.mocked(SpawnService.getSpawn).mockImplementation(
      // Never resolve to keep loading state
      () => new Promise(() => {})
    );

    render(<AssetManagementPanel />);
    expect(await screen.findByText("Loading assets…")).toBeInTheDocument();
  });

  it("shows empty state and count (0) when spawn has no assets", async () => {
    mockState.selectedSpawnId = "s1";
    vi.mocked(SpawnService.getSpawn).mockResolvedValueOnce(makeSpawn("s1", []));

    render(<AssetManagementPanel />);
    expect(
      await screen.findByText("No assets assigned to this spawn")
    ).toBeInTheDocument();
    expect(screen.getByText("Assets in Current Spawn")).toBeInTheDocument();
    expect(screen.getByText("(0)")).toBeInTheDocument();
  });

  it("renders assets sorted by order with name and type", async () => {
    mockState.selectedSpawnId = "s1";
    const assets = [
      makeSpawnAsset("a3", 2),
      makeSpawnAsset("a1", 0),
      makeSpawnAsset("a2", 1),
    ];
    vi.mocked(SpawnService.getSpawn).mockResolvedValueOnce(
      makeSpawn("s1", assets)
    );
    vi.mocked(AssetService.getAssetById).mockImplementation((id: string) => {
      if (id === "a1") return makeAsset("a1", "image", "First");
      if (id === "a2") return makeAsset("a2", "video", "Second");
      if (id === "a3") return makeAsset("a3", "audio", "Third");
      return undefined as unknown as MediaAsset;
    });

    render(<AssetManagementPanel />);

    const items = await screen.findAllByRole("listitem");
    const names = items.map((li) =>
      li.querySelector(".text-sm.font-medium")?.textContent?.trim()
    );
    expect(names).toEqual(["First", "Second", "Third"]);

    // Type badges visible
    expect(screen.getByText("image")).toBeInTheDocument();
    expect(screen.getByText("video")).toBeInTheDocument();
    expect(screen.getByText("audio")).toBeInTheDocument();
  });

  it("updates when selection changes (header count reflects selection)", async () => {
    const aAssets = [makeSpawnAsset("a1", 0)];
    const bAssets = [makeSpawnAsset("b1", 0), makeSpawnAsset("b2", 1)];
    vi.mocked(SpawnService.getSpawn).mockImplementation(async (id: string) => {
      if (id === "A") return makeSpawn("A", aAssets);
      if (id === "B") return makeSpawn("B", bAssets);
      return makeSpawn(id, []);
    });
    vi.mocked(AssetService.getAssetById).mockReturnValue(
      makeAsset("x", "image")
    );

    mockState.selectedSpawnId = "A";
    const view = render(<AssetManagementPanel />);
    expect(await screen.findByText("(1)")).toBeInTheDocument();

    mockState.selectedSpawnId = "B";
    await act(async () => {
      view.rerender(<AssetManagementPanel />);
    });
    expect(await screen.findByText("(2)")).toBeInTheDocument();
  });
});
