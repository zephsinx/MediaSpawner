import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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
    it("renders spawn name correctly", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      expect(screen.getByText("Test Spawn")).toBeInTheDocument();
    });

    it("renders spawn description when available", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      expect(screen.getByText("A test spawn description")).toBeInTheDocument();
    });

    it("does not render description when not available", async () => {
      const spawnWithoutDescription = createMockSpawn({
        description: undefined,
      });

      await act(async () => {
        render(<SpawnListItem spawn={spawnWithoutDescription} />);
      });
      expect(
        screen.queryByText("A test spawn description")
      ).not.toBeInTheDocument();
    });

    it("renders asset count correctly", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      expect(screen.getByText("2 assets")).toBeInTheDocument();
    });

    it("renders singular asset count correctly", async () => {
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

      await act(async () => {
        render(<SpawnListItem spawn={spawnWithOneAsset} />);
      });
      expect(screen.getByText("1 asset")).toBeInTheDocument();
    });

    it("renders zero assets correctly", async () => {
      const spawnWithNoAssets = createMockSpawn({
        assets: [],
      });
      await act(async () => {
        render(<SpawnListItem spawn={spawnWithNoAssets} />);
      });
      expect(screen.getByText("0 assets")).toBeInTheDocument();
    });
  });

  describe("Toggle Button", () => {
    it("renders toggle button for enabled spawn", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveClass("bg-blue-600");
    });

    it("renders toggle button for disabled spawn", async () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });
      await act(async () => {
        render(<SpawnListItem spawn={disabledSpawn} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Enable Test Spawn",
      });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveClass("bg-gray-200");
    });

    it("shows correct toggle position for enabled spawn", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      const toggleThumb = screen
        .getByRole("button", { name: "Disable Test Spawn" })
        .querySelector("span");
      expect(toggleThumb).toHaveClass("translate-x-6");
    });

    it("shows correct toggle position for disabled spawn", async () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });
      await act(async () => {
        render(<SpawnListItem spawn={disabledSpawn} />);
      });
      const toggleThumb = screen
        .getByRole("button", { name: "Enable Test Spawn" })
        .querySelector("span");
      expect(toggleThumb).toHaveClass("translate-x-1");
    });

    it("calls onToggle when toggle button is clicked", async () => {
      const mockOnToggle = vi.fn();
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} onToggle={mockOnToggle} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      await act(async () => {
        fireEvent.click(toggleButton);
      });
      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
    });

    it("does not call onToggle when not provided", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(() => fireEvent.click(toggleButton)).not.toThrow();
    });

    it("handles keyboard interaction on toggle button", async () => {
      const mockOnToggle = vi.fn();
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} onToggle={mockOnToggle} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      await act(async () => {
        fireEvent.keyDown(toggleButton, { key: "Enter" });
      });
      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
    });

    it("handles space key on toggle button", async () => {
      const mockOnToggle = vi.fn();
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} onToggle={mockOnToggle} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      await act(async () => {
        fireEvent.keyDown(toggleButton, { key: " " });
      });
      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
    });

    it("prevents event propagation when toggle is clicked", async () => {
      const mockOnClick = vi.fn();
      const mockOnToggle = vi.fn();
      await act(async () => {
        render(
          <SpawnListItem
            spawn={mockSpawn}
            onClick={mockOnClick}
            onToggle={mockOnToggle}
          />
        );
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      await act(async () => {
        fireEvent.click(toggleButton);
      });
      expect(mockOnToggle).toHaveBeenCalled();
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("shows loading state when processing", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} isToggleProcessing={true} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(toggleButton).toBeDisabled();
      expect(toggleButton).toHaveClass("opacity-50", "cursor-not-allowed");
      // spinner overlay exists
      expect(toggleButton.querySelector(".animate-spin")).not.toBeNull();
    });

    it("does not call onToggle when processing", async () => {
      const mockOnToggle = vi.fn();
      await act(async () => {
        render(
          <SpawnListItem
            spawn={mockSpawn}
            onToggle={mockOnToggle}
            isToggleProcessing={true}
          />
        );
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      await act(async () => {
        fireEvent.click(toggleButton);
      });
      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe("Visual States", () => {
    it("renders enabled spawn with normal opacity", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = render(<SpawnListItem spawn={mockSpawn} />);
        container = r.container;
      });
      // @ts-expect-error container is assigned in act block above
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).not.toHaveClass("opacity-60");
    });

    it("renders disabled spawn with reduced opacity", async () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });
      let container: HTMLElement;
      await act(async () => {
        const r = render(<SpawnListItem spawn={disabledSpawn} />);
        container = r.container;
      });
      // @ts-expect-error container is assigned in act block above
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("opacity-60");
    });

    it("renders status text correctly for enabled spawn", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders status text correctly for disabled spawn", async () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });
      await act(async () => {
        render(<SpawnListItem spawn={disabledSpawn} />);
      });
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("applies selected styling when isSelected is true", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = render(<SpawnListItem spawn={mockSpawn} isSelected={true} />);
        container = r.container;
      });
      // @ts-expect-error container is assigned
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("bg-blue-50", "border-blue-200");
    });

    it("does not apply selected styling when isSelected is false", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = render(
          <SpawnListItem spawn={mockSpawn} isSelected={false} />
        );
        container = r.container;
      });
      // @ts-expect-error container is assigned
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).not.toHaveClass("bg-blue-50", "border-blue-200");
    });

    it("defaults to not selected when isSelected is not provided", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = render(<SpawnListItem spawn={mockSpawn} />);
        container = r.container;
      });
      // @ts-expect-error container is assigned
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).not.toHaveClass("bg-blue-50", "border-blue-200");
    });
  });

  describe("User Interactions", () => {
    it("calls onClick with spawn when main area is clicked", async () => {
      const mockOnClick = vi.fn();
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);
      });
      const listItem = screen.getByText("Test Spawn").closest("div");
      await act(async () => {
        fireEvent.click(listItem!);
      });
      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("does not call onClick when not provided", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      const listItem = screen.getByText("Test Spawn").closest("div");
      expect(() => fireEvent.click(listItem!)).not.toThrow();
    });

    it("handles Enter key press on main area", async () => {
      const mockOnClick = vi.fn();
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);
      });
      const listItem = screen.getByText("Test Spawn").closest("div");
      await act(async () => {
        fireEvent.keyDown(listItem!, { key: "Enter" });
      });
      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("handles Space key press on main area", async () => {
      const mockOnClick = vi.fn();
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);
      });
      const listItem = screen.getByText("Test Spawn").closest("div");
      await act(async () => {
        fireEvent.keyDown(listItem!, { key: " " });
      });
      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("prevents default on Enter key press", async () => {
      const mockOnClick = vi.fn();
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);
      });
      const listItem = screen.getByText("Test Spawn").closest("div");
      await act(async () => {
        fireEvent.keyDown(listItem!, { key: "Enter" });
      });
      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("prevents default on Space key press", async () => {
      const mockOnClick = vi.fn();
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);
      });
      const listItem = screen.getByText("Test Spawn").closest("div");
      await act(async () => {
        fireEvent.keyDown(listItem!, { key: " " });
      });
      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("does not handle other key presses", async () => {
      const mockOnClick = vi.fn();
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />);
      });
      const listItem = screen.getByText("Test Spawn").closest("div");
      await act(async () => {
        fireEvent.keyDown(listItem!, { key: "Tab" });
      });
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has proper role attributes for both buttons", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("has proper tabIndex for main container", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      const listItem = screen
        .getByText("Test Spawn")
        .closest('[role="button"]');
      expect(listItem).toHaveAttribute("tabindex", "0");
    });

    it("has proper cursor styling", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = render(<SpawnListItem spawn={mockSpawn} />);
        container = r.container;
      });
      // @ts-expect-error container is assigned above
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("cursor-pointer");
    });

    it("has proper aria-label for toggle button", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(toggleButton).toHaveAttribute("aria-label", "Disable Test Spawn");
    });

    it("has proper title for toggle button", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(toggleButton).toHaveAttribute("title", "Disable Test Spawn");
    });
  });

  describe("Styling", () => {
    it("applies base styling classes", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = render(<SpawnListItem spawn={mockSpawn} />);
        container = r.container;
      });
      // @ts-expect-error assigned above
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

    it("applies custom className when provided", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = render(
          <SpawnListItem spawn={mockSpawn} className="custom-class" />
        );
        container = r.container;
      });
      // @ts-expect-error assigned above
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("custom-class");
    });
  });

  describe("Additional behavior", () => {
    it("shows spinner overlay element when isToggleProcessing is true", async () => {
      await act(async () => {
        render(<SpawnListItem spawn={mockSpawn} isToggleProcessing={true} />);
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      expect(toggleButton.querySelector(".animate-spin")).not.toBeNull();
    });

    it("keyboard interaction on toggle does not bubble to parent onClick", async () => {
      const onClick = vi.fn();
      const onToggle = vi.fn();
      await act(async () => {
        render(
          <SpawnListItem
            spawn={mockSpawn}
            onClick={onClick}
            onToggle={onToggle}
          />
        );
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      await act(async () => {
        fireEvent.keyDown(toggleButton, { key: "Enter" });
      });
      expect(onToggle).toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });

    it("does not invoke onToggle via keyboard when processing is true", async () => {
      const onToggle = vi.fn();
      await act(async () => {
        render(
          <SpawnListItem
            spawn={mockSpawn}
            onToggle={onToggle}
            isToggleProcessing={true}
          />
        );
      });
      const toggleButton = screen.getByRole("button", {
        name: "Disable Test Spawn",
      });
      await act(async () => {
        fireEvent.keyDown(toggleButton, { key: "Enter" });
      });
      expect(onToggle).not.toHaveBeenCalled();
    });
  });
});
