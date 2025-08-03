import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
    // Set default mock return value for all tests
    vi.mocked(SpawnService.getAllSpawns).mockReturnValue([]);
  });

  describe("Three-Panel Integration", () => {
    it("renders the three-panel layout structure", () => {
      const { container } = render(<Layout />);

      // Check that the grid layout is applied
      const gridContainer = container.querySelector(".grid.grid-cols-12");
      expect(gridContainer).toBeInTheDocument();

      // Check that all three panels are rendered
      const panels = container.querySelectorAll(".col-span-3, .col-span-6");
      expect(panels).toHaveLength(3);
    });

    it("renders spawn list with spawns when available", () => {
      // Mock SpawnService to return test spawns
      vi.mocked(SpawnService.getAllSpawns).mockReturnValue(mockSpawns);

      render(<Layout />);

      // Check for spawn list header
      expect(screen.getByText("Spawns")).toBeInTheDocument();
      expect(screen.getByText("2 spawns")).toBeInTheDocument();

      // Check for spawn items
      expect(screen.getByText("Test Spawn 1")).toBeInTheDocument();
      expect(screen.getByText("Test Spawn 2")).toBeInTheDocument();
      expect(screen.getByText("A test spawn for testing")).toBeInTheDocument();
      expect(screen.getByText("Another test spawn")).toBeInTheDocument();

      // Check for status indicators
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("renders empty spawn list when no spawns exist", () => {
      // Mock SpawnService to return empty array
      vi.mocked(SpawnService.getAllSpawns).mockReturnValue([]);

      render(<Layout />);

      // Check for empty state
      expect(screen.getByText("No Spawns Found")).toBeInTheDocument();
      expect(
        screen.getByText(
          "You haven't created any spawns yet. Create your first spawn to get started."
        )
      ).toBeInTheDocument();
    });

    it("renders placeholder components for center and right panels", () => {
      vi.mocked(SpawnService.getAllSpawns).mockReturnValue(mockSpawns);

      render(<Layout />);

      // Check for configuration workspace placeholder
      expect(
        screen.getByText("Unified Configuration Workspace")
      ).toBeInTheDocument();
      expect(
        screen.getByText("spawn configuration and settings management")
      ).toBeInTheDocument();

      // Check for asset management placeholder
      expect(screen.getByText("Dynamic Asset Management")).toBeInTheDocument();
      expect(
        screen.getByText("asset library and management tools")
      ).toBeInTheDocument();
    });

    it("renders placeholder icons for center and right panels", () => {
      vi.mocked(SpawnService.getAllSpawns).mockReturnValue(mockSpawns);

      render(<Layout />);

      // Only center and right panels should have placeholder icons now
      expect(screen.getAllByText("⚙️")).toHaveLength(2); // Configuration (header + content)
      expect(screen.getAllByText("📁")).toHaveLength(2); // Asset Management (header + content)
    });

    it("renders 'Coming Soon' messages for center and right panels", () => {
      vi.mocked(SpawnService.getAllSpawns).mockReturnValue(mockSpawns);

      render(<Layout />);

      expect(
        screen.getByText("Unified Configuration Workspace Coming Soon")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Dynamic Asset Management Coming Soon")
      ).toBeInTheDocument();
    });
  });

  describe("Layout Structure", () => {
    it("applies correct width distribution", () => {
      const { container } = render(<Layout />);

      const leftPanel = container.querySelector(".col-span-3");
      const centerPanel = container.querySelector(".col-span-6");
      const rightPanel = container.querySelector(".col-span-3:last-child");

      expect(leftPanel).toBeInTheDocument();
      expect(centerPanel).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();
    });

    it("applies minimum width constraints", () => {
      const { container } = render(<Layout />);

      const leftPanel = container.querySelector(".min-w-\\[320px\\]");
      const centerPanel = container.querySelector(".min-w-\\[640px\\]");
      const rightPanel = container.querySelector(".min-w-\\[320px\\]");

      expect(leftPanel).toBeInTheDocument();
      expect(centerPanel).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();
    });

    it("applies proper styling to panels", () => {
      const { container } = render(<Layout />);

      const panels = container.querySelectorAll(".bg-white");
      expect(panels).toHaveLength(4); // Header + 3 panels

      const leftPanel = container.querySelector(".col-span-3");
      const centerPanel = container.querySelector(".col-span-6");

      expect(leftPanel).toHaveClass("border-r", "border-gray-200");
      expect(centerPanel).toHaveClass("border-r", "border-gray-200");
    });
  });

  describe("Responsive Design", () => {
    it("maintains full height layout", () => {
      const { container } = render(<Layout />);

      const gridContainer = container.querySelector(
        ".h-\\[calc\\(100vh-80px\\)\\]"
      );
      expect(gridContainer).toBeInTheDocument();
    });

    it("applies minimum container width", () => {
      const { container } = render(<Layout />);

      const gridContainer = container.querySelector(".min-w-\\[1280px\\]");
      expect(gridContainer).toBeInTheDocument();
    });

    it("ensures panels have proper height containers", () => {
      const { container } = render(<Layout />);

      const panelContainers = container.querySelectorAll(".h-full");
      expect(panelContainers).toHaveLength(6); // 3 panels + 3 placeholder containers
    });
  });

  describe("Background and Container Styling", () => {
    it("applies correct background to main container", () => {
      const { container } = render(<Layout />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("min-h-screen", "bg-gray-50");
    });

    it("applies overflow handling to prevent content overflow", () => {
      const { container } = render(<Layout />);

      const panels = container.querySelectorAll(".overflow-hidden");
      expect(panels).toHaveLength(3);
    });
  });
});
