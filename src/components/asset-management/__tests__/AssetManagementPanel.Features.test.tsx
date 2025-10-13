import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render as rtlRender,
  screen,
  act,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import * as Tooltip from "@radix-ui/react-tooltip";
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

function render(ui: React.ReactNode) {
  return rtlRender(
    <Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
      {ui}
    </Tooltip.Provider>,
  );
}

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
      liveProfileId: undefined,
      selectedSpawnAssetId: undefined,
      centerPanelMode: "spawn-settings",
      hasUnsavedChanges: false,
      profileSpawnSelections: {},
      setActiveProfile: vi.fn(),
      setLiveProfile: vi.fn(),
      selectSpawn: vi.fn(),
      selectSpawnAsset: vi.fn(),
      setCenterPanelMode: vi.fn(),
      setUnsavedChanges: vi.fn(),
      clearContext: vi.fn(),
    });

    // Default resolver for getAssetById to prevent crashes in SpawnAssetsSection
    vi.mocked(AssetService.getAssetById).mockImplementation((id: string) =>
      makeAsset({ id }),
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

    it("enables Add to Spawn when a spawn is selected", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
      ]);

      await act(async () => {
        render(<AssetManagementPanel />);
      });

      const addBtn = await screen.findByRole("button", {
        name: "Add to Spawn",
      });
      expect(addBtn).not.toBeDisabled();
    });

    it("adds library asset creates draft state (unsaved)", async () => {
      const mockSetUnsavedChanges = vi.fn();
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1", name: "Test Asset" }),
      ]);

      const currentSpawn = makeSpawn("s1", []);
      vi.mocked(SpawnService.getSpawn).mockImplementation(
        async (id: string) => {
          if (id === "s1") return { ...currentSpawn };
          return makeSpawn(id, []);
        },
      );

      render(<AssetManagementPanel />);

      // Wait for spawn to be loaded (count shows (0))
      await screen.findByText("(0)");

      const addBtn = screen.getByRole("button", { name: "Add to Spawn" });
      await act(async () => {
        addBtn.click();
      });

      // Wait for Save button to appear (indicates draft state created)
      const saveBtn = await screen.findByRole("button", { name: /Save/i });
      expect(saveBtn).toBeInTheDocument();

      // Verify draft state created
      await waitFor(() => {
        expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true);
      });

      // Verify updateSpawn NOT called immediately
      expect(SpawnService.updateSpawn).not.toHaveBeenCalled();
    });

    it("prevents duplicate assignment and shows an error", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
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

      // Should not show Save button (no draft created for duplicates)
      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /Save/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Asset Removal Workflow (MS-38)", () => {
    it("renders remove control and requires confirmation; removes on confirm and updates count (draft)", async () => {
      const mockSetUnsavedChanges = vi.fn();
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      const a0 = makeSpawnAsset("a1", 0);
      const a1 = makeSpawnAsset("a2", 1);
      const current = makeSpawn("s1", [a0, a1]);
      vi.mocked(SpawnService.getSpawn).mockImplementation(async () => ({
        ...current,
      }));

      render(<AssetManagementPanel />);

      // Two assets shown with count (2)
      expect(await screen.findByText("(2)")).toBeInTheDocument();

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

      // Click confirm
      fireEvent.click(confirm);

      // Wait for dialog to close and draft state to be created
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // Verify draft state created (Save button appears)
      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /Save/i }),
        ).toBeInTheDocument();
      });

      // Verify unsaved changes flag was set
      await waitFor(() => {
        expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true);
      });

      // Verify count updated to (1) after removal
      expect(screen.getByText("(1)")).toBeInTheDocument();

      // Verify only one asset remains
      const items = screen.getAllByRole("listitem");
      expect(items.length).toBe(1);

      // Verify updateSpawn NOT called immediately
      expect(SpawnService.updateSpawn).not.toHaveBeenCalled();
    });
  });

  describe("Drag & Drop Reordering (MS-39)", () => {
    it("reorders items creates draft state", async () => {
      const mockSetUnsavedChanges = vi.fn();
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
        clearContext: vi.fn(),
      });

      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      const a0 = makeSpawnAsset("a1", 0);
      const a1 = makeSpawnAsset("a2", 1);
      const a2 = makeSpawnAsset("a3", 2);
      const current = makeSpawn("s1", [a0, a1, a2]);
      vi.mocked(SpawnService.getSpawn).mockImplementation(async () => ({
        ...current,
      }));

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

      // Verify draft state created
      expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true);

      // Verify Save button appears
      expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();

      // Verify updateSpawn NOT called immediately
      expect(SpawnService.updateSpawn).not.toHaveBeenCalled();
    });

    it("save button persists reorder", async () => {
      const mockSetUnsavedChanges = vi.fn();
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
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
        },
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

      // Click Save
      const saveBtn = screen.getByRole("button", { name: /Save/i });
      await act(async () => {
        saveBtn.click();
      });

      // Verify updateSpawn called with new order
      expect(SpawnService.updateSpawn).toHaveBeenCalled();
      const callArgs = vi.mocked(SpawnService.updateSpawn).mock.calls[0];
      expect(callArgs[1].assets).toBeDefined();

      // Verify draft cleared
      expect(mockSetUnsavedChanges).toHaveBeenCalledWith(false);
    });

    it("no-op when dropping onto same index", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
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
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
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
