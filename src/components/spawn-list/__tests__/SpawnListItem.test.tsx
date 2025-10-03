import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import SpawnListItem from "../SpawnListItem";
import { createMockSpawn, renderSpawnList } from "./testUtils";

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
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      expect(screen.getByText("Test Spawn")).toBeInTheDocument();
    });

    it("renders spawn description when available", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      expect(screen.getByText("A test spawn description")).toBeInTheDocument();
    });

    it("does not render description when not available", async () => {
      const spawnWithoutDescription = createMockSpawn({
        description: undefined,
      });

      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={spawnWithoutDescription} />);
      });
      expect(
        screen.queryByText("A test spawn description")
      ).not.toBeInTheDocument();
    });

    it("renders asset count correctly", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
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
        renderSpawnList(<SpawnListItem spawn={spawnWithOneAsset} />);
      });
      expect(screen.getByText("1 asset")).toBeInTheDocument();
    });

    it("renders zero assets correctly", async () => {
      const spawnWithNoAssets = createMockSpawn({
        assets: [],
      });
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={spawnWithNoAssets} />);
      });
      expect(screen.getByText("0 assets")).toBeInTheDocument();
    });

    it("renders trigger type label", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const triggerElements = screen.getAllByText("Manual");
      expect(triggerElements.length).toBeGreaterThan(0);
    });

    it("renders overall status label", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  describe("Switch Component Integration", () => {
    it("renders Switch component for enabled spawn", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).toHaveAttribute("aria-checked", "true");
    });

    it("renders Switch component for disabled spawn", async () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={disabledSpawn} />);
      });
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeInTheDocument();
      expect(switchElement).toHaveAttribute("aria-checked", "false");
    });

    it("shows correct Switch state for enabled spawn", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-checked", "true");
    });

    it("shows correct Switch state for disabled spawn", async () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={disabledSpawn} />);
      });
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute("aria-checked", "false");
    });

    it("disables Switch when processing", async () => {
      await act(async () => {
        renderSpawnList(
          <SpawnListItem spawn={mockSpawn} isToggleProcessing={true} />
        );
      });
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toBeDisabled();
    });

    it("applies correct Switch size", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveClass("h-6", "w-11");
    });
  });

  describe("Basic Accessibility", () => {
    it("has proper role attribute for option", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const optionElement = screen.getByRole("option");
      expect(optionElement).toBeInTheDocument();
    });

    it("has proper aria-selected attribute", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} isSelected={true} />);
      });
      const optionElement = screen.getByRole("option");
      expect(optionElement).toHaveAttribute("aria-selected", "true");
    });

    it("has proper aria-selected attribute when not selected", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} isSelected={false} />);
      });
      const optionElement = screen.getByRole("option");
      expect(optionElement).toHaveAttribute("aria-selected", "false");
    });

    it("has proper aria-label with spawn information", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const optionElement = screen.getByRole("option");
      expect(optionElement).toHaveAttribute(
        "aria-label",
        "Spawn: Test Spawn. Enabled. 2 assets. Manual trigger."
      );
    });

    it("has proper aria-describedby reference", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const optionElement = screen.getByRole("option");
      expect(optionElement).toHaveAttribute(
        "aria-describedby",
        "spawn-spawn-1-description"
      );
    });

    it("has proper tabIndex for selected state", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} isSelected={true} />);
      });
      const optionElement = screen.getByRole("option");
      expect(optionElement).toHaveAttribute("tabindex", "0");
    });

    it("has proper tabIndex for unselected state", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} isSelected={false} />);
      });
      const optionElement = screen.getByRole("option");
      expect(optionElement).toHaveAttribute("tabindex", "-1");
    });

    it("has proper aria-label for toggle wrapper", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const toggleWrapper = screen.getByLabelText("Disable Test Spawn");
      expect(toggleWrapper).toBeInTheDocument();
    });

    it("has proper aria-describedby for toggle wrapper", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const toggleWrapper = screen.getByLabelText("Disable Test Spawn");
      expect(toggleWrapper).toHaveAttribute(
        "aria-describedby",
        "spawn-spawn-1-toggle-description"
      );
    });
  });

  describe("User Interactions", () => {
    it("calls onClick when spawn is clicked", async () => {
      const mockOnClick = vi.fn();
      await act(async () => {
        renderSpawnList(
          <SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />
        );
      });
      const optionElement = screen.getByRole("option");
      await act(async () => {
        fireEvent.click(optionElement);
      });
      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("calls onToggle when toggle wrapper is clicked", async () => {
      const mockOnToggle = vi.fn();
      await act(async () => {
        renderSpawnList(
          <SpawnListItem spawn={mockSpawn} onToggle={mockOnToggle} />
        );
      });
      const toggleWrapper = screen.getByLabelText("Disable Test Spawn");
      await act(async () => {
        fireEvent.click(toggleWrapper);
      });
      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
    });

    it("handles keyboard interaction on main container", async () => {
      const mockOnClick = vi.fn();
      await act(async () => {
        renderSpawnList(
          <SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />
        );
      });
      const optionElement = screen.getByRole("option");
      await act(async () => {
        fireEvent.keyDown(optionElement, { key: "Enter" });
      });
      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("handles space key on main container", async () => {
      const mockOnClick = vi.fn();
      await act(async () => {
        renderSpawnList(
          <SpawnListItem spawn={mockSpawn} onClick={mockOnClick} />
        );
      });
      const optionElement = screen.getByRole("option");
      await act(async () => {
        fireEvent.keyDown(optionElement, { key: " " });
      });
      expect(mockOnClick).toHaveBeenCalledWith(mockSpawn);
    });

    it("handles keyboard interaction on toggle wrapper", async () => {
      const mockOnToggle = vi.fn();
      await act(async () => {
        renderSpawnList(
          <SpawnListItem spawn={mockSpawn} onToggle={mockOnToggle} />
        );
      });
      const toggleWrapper = screen.getByLabelText("Disable Test Spawn");
      await act(async () => {
        fireEvent.keyDown(toggleWrapper, { key: "Enter" });
      });
      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
    });

    it("handles space key on toggle wrapper", async () => {
      const mockOnToggle = vi.fn();
      await act(async () => {
        renderSpawnList(
          <SpawnListItem spawn={mockSpawn} onToggle={mockOnToggle} />
        );
      });
      const toggleWrapper = screen.getByLabelText("Disable Test Spawn");
      await act(async () => {
        fireEvent.keyDown(toggleWrapper, { key: " " });
      });
      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
    });

    it("prevents event propagation when toggle is clicked", async () => {
      const mockOnClick = vi.fn();
      const mockOnToggle = vi.fn();
      await act(async () => {
        renderSpawnList(
          <SpawnListItem
            spawn={mockSpawn}
            onClick={mockOnClick}
            onToggle={mockOnToggle}
          />
        );
      });
      const toggleWrapper = screen.getByLabelText("Disable Test Spawn");
      await act(async () => {
        fireEvent.click(toggleWrapper);
      });
      expect(mockOnToggle).toHaveBeenCalledWith(mockSpawn, false);
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("does not call onToggle when processing", async () => {
      const mockOnToggle = vi.fn();
      await act(async () => {
        renderSpawnList(
          <SpawnListItem
            spawn={mockSpawn}
            onToggle={mockOnToggle}
            isToggleProcessing={true}
          />
        );
      });
      const toggleWrapper = screen.getByLabelText("Disable Test Spawn");
      await act(async () => {
        fireEvent.click(toggleWrapper);
      });
      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe("Visual States", () => {
    it("applies base styling classes", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
        container = r.container;
      });
      // @ts-expect-error assigned above
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass(
        "p-3",
        "border-b",
        "cursor-pointer",
        "transition-colors"
      );
    });

    it("applies selected styling when isSelected is true", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = renderSpawnList(
          <SpawnListItem spawn={mockSpawn} isSelected={true} />
        );
        container = r.container;
      });
      // @ts-expect-error container is assigned
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass(
        "bg-[rgb(var(--color-accent))]/5",
        "border-[rgb(var(--color-accent))]"
      );
    });

    it("applies disabled opacity when spawn is disabled", async () => {
      const disabledSpawn = createMockSpawn({
        enabled: false,
      });
      let container: HTMLElement;
      await act(async () => {
        const r = renderSpawnList(<SpawnListItem spawn={disabledSpawn} />);
        container = r.container;
      });
      // @ts-expect-error container is assigned
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass("opacity-60");
    });

    it("applies processing styling when toggle is processing", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = renderSpawnList(
          <SpawnListItem spawn={mockSpawn} isToggleProcessing={true} />
        );
        container = r.container;
      });
      // @ts-expect-error container is assigned
      const toggleWrapper = container.querySelector('[aria-label*="Disable"]');
      expect(toggleWrapper).toHaveClass("opacity-50", "cursor-not-allowed");
    });

    it("applies CSS variables for theming", async () => {
      let container: HTMLElement;
      await act(async () => {
        const r = renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
        container = r.container;
      });
      // @ts-expect-error container is assigned
      const listItem = container.firstChild as HTMLElement;
      expect(listItem).toHaveClass(
        "border-[rgb(var(--color-border))]",
        "hover:bg-[rgb(var(--color-muted))]/5",
        "focus-visible:ring-[rgb(var(--color-ring))]"
      );
    });
  });

  describe("Screen Reader Support", () => {
    it("renders screen reader description", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const description = screen.getByText(
        "Description: A test spawn description. Trigger: Manual — Manual. Status: Active."
      );
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass("sr-only");
    });

    it("renders screen reader toggle description", async () => {
      await act(async () => {
        renderSpawnList(<SpawnListItem spawn={mockSpawn} />);
      });
      const toggleDescription = screen.getByText(
        "Toggle to disable this spawn."
      );
      expect(toggleDescription).toBeInTheDocument();
      expect(toggleDescription).toHaveClass("sr-only");
    });

    it("renders processing state in toggle description", async () => {
      await act(async () => {
        renderSpawnList(
          <SpawnListItem spawn={mockSpawn} isToggleProcessing={true} />
        );
      });
      const toggleDescription = document.getElementById(
        "spawn-spawn-1-toggle-description"
      );
      expect(toggleDescription).toBeInTheDocument();
      expect(toggleDescription).toHaveClass("sr-only");
      expect(toggleDescription?.textContent).toContain(
        "Toggle to disable this spawn"
      );
      expect(toggleDescription?.textContent).toContain("Processing request...");
    });
  });
});
