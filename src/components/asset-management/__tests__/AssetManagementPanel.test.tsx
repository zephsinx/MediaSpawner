import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AssetManagementPanel from "../AssetManagementPanel";

describe("AssetManagementPanel (MS-32)", () => {
  describe("Basic Rendering", () => {
    it("renders two sections with correct headers", () => {
      render(<AssetManagementPanel />);

      expect(screen.getByText("Assets in Current Spawn")).toBeInTheDocument();
      expect(screen.getByText("Asset Library")).toBeInTheDocument();
    });
  });

  describe("Layout and Styling", () => {
    it("applies flex column layout and overflow handling to container", () => {
      const { container } = render(<AssetManagementPanel />);
      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass("h-full", "flex", "flex-col", "overflow-hidden");
    });

    it("applies min-heights and border separation to sections", () => {
      const { container } = render(<AssetManagementPanel />);
      const sections = container.querySelectorAll("section");
      expect(sections).toHaveLength(2);

      const top = sections[0] as HTMLElement;
      const bottom = sections[1] as HTMLElement;

      expect(top).toHaveClass("min-h-[80px]", "border-b", "border-gray-200");
      expect(bottom).toHaveClass("min-h-[200px]");
    });

    it("uses sticky-like headers and scrollable content areas", () => {
      const { container } = render(<AssetManagementPanel />);
      const headers = container.querySelectorAll(
        ".bg-gray-50.border-b.border-gray-200"
      );
      expect(headers).toHaveLength(2);

      const scrollers = container.querySelectorAll(".flex-1.overflow-auto");
      expect(scrollers).toHaveLength(2);
    });
  });
});
