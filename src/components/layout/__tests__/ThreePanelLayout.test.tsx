import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import ThreePanelLayout from "../ThreePanelLayout";
import { renderWithLayoutProvider } from "./testUtils";

describe("ThreePanelLayout", () => {
  const mockLeftPanel = <div data-testid="left-panel">Left Panel Content</div>;
  const mockCenterPanel = (
    <div data-testid="center-panel">Center Panel Content</div>
  );
  const mockRightPanel = (
    <div data-testid="right-panel">Right Panel Content</div>
  );

  describe("Basic Rendering", () => {
    it("renders all three panels with provided content", () => {
      renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      expect(screen.getByTestId("left-panel")).toBeInTheDocument();
      expect(screen.getByTestId("center-panel")).toBeInTheDocument();
      expect(screen.getByTestId("right-panel")).toBeInTheDocument();
    });

    it("applies correct CSS classes for grid layout", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      const gridContainer = container.querySelector(".grid.grid-cols-12");
      expect(gridContainer).toBeInTheDocument();
    });

    it("applies minimum width constraint to container", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      const gridContainer = container.querySelector(".min-w-\\[1280px\\]");
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe("Panel Width Distribution", () => {
    it("applies correct column spans for 25%/50%/25% distribution", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      const leftPanel = container.querySelector(".col-span-3");
      const centerPanel = container.querySelector(".col-span-6");
      const rightPanel = container.querySelector(".col-span-3");

      expect(leftPanel).toBeInTheDocument();
      expect(centerPanel).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();
    });

    it("applies minimum widths to prevent unusable panels", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      const leftPanel = container.querySelector(".min-w-\\[320px\\]");
      const centerPanel = container.querySelector(".min-w-\\[640px\\]");
      const rightPanel = container.querySelector(".min-w-\\[320px\\]");

      expect(leftPanel).toBeInTheDocument();
      expect(centerPanel).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();
    });
  });

  describe("Panel Styling", () => {
    it("applies correct background colors and borders", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      const panels = container.querySelectorAll(".bg-white");
      expect(panels).toHaveLength(4); // Header + 3 panels

      const leftPanel = container.querySelector(".col-span-3");
      const centerPanel = container.querySelector(".col-span-6");
      const rightPanel = container.querySelector(".col-span-3:last-child");

      expect(leftPanel).toHaveClass("border-r", "border-gray-200");
      expect(centerPanel).toHaveClass("border-r", "border-gray-200");
      expect(rightPanel).not.toHaveClass("border-r");
    });

    it("applies overflow handling to prevent content overflow", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      const panels = container.querySelectorAll(".overflow-hidden");
      expect(panels).toHaveLength(3);
    });
  });

  describe("Optional Props", () => {
    it("applies optional className prop correctly", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
          className="custom-class"
        />
      );

      const layoutContainer = container.firstChild as HTMLElement;
      expect(layoutContainer).toHaveClass("custom-class");
    });

    it("works without optional className prop", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      const layoutContainer = container.firstChild as HTMLElement;
      expect(layoutContainer).toHaveClass("min-h-screen", "bg-gray-50");
    });
  });

  describe("Responsive Design", () => {
    it("maintains full height layout", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      const gridContainer = container.querySelector(
        ".h-\\[calc\\(100vh-80px\\)\\]"
      );
      expect(gridContainer).toBeInTheDocument();
    });

    it("ensures panels have proper height containers", () => {
      const { container } = renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={mockLeftPanel}
          centerPanel={mockCenterPanel}
          rightPanel={mockRightPanel}
        />
      );

      const panelContainers = container.querySelectorAll(".h-full");
      expect(panelContainers).toHaveLength(3);
    });
  });

  describe("Content Rendering", () => {
    it("renders complex content in panels", () => {
      const complexLeftPanel = (
        <div data-testid="complex-left">
          <h1>Title</h1>
          <p>Description</p>
          <button>Action</button>
        </div>
      );

      const complexCenterPanel = (
        <div data-testid="complex-center">
          <form>
            <input type="text" />
            <button type="submit">Submit</button>
          </form>
        </div>
      );

      const complexRightPanel = (
        <div data-testid="complex-right">
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      );

      renderWithLayoutProvider(
        <ThreePanelLayout
          leftPanel={complexLeftPanel}
          centerPanel={complexCenterPanel}
          rightPanel={complexRightPanel}
        />
      );

      expect(screen.getByTestId("complex-left")).toBeInTheDocument();
      expect(screen.getByTestId("complex-center")).toBeInTheDocument();
      expect(screen.getByTestId("complex-right")).toBeInTheDocument();
      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Submit")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });
  });
});
