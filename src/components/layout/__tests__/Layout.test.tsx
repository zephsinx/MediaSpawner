import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitForElementToBeRemoved,
  act,
} from "@testing-library/react";
import Layout from "../Layout";
import { SpawnService } from "../../../services/spawnService";
import type { Spawn } from "../../../types/spawn";

// Mock the SpawnService
vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getAllSpawns: vi.fn(),
  },
}));

// Test spawn data
const mockSpawns: Spawn[] = [
  {
    id: "spawn-1",
    name: "Test Spawn 1",
    description: "A test spawn for testing",
    enabled: true,
    trigger: {
      enabled: true,
      type: "manual",
      config: { type: "manual" },
      priority: 0,
    },
    duration: 5000,
    assets: [],
    lastModified: Date.now(),
    order: 0,
  },
  {
    id: "spawn-2",
    name: "Test Spawn 2",
    description: "Another test spawn",
    enabled: false,
    trigger: {
      enabled: true,
      type: "manual",
      config: { type: "manual" },
      priority: 0,
    },
    duration: 3000,
    assets: [],
    lastModified: Date.now(),
    order: 1,
  },
];

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock return value for all tests (async)
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);
  });

  describe("Three-Panel Integration", () => {
    it("renders the three-panel layout structure", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = render(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      // Check that the grid layout is applied
      const gridContainer = container.querySelector(".grid.grid-cols-12");
      expect(gridContainer).toBeInTheDocument();

      // Check that all three panels are rendered
      const panels = container.querySelectorAll(".col-span-3, .col-span-6");
      expect(panels).toHaveLength(3);
    });

    it("renders spawn list with spawns when available", async () => {
      // Mock SpawnService to return test spawns
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        render(<Layout />);
      });
      const loading1 = screen.queryByText("Loading spawns...");
      if (loading1) {
        await waitForElementToBeRemoved(loading1);
      }

      // Check for spawn list header
      expect(await screen.findByText("Spawns")).toBeInTheDocument();
      expect(await screen.findByText("2 spawns")).toBeInTheDocument();

      // Check for spawn items
      expect(await screen.findByText("Test Spawn 1")).toBeInTheDocument();
      expect(await screen.findByText("Test Spawn 2")).toBeInTheDocument();
      expect(screen.getByText("A test spawn for testing")).toBeInTheDocument();
      expect(screen.getByText("Another test spawn")).toBeInTheDocument();

      // Check for status indicators
      expect(await screen.findByText("Active")).toBeInTheDocument();
      expect(await screen.findByText("Inactive")).toBeInTheDocument();
    });

    it("renders empty spawn list when no spawns exist", async () => {
      // Mock SpawnService to return empty array
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);

      await act(async () => {
        render(<Layout />);
      });
      const loading2 = screen.queryByText("Loading spawns...");
      if (loading2) {
        await waitForElementToBeRemoved(loading2);
      }

      // Check for empty state
      expect(await screen.findByText("No Spawns Found")).toBeInTheDocument();
      expect(
        screen.getByText(
          "You haven't created any spawns yet. Create your first spawn to get started."
        )
      ).toBeInTheDocument();
    });

    it("shows spawn editor header and guidance when no selection, and updates after selecting a spawn", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        render(<Layout />);
      });
      const loading3 = screen.queryByText("Loading spawns...");
      if (loading3) {
        await waitForElementToBeRemoved(loading3);
      }

      // Center panel should show Spawn Editor prompt when no selection
      expect(screen.getByText("Spawn Editor")).toBeInTheDocument();
      expect(
        screen.getByText("Select a spawn to edit its settings")
      ).toBeInTheDocument();

      // Click a spawn to select it
      const row = screen.getByText("Test Spawn 1");
      await act(async () => {
        row.click();
      });

      // Center panel should reflect selection
      expect(screen.getByText("Spawn Editor")).toBeInTheDocument();
      expect(
        await screen.findByText(/Editing: Test Spawn 1/)
      ).toBeInTheDocument();

      // Right panel placeholder remains
      expect(screen.getByText("Dynamic Asset Management")).toBeInTheDocument();
      expect(
        screen.getByText("asset library and management tools")
      ).toBeInTheDocument();
    });

    it("renders right panel placeholder icon and content while center shows Spawn Editor", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        render(<Layout />);
      });
      const loading4 = screen.queryByText("Loading spawns...");
      if (loading4) {
        await waitForElementToBeRemoved(loading4);
      }

      // Right panel placeholder icon/content
      expect(screen.getAllByText("📁")).toHaveLength(2);
      expect(screen.getByText("Dynamic Asset Management")).toBeInTheDocument();

      // Center panel now shows Spawn Editor (no ⚙️ placeholder)
      expect(screen.getByText("Spawn Editor")).toBeInTheDocument();
    });

    it("keeps right panel 'Coming Soon' while center shows Spawn Editor", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        render(<Layout />);
      });
      const loading5 = screen.queryByText("Loading spawns...");
      if (loading5) {
        await waitForElementToBeRemoved(loading5);
      }

      expect(
        screen.getByText("Dynamic Asset Management Coming Soon")
      ).toBeInTheDocument();
      expect(screen.getByText("Spawn Editor")).toBeInTheDocument();
    });
  });

  describe("Layout Structure", () => {
    it("applies correct width distribution", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = render(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const leftPanel = container.querySelector(".col-span-3");
      const centerPanel = container.querySelector(".col-span-6");
      const rightPanel = container.querySelector(".col-span-3:last-child");

      expect(leftPanel).toBeInTheDocument();
      expect(centerPanel).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();
    });

    it("applies minimum width constraints", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = render(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const leftPanel = container.querySelector(".min-w-\\[320px\\]");
      const centerPanel = container.querySelector(".min-w-\\[640px\\]");
      const rightPanel = container.querySelector(".min-w-\\[320px\\]");

      expect(leftPanel).toBeInTheDocument();
      expect(centerPanel).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();
    });

    it("applies proper styling to panels", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = render(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const panels = container.querySelectorAll(".bg-white");
      expect(panels).toHaveLength(4); // Header + 3 panels

      const leftPanel = container.querySelector(".col-span-3");
      const centerPanel = container.querySelector(".col-span-6");

      expect(leftPanel).toHaveClass("border-r", "border-gray-200");
      expect(centerPanel).toHaveClass("border-r", "border-gray-200");
    });
  });

  describe("Responsive Design", () => {
    it("maintains full height layout", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = render(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const gridContainer = container.querySelector(
        ".h-\\[calc\\(100vh-80px\\)\\]"
      );
      expect(gridContainer).toBeInTheDocument();
    });

    it("applies minimum container width", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = render(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const gridContainer = container.querySelector(".min-w-\\[1280px\\]");
      expect(gridContainer).toBeInTheDocument();
    });

    it("ensures panels have proper height containers", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = render(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const panelContainers = container.querySelectorAll(".h-full");
      expect(panelContainers).toHaveLength(6); // 3 panels + 3 placeholder containers
    });
  });

  describe("Background and Container Styling", () => {
    it("applies correct background to main container", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = render(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("min-h-screen", "bg-gray-50");
    });

    it("applies overflow handling to prevent content overflow", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = render(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const panels = container.querySelectorAll(".overflow-hidden");
      expect(panels).toHaveLength(3);
    });
  });
});
