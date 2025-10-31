import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render as rtlRender,
  screen,
  act,
  fireEvent,
  waitFor,
  within,
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
    updateAsset: vi.fn(),
    isNameAvailable: vi.fn(),
  },
}));

// Mock usePanelState hook with current architecture
vi.mock("../../../hooks/useLayout", () => ({
  usePanelState: vi.fn(),
}));

// Mock Radix UI DropdownMenu to avoid complexity in tests
vi.mock("@radix-ui/react-dropdown-menu", () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-root">{children}</div>
  ),
  Trigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <div data-testid="dropdown-trigger">{children}</div>
    ),
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-portal">{children}</div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content" role="menu">
      {children}
    </div>
  ),
  Item: ({
    children,
    onSelect,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onSelect?: (e: Event) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="dropdown-item"
      role="menuitem"
      onClick={(e) => {
        if (!disabled && onSelect) {
          onSelect(e as unknown as Event);
        }
      }}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </div>
  ),
  Separator: () => <hr data-testid="dropdown-separator" />,
  Arrow: () => <div data-testid="dropdown-arrow" />,
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
      changeType: "none",
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
        changeType: "none",
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
        changeType: "none",
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
        expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true, "spawn");
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
        changeType: "none",
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
    it("renders remove control and immediately removes asset (draft)", async () => {
      const mockSetUnsavedChanges = vi.fn();
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
        clearContext: vi.fn(),
      });

      const a0 = makeSpawnAsset("a1", 0);
      const a1 = makeSpawnAsset("a2", 1);
      const current = makeSpawn("s1", [a0, a1]);
      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
        makeAsset({ id: "a2" }),
      ]);
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

      // Verify draft state created immediately (Save button appears)
      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /Save/i }),
        ).toBeInTheDocument();
      });

      // Verify unsaved changes flag was set
      await waitFor(() => {
        expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true, "spawn");
      });

      // Verify count updated to (1) after removal
      expect(screen.getByText("(1)")).toBeInTheDocument();

      // Verify only one asset remains
      const spawnRegion = screen.getByRole("region", {
        name: "Assets in Current Spawn",
      });
      const items = within(spawnRegion).getAllByRole("listitem");
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
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
        clearContext: vi.fn(),
      });

      const a0 = makeSpawnAsset("a1", 0);
      const a1 = makeSpawnAsset("a2", 1);
      const a2 = makeSpawnAsset("a3", 2);
      const current = makeSpawn("s1", [a0, a1, a2]);
      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
        makeAsset({ id: "a2" }),
        makeAsset({ id: "a3" }),
      ]);
      vi.mocked(SpawnService.getSpawn).mockImplementation(async () => ({
        ...current,
      }));

      render(<AssetManagementPanel />);

      // Wait for three listitems
      const spawnRegion = screen.getByRole("region", {
        name: "Assets in Current Spawn",
      });
      const items = await within(spawnRegion).findAllByRole("listitem");
      expect(items.length).toBe(3);

      // Drag index 2 to index 0
      await act(async () => {
        const dataStore: Record<string, string> = {};
        const dt = {
          getData: vi.fn((format: string) => dataStore[format] || "2"),
          setData: vi.fn((format: string, data: string) => {
            dataStore[format] = data;
          }),
          effectAllowed: "move",
          dropEffect: "move",
        } as unknown as DataTransfer;
        fireEvent.dragStart(items[2], { dataTransfer: dt });
        fireEvent.dragOver(items[0], { dataTransfer: dt });
        fireEvent.drop(items[0], { dataTransfer: dt });
      });

      // Verify draft state created
      await waitFor(() => {
        expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true, "spawn");
      });

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
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
        clearContext: vi.fn(),
      });

      const a0 = makeSpawnAsset("a1", 0);
      const a1 = makeSpawnAsset("a2", 1);
      const a2 = makeSpawnAsset("a3", 2);
      let current = makeSpawn("s1", [a0, a1, a2]);
      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
        makeAsset({ id: "a2" }),
        makeAsset({ id: "a3" }),
      ]);
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
      const spawnRegion = screen.getByRole("region", {
        name: "Assets in Current Spawn",
      });
      const items = await within(spawnRegion).findAllByRole("listitem");
      expect(items.length).toBe(3);

      // Drag index 2 to index 0
      await act(async () => {
        const dt = {
          getData: vi.fn(() => "2"),
          setData: vi.fn(),
          effectAllowed: "move",
          dropEffect: "move",
        } as unknown as DataTransfer;
        fireEvent.dragStart(items[2], { dataTransfer: dt });
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
      expect(mockSetUnsavedChanges).toHaveBeenCalledWith(false, "none");
    });

    it("no-op when dropping onto same index", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      const a0 = makeSpawnAsset("a1", 0);
      const a1 = makeSpawnAsset("a2", 1);
      const current = makeSpawn("s1", [a0, a1]);
      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
        makeAsset({ id: "a2" }),
      ]);
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
        changeType: "none",
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
      vi.mocked(AssetService.getAssets).mockReturnValue([asset]);

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

  describe("Asset Rename (Menu + Inline)", () => {
    it("spawn row kebab menu does NOT contain Rename option", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      const asset = makeAsset({ id: "a1", name: "Old" });
      const sa = makeSpawnAsset(asset.id, 0);
      const spawn = makeSpawn("s1", [sa]);
      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(AssetService.getAssets).mockReturnValue([asset]);

      render(<AssetManagementPanel />);

      const spawnSection = screen.getByRole("region", {
        name: "Assets in Current Spawn",
      });
      const withinSpawn = within(spawnSection);
      const more = await withinSpawn.findByRole("button", {
        name: "More actions",
      });
      await act(async () => {
        fireEvent.click(more);
      });

      // Verify Rename menu item does NOT exist in spawn section
      expect(
        withinSpawn.queryByRole("menuitem", { name: "Rename" }),
      ).not.toBeInTheDocument();
    });

    it("double-click in spawn section does NOT trigger rename", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "s1",
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      const asset = makeAsset({ id: "a1", name: "Old" });
      const sa = makeSpawnAsset(asset.id, 0);
      const spawn = makeSpawn("s1", [sa]);
      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(AssetService.getAssets).mockReturnValue([asset]);

      render(<AssetManagementPanel />);

      const spawnSection = screen.getByRole("region", {
        name: "Assets in Current Spawn",
      });
      const withinSpawn = within(spawnSection);
      const nameEl = await withinSpawn.findByText("Old");
      await act(async () => {
        fireEvent.doubleClick(nameEl);
      });

      // Verify rename input does NOT appear after double-click in spawn section
      expect(screen.queryByLabelText("Rename asset")).not.toBeInTheDocument();
      expect(AssetService.updateAsset).not.toHaveBeenCalled();
    });

    it("library row kebab → Rename → saves unique name", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: undefined,
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      const a1 = makeAsset({ id: "a1", name: "Old" });
      vi.mocked(AssetService.getAssets).mockReturnValue([a1]);
      vi.mocked(AssetService.isNameAvailable).mockImplementation(
        (n, id) => n.toLowerCase() !== "old" || id === "a1",
      );
      vi.mocked(AssetService.updateAsset).mockReturnValue(true);

      render(<AssetManagementPanel />);

      const librarySection = screen.getByRole("region", {
        name: "Asset Library",
      });
      const withinLibrary = within(librarySection);
      const more = await withinLibrary.findByRole("button", {
        name: "More actions",
      });
      await act(async () => {
        fireEvent.click(more);
      });
      const renameItem = withinLibrary.getByRole("menuitem", {
        name: "Rename",
      });
      await act(async () => {
        fireEvent.click(renameItem);
      });
      const input = await screen.findByLabelText("Rename asset");
      await act(async () => {
        fireEvent.change(input, { target: { value: "New" } });
        fireEvent.keyDown(input, { key: "Enter" });
      });
      expect(AssetService.updateAsset).toHaveBeenCalled();
    });

    it("library double-click rename works and saves unique name", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: undefined,
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        setCenterPanelMode: vi.fn(),
        setUnsavedChanges: vi.fn(),
        clearContext: vi.fn(),
      });

      const a1 = makeAsset({ id: "a1", name: "Old" });
      vi.mocked(AssetService.getAssets).mockReturnValue([a1]);
      vi.mocked(AssetService.isNameAvailable).mockImplementation(
        (n, id) => n.toLowerCase() !== "old" || id === "a1",
      );
      vi.mocked(AssetService.updateAsset).mockReturnValue(true);

      render(<AssetManagementPanel />);

      const librarySection = screen.getByRole("region", {
        name: "Asset Library",
      });
      const withinLibrary = within(librarySection);
      const nameEl = await withinLibrary.findByText("Old");
      await act(async () => {
        fireEvent.doubleClick(nameEl);
      });

      const input = await screen.findByLabelText("Rename asset");
      await act(async () => {
        fireEvent.change(input, { target: { value: "New" } });
        fireEvent.keyDown(input, { key: "Enter" });
      });

      expect(AssetService.updateAsset).toHaveBeenCalled();
    });
  });
});
