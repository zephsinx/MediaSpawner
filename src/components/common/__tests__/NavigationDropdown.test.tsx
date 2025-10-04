import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { NavigationDropdown } from "../NavigationDropdown";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";

describe("NavigationDropdown", () => {
  beforeEach(() => {
    // Mock window.location for navigation tests
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/",
        href: "/",
      },
      writable: true,
    });
  });

  describe("Rendering", () => {
    it("renders primary Edit Assets button", () => {
      renderWithAllProviders(<NavigationDropdown />);

      expect(screen.getByText("Edit Assets")).toBeInTheDocument();
      expect(screen.getByLabelText("Edit Assets")).toBeInTheDocument();
    });

    it("renders with correct structure", () => {
      renderWithAllProviders(<NavigationDropdown />);

      // Should have a container div with flex layout
      const container = screen.getByText("Edit Assets").closest("div");
      expect(container).toHaveClass("flex", "items-center", "gap-2");
    });
  });

  describe("Navigation Functionality", () => {
    it("has correct href attribute for Edit Assets link", () => {
      renderWithAllProviders(<NavigationDropdown />);

      // Check primary Edit Assets link
      const editAssetsLink = screen.getByText("Edit Assets").closest("a");
      expect(editAssetsLink).toHaveAttribute("href", "/assets");
    });

    it("renders as a proper Link component", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const editAssetsLink = screen.getByText("Edit Assets").closest("a");
      expect(editAssetsLink).toHaveAttribute("data-discover", "true");
    });

    it("does not render dropdown when no additional actions exist", () => {
      renderWithAllProviders(<NavigationDropdown />);

      // Should not find any dropdown trigger or additional navigation options
      expect(
        screen.queryByLabelText("Additional navigation options")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /chevron/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      renderWithAllProviders(<NavigationDropdown />);

      expect(screen.getByLabelText("Edit Assets")).toBeInTheDocument();
    });

    it("has proper button structure", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const button = screen.getByRole("button", { name: "Edit Assets" });
      expect(button).toHaveAttribute("aria-disabled", "false");
    });

    it("has proper icon accessibility", () => {
      renderWithAllProviders(<NavigationDropdown />);

      // The icon should be properly hidden from screen readers
      const link = screen.getByRole("link", { name: "Edit Assets" });
      const svg = link.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Styling", () => {
    it("applies correct CSS classes to button", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const editAssetsButton = screen
        .getByText("Edit Assets")
        .closest("button");
      expect(editAssetsButton).toHaveClass("min-w-[140px]");
    });

    it("applies correct CSS classes to link", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const editAssetsLink = screen.getByText("Edit Assets").closest("a");
      expect(editAssetsLink).toHaveClass("flex", "items-center");
    });
  });

  describe("Component Props", () => {
    it("accepts className prop", () => {
      renderWithAllProviders(<NavigationDropdown className="custom-class" />);

      const container = screen.getByText("Edit Assets").closest("div");
      expect(container).toHaveClass("custom-class");
    });

    it("renders without className prop", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const container = screen.getByText("Edit Assets").closest("div");
      expect(container).toHaveClass("flex", "items-center", "gap-2");
    });
  });
});
