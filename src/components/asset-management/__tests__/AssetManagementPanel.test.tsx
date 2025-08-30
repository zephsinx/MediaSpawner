import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from "@testing-library/react";
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

      const top = sections[0] as HTMLElement;
      const bottom = sections[1] as HTMLElement;

      expect(top).toHaveClass("min-h-[80px]", "border-b", "border-gray-200");
      expect(bottom).toHaveClass("min-h-[200px]");
    });

    it("uses sticky-like headers and scrollable content areas", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      const { container } = render(<AssetManagementPanel />);
      const headers = container.querySelectorAll(
        ".bg-gray-50.border-b.border-gray-200"
      );
      expect(headers).toHaveLength(2);

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

      vi.mocked(SpawnService.getSpawn).mockResolvedValueOnce(
        makeSpawn("s1", [])
      );

      render(<AssetManagementPanel />);
      expect(
        await screen.findByText("No assets assigned to this spawn")
      ).toBeInTheDocument();
      expect(screen.getByText("Assets in Current Spawn")).toBeInTheDocument();
      expect(screen.getAllByText("(0)").length).toBeGreaterThanOrEqual(1);
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
      vi.mocked(SpawnService.getSpawn).mockResolvedValueOnce(
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

      // Wait for loading to complete by looking for the spawn count
      await screen.findByText("(3)");

      // Find only the list items in the spawn assets section (first section)
      const spawnSection = screen
        .getByText("Assets in Current Spawn")
        .closest("section");
      if (!spawnSection) throw new Error("Spawn assets section not found");

      const items = spawnSection.querySelectorAll("li[role='listitem']");
      const names = Array.from(items).map((li) =>
        li.querySelector(".text-sm.font-medium")?.textContent?.trim()
      );
      expect(names).toEqual(["First", "Second", "Third"]);

      // Type badges visible - only look within the spawn assets section
      const imageBadges = screen.getAllByText("image");
      const videoBadges = screen.getAllByText("video");
      const audioBadges = screen.getAllByText("audio");

      // Check that at least one of each type is in the spawn section
      expect(imageBadges.some((badge) => spawnSection.contains(badge))).toBe(
        true
      );
      expect(videoBadges.some((badge) => spawnSection.contains(badge))).toBe(
        true
      );
      expect(audioBadges.some((badge) => spawnSection.contains(badge))).toBe(
        true
      );
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
        view.rerender(<AssetManagementPanel />);
      });
      expect(await screen.findByText("(2)")).toBeInTheDocument();
    });
  });

  describe("Asset Library Basics (MS-34)", () => {
    it("renders header count and empty state", () => {
      vi.mocked(AssetService.getAssets).mockReturnValue([]);

      render(<AssetManagementPanel />);

      expect(screen.getByText("Asset Library")).toBeInTheDocument();
      expect(screen.getByText("(0)")).toBeInTheDocument();
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

      const libraryHeader = screen.getByText("Asset Library").closest("h2");
      expect(libraryHeader?.textContent).toContain("(3)");
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
      // Count updates to (1)
      await waitFor(() => {
        const headerAfter = screen.getByLabelText("Asset Library")
          .previousElementSibling as HTMLElement | null;
        expect(headerAfter?.textContent || "").toMatch(/\(1\)|\(\s*1\s*\)/);
      });
    });

    it("refreshes when mediaspawner:assets-updated is dispatched", async () => {
      vi.mocked(AssetService.getAssets)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([makeAsset({ id: "x1" })]);

      const { container } = render(<AssetManagementPanel />);
      expect(screen.getByText("(0)")).toBeInTheDocument();

      await act(async () => {
        window.dispatchEvent(
          new Event(
            "mediaspawner:assets-updated" as unknown as keyof WindowEventMap
          )
        );
      });

      // The count is rendered as two separate text nodes inside parentheses; match flexibly
      const header = container.querySelector(
        "[aria-label='Asset Library']"
      )?.previousElementSibling;
      expect(header?.textContent).toContain("(1)");
    });
  });
});
