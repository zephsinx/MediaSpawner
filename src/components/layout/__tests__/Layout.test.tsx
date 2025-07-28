import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Layout from "../Layout";

describe("Layout", () => {
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

    it("renders all three placeholder components", () => {
      render(<Layout />);

      // Check for spawn navigation placeholder
      expect(screen.getByText("Spawn List")).toBeInTheDocument();
      expect(
        screen.getByText("spawn navigation and management")
      ).toBeInTheDocument();

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

    it("renders placeholder icons correctly", () => {
      render(<Layout />);

      expect(screen.getAllByText("📋")).toHaveLength(2); // Spawn List (header + content)
      expect(screen.getAllByText("⚙️")).toHaveLength(2); // Configuration (header + content)
      expect(screen.getAllByText("📁")).toHaveLength(2); // Asset Management (header + content)
    });

    it("renders 'Coming Soon' messages for all panels", () => {
      render(<Layout />);

      expect(screen.getByText("Spawn List Coming Soon")).toBeInTheDocument();
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
      expect(panels).toHaveLength(3);

      const leftPanel = container.querySelector(".col-span-3");
      const centerPanel = container.querySelector(".col-span-6");

      expect(leftPanel).toHaveClass("border-r", "border-gray-200");
      expect(centerPanel).toHaveClass("border-r", "border-gray-200");
    });
  });

  describe("Responsive Design", () => {
    it("maintains full height layout", () => {
      const { container } = render(<Layout />);

      const gridContainer = container.querySelector(".h-screen");
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
