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

  describe("Toggle Button", () => {
    it("renders toggle button for enabled spawn", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveClass("bg-blue-600");
    });

    it("renders toggle button for disabled spawn", () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });

      render(<SpawnListItem spawn={disabledSpawn} />);

      const toggleButton = screen.getByRole("button", {
        name: "Enable Test Spawn",
      });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveClass("bg-gray-200");
    });

    it("shows correct toggle position for enabled spawn", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const toggleThumb = screen
        .getByRole("button", { name: "Disable Test Spawn" })
        .querySelector("span");
      expect(toggleThumb).toHaveClass("translate-x-6");
    });

    it("shows correct toggle position for disabled spawn", () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });

      render(<SpawnListItem spawn={disabledSpawn} />);

      const toggleThumb = screen
        .getByRole("button", { name: "Enable Test Spawn" })
        .querySelector("span");
      expect(toggleThumb).toHaveClass("translate-x-1");
    });

    it("calls onToggle when toggle button is clicked", () => {
      const mockOnToggle = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onToggle={mockOnToggle} />);

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      fireEvent.click(toggleButton);

      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
    });

    it("does not call onToggle when not provided", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(() => fireEvent.click(toggleButton)).not.toThrow();
    });

    it("handles keyboard interaction on toggle button", () => {
      const mockOnToggle = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onToggle={mockOnToggle} />);

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      fireEvent.keyDown(toggleButton, { key: "Enter" });

      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
    });

    it("handles space key on toggle button", () => {
      const mockOnToggle = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onToggle={mockOnToggle} />);

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      fireEvent.keyDown(toggleButton, { key: " " });

      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
    });

    it("prevents event propagation when toggle is clicked", () => {
      const mockOnClick = vi.fn();
      const mockOnToggle = vi.fn();
      render(
        <SpawnListItem
          spawn={mockSpawn}
          onClick={mockOnClick}
          onToggle={mockOnToggle}
        />
      );

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      fireEvent.click(toggleButton);

      expect(mockOnToggle).toHaveBeenCalled();
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("shows loading state when processing", () => {
      render(<SpawnListItem spawn={mockSpawn} isToggleProcessing={true} />);

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(toggleButton).toBeDisabled();
      expect(toggleButton).toHaveClass("opacity-50", "cursor-not-allowed");
    });

    it("does not call onToggle when processing", () => {
      const mockOnToggle = vi.fn();
      render(
        <SpawnListItem
          spawn={mockSpawn}
          onToggle={mockOnToggle}
          isToggleProcessing={true}
        />
      );

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      fireEvent.click(toggleButton);

      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe("Visual States", () => {
    it("renders enabled spawn with normal opacity", () => {
      const { container } = render(<SpawnListItem spawn={mockSpawn} />);

      const listItem = container.firstChild as HTMLElement;
      expect(listItem).not.toHaveClass("opacity-60");
    });

    it("renders disabled spawn with reduced opacity", () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });

      const { container } = render(<SpawnListItem spawn={disabledSpawn} />);

      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("opacity-60");
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
    it("calls onClick with spawn when main area is clicked", () => {
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

    it("handles Enter key press on main area", () => {
      const mockOnClick = vi.fn();
      render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);

      const listItem = screen.getByText("Test Spawn").closest("div");
      fireEvent.keyDown(listItem!, { key: "Enter" });

      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("handles Space key press on main area", () => {
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
    it("has proper role attributes for both buttons", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("has proper tabIndex for main container", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const listItem = screen
        .getByText("Test Spawn")
        .closest('[role="button"]');
      expect(listItem).toHaveAttribute("tabindex", "0");
    });

    it("has proper cursor styling", () => {
      const { container } = render(<SpawnListItem spawn={mockSpawn} />);

      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("cursor-pointer");
    });

    it("has proper aria-label for toggle button", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(toggleButton).toHaveAttribute("aria-label", "Disable Test Spawn");
    });

    it("has proper title for toggle button", () => {
      render(<SpawnListItem spawn={mockSpawn} />);

      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(toggleButton).toHaveAttribute("title", "Disable Test Spawn");
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
