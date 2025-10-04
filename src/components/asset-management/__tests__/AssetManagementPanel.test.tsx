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
import { createMediaAsset } from "../../../types/media";

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
    addAsset: vi.fn(),
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
    </Tooltip.Provider>
  );
}

function makeSpawn(id: string, assets: SpawnAsset[]): Spawn {
  return createSpawn(id, undefined, assets, id);
}

function makeSpawnAsset(assetId: string, order: number): SpawnAsset {
  return createSpawnAsset(assetId, order, undefined, assetId);
}

const makeAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
  id: overrides.id || Math.random().toString(36).slice(2),
  type: overrides.type || "image",
  name: overrides.name || "Sample",
  path: overrides.path || "https://example.com/sample.png",
  isUrl: overrides.isUrl ?? true,
});

describe("AssetManagementPanel (Core Functionality)", () => {
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

  describe("Basic Rendering & Layout (MS-32)", () => {
    it("renders two sections with correct headers", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      render(<AssetManagementPanel />);

      expect(screen.getByText("Assets in Current Spawn")).toBeInTheDocument();
      expect(screen.getByText("Asset Library")).toBeInTheDocument();
    });

    it("applies flex column layout and overflow handling to container", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      const { container } = render(<AssetManagementPanel />);
      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass("h-full", "flex", "flex-col", "overflow-hidden");
    });

    it("applies min-heights and border separation to sections", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      const { container } = render(<AssetManagementPanel />);
      const sections = container.querySelectorAll("section");
      expect(sections).toHaveLength(2);

      const topBorderWrapper = sections[0].querySelector(
        ".flex.flex-col.overflow-hidden"
      ) as HTMLElement | null;
      expect(topBorderWrapper).toBeTruthy();
      expect(topBorderWrapper!).toHaveClass(
        "border-b",
        "border-[rgb(var(--color-border))]"
      );

      const topPanel = sections[0].querySelector(
        "[id^='headlessui-disclosure-panel']"
      ) as HTMLElement | null;
      expect(topPanel).toBeTruthy();
      expect(topPanel!).toHaveClass("min-h-[80px]");

      const bottomPanel = sections[1].querySelector(
        "[id^='headlessui-disclosure-panel']"
      ) as HTMLElement | null;
      expect(bottomPanel).toBeTruthy();
      expect(bottomPanel!).toHaveClass("min-h-[200px]");
    });

    it("uses sticky-like headers and scrollable content areas", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      const { container } = render(<AssetManagementPanel />);
      // Two Disclosure headers (buttons): target by their accessible names
      const disclosureButtons = [
        screen.getByRole("button", { name: /Toggle Assets in Current Spawn/i }),
        screen.getByRole("button", { name: /Toggle Asset Library/i }),
      ];
      expect(disclosureButtons).toHaveLength(2);

      // One inner toolbar (library section only) - look for elements with both classes
      const allElements = container.querySelectorAll("*");
      const innerToolbars = Array.from(allElements).filter((el) => {
        const classList = el.classList;
        return (
          classList.contains("border-b") &&
          Array.from(classList).some((cls) => cls.includes("color-muted")) &&
          Array.from(classList).some((cls) => cls.includes("color-border"))
        );
      });
      expect(innerToolbars).toHaveLength(1);

      const scrollers = container.querySelectorAll(".flex-1.overflow-auto");
      expect(scrollers).toHaveLength(2);
    });
  });

  describe("Loading & Empty States (MS-33)", () => {
    it("shows empty state when no spawn is selected", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
      ]);

      render(<AssetManagementPanel />);

      expect(screen.getByText("Assets in Current Spawn")).toBeInTheDocument();
      expect(
        screen.getByText("Select a spawn to see its assets")
      ).toBeInTheDocument();
    });

    it("shows loading state while spawn assets are loading", async () => {
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

      vi.mocked(SpawnService.getSpawn).mockImplementation(
        // Never resolve to keep loading state
        () => new Promise(() => {})
      );

      render(<AssetManagementPanel />);
      expect(await screen.findByText("Loading assets…")).toBeInTheDocument();
    });

    it("shows empty state and count (0) when spawn has no assets", async () => {
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

      vi.mocked(SpawnService.getSpawn).mockResolvedValue(makeSpawn("s1", []));

      render(<AssetManagementPanel />);

      // Count is in Disclosure button; scope within it
      const spawnHeader = screen.getByRole("button", {
        name: /Assets in Current Spawn/i,
      });
      expect(await within(spawnHeader).findByText("(0)")).toBeInTheDocument();

      // Assert empty state is visible in spawn region
      const spawnRegion = screen.getByRole("region", {
        name: "Assets in Current Spawn",
      });
      expect(
        await within(spawnRegion).findByText("No assets assigned to this spawn")
      ).toBeInTheDocument();
    });
  });

  describe("Asset Display & Organization (MS-33)", () => {
    it("renders assets sorted by order with name and type", async () => {
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

      const assets = [
        makeSpawnAsset("a3", 2),
        makeSpawnAsset("a1", 0),
        makeSpawnAsset("a2", 1),
      ];
      vi.mocked(SpawnService.getSpawn).mockResolvedValue(
        makeSpawn("s1", assets)
      );
      vi.mocked(AssetService.getAssetById).mockImplementation((id: string) => {
        if (id === "a1")
          return makeAsset({ id: "a1", type: "image", name: "First" });
        if (id === "a2")
          return makeAsset({ id: "a2", type: "video", name: "Second" });
        if (id === "a3")
          return makeAsset({ id: "a3", type: "audio", name: "Third" });
        return makeAsset({ id });
      });

      render(<AssetManagementPanel />);

      // Scope to the spawn region and wait for listitems to render
      const spawnRegion = screen.getByRole("region", {
        name: "Assets in Current Spawn",
      });
      const items = await within(spawnRegion).findAllByRole("listitem");
      const names = items.map((li) =>
        li.querySelector(".text-sm.font-medium")?.textContent?.trim()
      );
      expect(names).toEqual(["First", "Second", "Third"]);

      // Type badges visible within spawn region
      expect(
        within(spawnRegion)
          .getAllByText(/image|video|audio/)
          .some((el) => el.textContent === "image")
      ).toBe(true);
    });

    it("updates when selection changes (header count reflects selection)", async () => {
      const aAssets = [makeSpawnAsset("a1", 0)];
      const bAssets = [makeSpawnAsset("b1", 0), makeSpawnAsset("b2", 1)];
      vi.mocked(SpawnService.getSpawn).mockImplementation(
        async (id: string) => {
          if (id === "A") return makeSpawn("A", aAssets);
          if (id === "B") return makeSpawn("B", bAssets);
          return makeSpawn(id, []);
        }
      );
      vi.mocked(AssetService.getAssetById).mockReturnValue(
        makeAsset({ id: "x", type: "image" })
      );

      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "A",
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

      const view = render(<AssetManagementPanel />);
      expect(await screen.findByText("(1)")).toBeInTheDocument();

      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: "B",
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

      await act(async () => {
        view.rerender(
          <Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
            <AssetManagementPanel />
          </Tooltip.Provider>
        );
      });
      expect(await screen.findByText("(2)")).toBeInTheDocument();
    });
  });

  describe("Asset Library Basics (MS-34)", () => {
    it("renders header count and empty state", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      render(<AssetManagementPanel />);

      expect(screen.getByText("Asset Library")).toBeInTheDocument();
      const libraryHeader = screen.getByRole("button", {
        name: /Asset Library/i,
      });
      expect(within(libraryHeader).getByText("(0)")).toBeInTheDocument();
      expect(screen.getByText("No assets in library")).toBeInTheDocument();
    });

    it("renders assets with name, type badge, and source indicator", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1", type: "image", name: "Img" }),
        makeAsset({ id: "a2", type: "video", name: "Vid", isUrl: false }),
        makeAsset({ id: "a3", type: "audio", name: "Aud" }),
      ]);

      render(<AssetManagementPanel />);

      // Count
      expect(screen.getByText("(3)")).toBeInTheDocument();

      // Names
      expect(screen.getByText("Img")).toBeInTheDocument();
      expect(screen.getByText("Vid")).toBeInTheDocument();
      expect(screen.getByText("Aud")).toBeInTheDocument();

      // Type badges
      expect(screen.getByText("image")).toBeInTheDocument();
      expect(screen.getByText("video")).toBeInTheDocument();
      expect(screen.getByText("audio")).toBeInTheDocument();

      // Source indicators
      expect(screen.getAllByText("🌐").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("📁").length).toBeGreaterThanOrEqual(1);
    });

    it("shows correct asset count in library header", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([
        makeAsset({ id: "a1" }),
        makeAsset({ id: "a2" }),
        makeAsset({ id: "a3" }),
      ]);

      render(<AssetManagementPanel />);

      const libraryHeader = screen.getByRole("button", {
        name: /Asset Library/i,
      });
      expect(libraryHeader.textContent || "").toContain("(3)");
    });

    it("shows empty state when no assets in library", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      render(<AssetManagementPanel />);

      expect(screen.getByText("No assets in library")).toBeInTheDocument();
    });

    it("adds a URL asset with format validation and updates count", async () => {
      // In-memory library to simulate AssetService behavior
      const library: MediaAsset[] = [];
      vi.mocked(AssetService.getAssets).mockImplementation(() => library);
      vi.mocked(AssetService.addAsset).mockImplementation(
        (type: MediaAsset["type"], name: string, path: string) => {
          const created = createMediaAsset(type, name, path, "n1");
          library.push(created);
          return created;
        }
      );

      render(<AssetManagementPanel />);

      // Open add URL
      await act(async () => {
        screen.getByRole("button", { name: "Add URL Asset" }).click();
      });

      // Invalid format
      const input = screen.getByLabelText("Asset URL") as HTMLInputElement;
      input.focus();
      await act(async () => {
        fireEvent.change(input, { target: { value: "notaurl" } });
      });
      await act(async () => {
        screen.getByText("Add").click();
      });
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid URL format");

      // Valid add
      await act(async () => {
        fireEvent.change(input, {
          target: { value: "https://example.com/file.png" },
        });
        screen.getByText("Add").click();
      });

      expect(AssetService.addAsset).toHaveBeenCalled();
      // Count updates to (1) in the Disclosure header button
      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /Asset Library/i });
        expect(btn.textContent || "").toMatch(/\(1\)/);
      });
    });

    it("refreshes when mediaspawner:assets-updated is dispatched", async () => {
      vi.mocked(AssetService.getAssets)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([makeAsset({ id: "x1" })]);

      render(<AssetManagementPanel />);
      const libraryBtn = screen.getByRole("button", { name: /Asset Library/i });
      expect(libraryBtn.textContent || "").toContain("(0)");

      await act(async () => {
        window.dispatchEvent(
          new Event(
            "mediaspawner:assets-updated" as unknown as keyof WindowEventMap
          )
        );
      });

      const btnAfter = screen.getByRole("button", { name: /Asset Library/i });
      expect(btnAfter.textContent || "").toContain("(1)");
    });
  });
});
