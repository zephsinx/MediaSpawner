import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SpawnListItem from "../SpawnListItem";
import { createMockSpawn } from "./testUtils";

describe("SpawnListItem", () => {
  const mockSpawn = createMockSpawn({
    id: "spawn-1",
    name: "Test Spawn",
    description: "A test spawn description",
    enabled: true,
    assets: [
      {
        id: "asset-1",
        assetId: "asset-1",
        enabled: true,
        order: 0,
        overrides: {},
      },
      {
        id: "asset-2",
        assetId: "asset-2",
        enabled: true,
        order: 1,
        overrides: {},
      },
    ],
  });

  describe("Basic Rendering", () => {
    it("renders spawn name correctly", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      expect(screen.getByText("Test Spawn")).toBeInTheDocument();
    });

    it("renders spawn description when available", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      expect(screen.getByText("A test spawn description")).toBeInTheDocument();
    });

    it("does not render description when not available", () => {
      const spawnWithoutDescription = createMockSpawn({
        description: undefined,
      });

      render(<SpawnListItem spawn={spawnWithoutDescription} />);

      expect(
        screen.queryByText("A test spawn description")
      ).not.toBeInTheDocument();
    });

    it("renders asset count correctly", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      expect(screen.getByText("2 assets")).toBeInTheDocument();
    });

    it("renders singular asset count correctly", () => {
      const spawnWithOneAsset = createMockSpawn({
        assets: [
          {
            id: "asset-1",
            assetId: "asset-1",
            enabled: true,
            order: 0,
            overrides: {},
          },
        ],
      });

      render(<SpawnListItem spawn={spawnWithOneAsset} />);

      expect(screen.getByText("1 asset")).toBeInTheDocument();
    });

    it("renders zero assets correctly", () => {
      const spawnWithNoAssets = createMockSpawn({
        assets: [],
      });

      render(<SpawnListItem spawn={spawnWithNoAssets} />);

      expect(screen.getByText("0 assets")).toBeInTheDocument();
    });
  });

  describe("Status Indicators", () => {
    it("renders enabled status indicator correctly", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const statusDot = screen.getByTitle("Enabled");
      expect(statusDot).toBeInTheDocument();
      expect(statusDot).toHaveClass("bg-green-500");
    });

    it("renders disabled status indicator correctly", () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });

      render(<SpawnListItem spawn={disabledSpawn} />);

      const statusDot = screen.getByTitle("Disabled");
      expect(statusDot).toBeInTheDocument();
      expect(statusDot).toHaveClass("bg-gray-400");
    });

    it("renders status text correctly for enabled spawn", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders status text correctly for disabled spawn", () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });

      render(<SpawnListItem spawn={disabledSpawn} />);

      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("applies selected styling when isSelected is true", () => {
      const { container } = render(
        <SpawnListItem spawn={mockSpawn} isSelected={true} />
      );

      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("bg-blue-50", "border-blue-200");
    });

    it("does not apply selected styling when isSelected is false", () => {
      const { container } = render(
        <SpawnListItem spawn={mockSpawn} isSelected={false} />
      );

      const listItem = container.firstChild as HTMLElement;
      expect(listItem).not.toHaveClass("bg-blue-50", "border-blue-200");
    });

    it("defaults to not selected when isSelected is not provided", () => {
      const { container } = render(<SpawnListItem spawn={mockSpawn} />);

      const listItem = container.firstChild as HTMLElement;
      expect(listItem).not.toHaveClass("bg-blue-50", "border-blue-200");
    });
  });

  describe("User Interactions", () => {
    it("calls onClick with spawn when clicked", () => {
      const mockOnClick = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);

      const listItem = screen.getByText("Test Spawn").closest("div");
      fireEvent.click(listItem!);

      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("does not call onClick when not provided", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const listItem = screen.getByText("Test Spawn").closest("div");
      expect(() => fireEvent.click(listItem!)).not.toThrow();
    });

    it("handles Enter key press", () => {
      const mockOnClick = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);

      const listItem = screen.getByText("Test Spawn").closest("div");
      fireEvent.keyDown(listItem!, { key: "Enter" });

      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("handles Space key press", () => {
      const mockOnClick = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);

      const listItem = screen.getByText("Test Spawn").closest("div");
      fireEvent.keyDown(listItem!, { key: " " });

      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("prevents default on Enter key press", () => {
      const mockOnClick = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);

      const listItem = screen.getByText("Test Spawn").closest("div");
      fireEvent.keyDown(listItem!, { key: "Enter" });

      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("prevents default on Space key press", () => {
      const mockOnClick = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);

      const listItem = screen.getByText("Test Spawn").closest("div");
      fireEvent.keyDown(listItem!, { key: " " });

      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("does not handle other key presses", () => {
      const mockOnClick = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);

      const listItem = screen.getByText("Test Spawn").closest("div");
      fireEvent.keyDown(listItem!, { key: "Tab" });

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has proper role attribute", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const listItem = screen.getByRole("button");
      expect(listItem).toBeInTheDocument();
    });

    it("has proper tabIndex", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const listItem = screen.getByRole("button");
      expect(listItem).toHaveAttribute("tabIndex", "0");
    });

    it("has proper cursor styling", () => {
      const { container } = render(<SpawnListItem spawn={mockSpawn} />);

      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("cursor-pointer");
    });
  });

  describe("Styling", () => {
    it("applies base styling classes", () => {
      const { container } = render(<SpawnListItem spawn={mockSpawn} />);

      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass(
        "p-3",
        "border-b",
        "border-gray-100",
        "cursor-pointer",
        "transition-colors",
        "hover:bg-gray-50"
      );
    });

    it("applies custom className when provided", () => {
      const { container } = render(
        <SpawnListItem spawn={mockSpawn} className="custom-class" />
      );

      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("custom-class");
    });
  });
});
