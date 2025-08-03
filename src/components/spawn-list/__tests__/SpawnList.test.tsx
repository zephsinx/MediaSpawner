import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SpawnList from "../SpawnList";
import { mockSpawns, createMockSpawn } from "./testUtils";

// Mock the SpawnService
vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getAllSpawns: vi.fn(),
  },
}));

// Import after mocking
import { SpawnService } from "../../../services/spawnService";

const mockSpawnService = vi.mocked(SpawnService);

describe("SpawnList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock return value
    mockSpawnService.getAllSpawns.mockReturnValue([]);
  });

  describe("State Management", () => {
    it("shows empty state when no spawns exist", () => {
      mockSpawnService.getAllSpawns.mockReturnValue([]);

      render(<SpawnList />);

      expect(screen.getByText("No Spawns Found")).toBeInTheDocument();
      expect(
        screen.getByText(
          "You haven't created any spawns yet. Create your first spawn to get started."
        )
      ).toBeInTheDocument();
      expect(screen.getByText("📋")).toBeInTheDocument();
    });

    it("shows populated state when spawns exist", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      render(<SpawnList />);

      expect(screen.getByText("Spawns")).toBeInTheDocument();
      expect(screen.getByText("4 spawns")).toBeInTheDocument();
    });

    it("shows error state when service throws", () => {
      const errorMessage = "Network error";
      mockSpawnService.getAllSpawns.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      render(<SpawnList />);

      expect(screen.getByText("Failed to load spawns")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });

    it("handles non-Error exceptions", () => {
      mockSpawnService.getAllSpawns.mockImplementation(() => {
        throw "String error";
      });

      render(<SpawnList />);

      const errorMessages = screen.getAllByText("Failed to load spawns");
      expect(errorMessages).toHaveLength(2);
    });

    it("handles service errors gracefully", () => {
      const errorMessage = "Network error";
      mockSpawnService.getAllSpawns.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      render(<SpawnList />);

      expect(screen.getByText("Failed to load spawns")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe("Service Integration", () => {
    it("calls SpawnService.getAllSpawns on mount", () => {
      render(<SpawnList />);

      expect(mockSpawnService.getAllSpawns).toHaveBeenCalledTimes(1);
    });

    it("handles service errors gracefully", () => {
      const errorMessage = "Network error";
      mockSpawnService.getAllSpawns.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      render(<SpawnList />);

      expect(screen.getByText("Failed to load spawns")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onSpawnClick when spawn is clicked", () => {
      const mockOnSpawnClick = vi.fn();
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      render(<SpawnList onSpawnClick={mockOnSpawnClick} />);

      expect(screen.getByText("Enabled Spawn")).toBeInTheDocument();

      const spawnItem = screen.getByText("Enabled Spawn").closest("div");
      fireEvent.click(spawnItem!);

      expect(mockOnSpawnClick).toHaveBeenCalledWith(mockSpawns[0]);
    });

    it("does not call onSpawnClick when not provided", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      render(<SpawnList />);

      expect(screen.getByText("Enabled Spawn")).toBeInTheDocument();

      const spawnItem = screen.getByText("Enabled Spawn").closest("div");
      expect(() => fireEvent.click(spawnItem!)).not.toThrow();
    });

    it("highlights selected spawn correctly", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      render(<SpawnList selectedSpawnId="spawn-2" />);

      expect(screen.getByText("Disabled Spawn")).toBeInTheDocument();

      // The selected spawn should have the selected styling
      const selectedSpawn = screen.getByText("Disabled Spawn").closest("div");
      // Find the parent div that has the selection styling
      const spawnContainer = selectedSpawn?.parentElement;
      expect(spawnContainer).toHaveClass("bg-blue-50", "border-blue-200");
    });

    it("does not highlight when no spawn is selected", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      render(<SpawnList />);

      expect(screen.getByText("Enabled Spawn")).toBeInTheDocument();

      // No spawn should have selected styling
      const spawnItems = screen.getAllByRole("button");
      spawnItems.forEach((item) => {
        expect(item).not.toHaveClass("bg-blue-50", "border-blue-200");
      });
    });
  });

  describe("UI Structure", () => {
    it("renders header with correct title and count", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      render(<SpawnList />);

      expect(screen.getByText("Spawns")).toBeInTheDocument();
      expect(screen.getByText("4 spawns")).toBeInTheDocument();
    });

    it("renders singular count correctly", () => {
      const singleSpawn = [mockSpawns[0]];
      mockSpawnService.getAllSpawns.mockReturnValue(singleSpawn);

      render(<SpawnList />);

      expect(screen.getByText("1 spawn")).toBeInTheDocument();
    });

    it("renders all spawn items", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      render(<SpawnList />);

      expect(screen.getByText("Enabled Spawn")).toBeInTheDocument();
      expect(screen.getByText("Disabled Spawn")).toBeInTheDocument();
      expect(screen.getByText("Spawn with Assets")).toBeInTheDocument();
      expect(screen.getByText("Spawn without Description")).toBeInTheDocument();
    });

    it("applies custom className when provided", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      const { container } = render(<SpawnList className="custom-class" />);

      const listContainer = container.firstChild as HTMLElement;
      expect(listContainer).toHaveClass("custom-class");
    });
  });

  describe("CSS Classes and Styling", () => {
    it("applies correct base styling classes", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      const { container } = render(<SpawnList />);

      const listContainer = container.firstChild as HTMLElement;
      expect(listContainer).toHaveClass("h-full", "flex", "flex-col");
    });

    it("applies correct header styling", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      const { container } = render(<SpawnList />);

      const header = container.querySelector(
        ".p-4.border-b.border-gray-200.bg-gray-50"
      );
      expect(header).toBeInTheDocument();
    });

    it("applies correct list container styling", () => {
      mockSpawnService.getAllSpawns.mockReturnValue(mockSpawns);

      const { container } = render(<SpawnList />);

      const listContainer = container.querySelector(".flex-1.overflow-y-auto");
      expect(listContainer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles spawns with undefined description", () => {
      const spawnWithoutDescription = createMockSpawn({
        id: "spawn-no-desc",
        name: "No Description Spawn",
        description: undefined,
      });
      mockSpawnService.getAllSpawns.mockReturnValue([spawnWithoutDescription]);

      render(<SpawnList />);

      expect(screen.getByText("No Description Spawn")).toBeInTheDocument();
      // Should not crash or show undefined text
      expect(screen.queryByText("undefined")).not.toBeInTheDocument();
    });

    it("handles spawns with many assets", () => {
      const spawnWithManyAssets = createMockSpawn({
        id: "spawn-many-assets",
        name: "Many Assets Spawn",
        assets: Array.from({ length: 10 }, (_, i) => ({
          id: `asset-${i}`,
          assetId: `asset-${i}`,
          enabled: true,
          order: i,
          overrides: {},
        })),
      });
      mockSpawnService.getAllSpawns.mockReturnValue([spawnWithManyAssets]);

      render(<SpawnList />);

      expect(screen.getByText("Many Assets Spawn")).toBeInTheDocument();
      expect(screen.getByText("10 assets")).toBeInTheDocument();
    });
  });
});
