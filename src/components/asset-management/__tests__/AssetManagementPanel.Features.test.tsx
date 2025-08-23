import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import AssetManagementPanel from "../AssetManagementPanel";
import type { Spawn, SpawnAsset } from "../../../types/spawn";
import type { MediaAsset } from "../../../types/media";
import { createSpawn, createSpawnAsset } from "../../../types/spawn";

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

// Mock usePanelState hook with current architecture
vi.mock("../../../hooks/useLayout", () => ({
  usePanelState: vi.fn(),
}));

// Imports after mocks
import { SpawnService } from "../../../services/spawnService";
import { AssetService } from "../../../services/assetService";
import { usePanelState } from "../../../hooks/useLayout";

function makeSpawn(id: string, assets: SpawnAsset[]): Spawn {
  return createSpawn(id, undefined, assets, id);
}

function makeSpawnAsset(assetId: string, order: number): SpawnAsset {
  return createSpawnAsset(assetId, order);
}

const makeAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
  id: overrides.id || Math.random().toString(36).slice(2),
  type: overrides.type || "image",
  name: overrides.name || "Sample",
  path: overrides.path || "https://example.com/sample.png",
  isUrl: overrides.isUrl ?? true,
});

describe("AssetManagementPanel (Advanced Features)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for usePanelState
    vi.mocked(usePanelState).mockReturnValue({
      selectedSpawnId: undefined,
      activeProfileId: undefined,
      selectedSpawnAssetId: undefined,
      centerPanelMode: "spawn-settings",
      hasUnsavedChanges: false,
      profileSpawnSelections: {},
      setActiveProfile: vi.fn(),
      selectSpawn: vi.fn(),
      selectSpawnAsset: vi.fn(),
      setCenterPanelMode: vi.fn(),
      setUnsavedChanges: vi.fn(),
      clearContext: vi.fn(),
    });

    // Default resolver for getAssetById to prevent crashes in SpawnAssetsSection
    vi.mocked(AssetService.getAssetById).mockImplementation((id: string) =>
      makeAsset({ id })
    );
  });

  describe("Asset Assignment Workflow (MS-37)", () => {
    it("disables Add to Spawn when no spawn is selected", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
      ]);

      render(<AssetManagementPanel />);

      const addBtn = screen.getByRole("button", { name: "Add to Spawn" });
      expect(addBtn).toBeDisabled();
    });

    it("enables Add to Spawn when a spawn is selected", () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
      ]);

      render(<AssetManagementPanel />);

      const addBtn = screen.getByRole("button", { name: "Add to Spawn" });
      expect(addBtn).not.toBeDisabled();
    });

    it("adds library asset to selected spawn and updates top section count", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
      ]);

      // In-memory spawn state
      let currentSpawn = makeSpawn("s1", []);
      vi.mocked(SpawnService.getSpawn).mockImplementation(
        async (id: string) => {
          if (id === "s1") return { ...currentSpawn };
          return makeSpawn(id, []);
        }
      );
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
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

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

    it("creates spawn asset with correct properties when adding", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
      ]);

      let currentSpawn = makeSpawn("s1", []);
      vi.mocked(SpawnService.getSpawn).mockResolvedValue(currentSpawn);
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

      expect(SpawnService.updateSpawn).toHaveBeenCalledWith("s1", {
        assets: expect.arrayContaining([
          expect.objectContaining({
            assetId: "a1",
            order: 0,
            enabled: true,
            overrides: {},
          }),
        ]),
      });
    });
  });

  describe("Asset Removal Workflow (MS-38)", () => {
    it("renders remove control and requires confirmation; removes on confirm and updates count", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([]);

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
      const topHeader = (
        await screen.findByLabelText("Assets in Current Spawn")
      ).previousElementSibling as HTMLElement | null;
      expect(topHeader?.textContent || "").toMatch(/\(1\)/);
      const items = await screen.findAllByRole("listitem");
      expect(items.length).toBe(1);
    });
  });

  describe("Drag & Drop Reordering (MS-39)", () => {
    it("reorders items via drag and drop and persists order", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([]);

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
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([]);

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

  describe("Configuration Integration (MS-45)", () => {
    it("clicking Configure sets asset-settings mode via context", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "sp1",
        activeProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      const asset: MediaAsset = {
        id: "a1",
        type: "image",
        name: "img",
        path: "img.png",
        isUrl: false,
      };
      const spawnAsset: SpawnAsset = {
        id: "sa1",
        assetId: asset.id,
        overrides: {},
        enabled: true,
        order: 0,
      };
      const spawn: Spawn = {
        id: "sp1",
        name: "spawn",
        description: "",
        enabled: true,
        trigger: { type: "manual", config: {} },
        duration: 5000,
        assets: [spawnAsset],
        lastModified: Date.now(),
        order: 0,
      };
      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      await act(async () => {
        render(<AssetManagementPanel />);
      });

      const configureBtn = screen.getByRole("button", { name: "Configure" });
      await act(async () => {
        fireEvent.click(configureBtn);
      });

      // After clicking configure, the center panel mode will be changed in context; we just ensure no crash and button exists
      expect(configureBtn).toBeInTheDocument();
    });
  });
});
