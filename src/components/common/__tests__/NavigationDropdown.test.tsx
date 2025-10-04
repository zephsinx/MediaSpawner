import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
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
      expect(
        screen.getByLabelText("Additional navigation options")
      ).toBeInTheDocument();
    });

    it("renders dropdown trigger button", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const dropdownTrigger = screen.getByLabelText(
        "Additional navigation options"
      );
      expect(dropdownTrigger).toBeInTheDocument();
    });
  });

  describe("Navigation Functionality", () => {
    it("has correct href attribute for Edit Assets link", () => {
      renderWithAllProviders(<NavigationDropdown />);

      // Check primary Edit Assets link
      const editAssetsLink = screen.getByText("Edit Assets").closest("a");
      expect(editAssetsLink).toHaveAttribute("href", "/assets");
    });

    it("dropdown is empty when opened (no additional navigation items)", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const dropdownTrigger = screen.getByLabelText(
        "Additional navigation options"
      );
      fireEvent.click(dropdownTrigger);

      // Should not find any Settings or other dropdown items
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      renderWithAllProviders(<NavigationDropdown />);

      expect(screen.getByLabelText("Edit Assets")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Additional navigation options")
      ).toBeInTheDocument();
    });

    it("has proper ARIA attributes on dropdown trigger", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const dropdownTrigger = screen.getByLabelText(
        "Additional navigation options"
      );
      expect(dropdownTrigger).toHaveAttribute("aria-haspopup", "menu");
      expect(dropdownTrigger).toHaveAttribute("aria-expanded", "false");
    });

    it("dropdown trigger maintains accessibility when opened", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const dropdownTrigger = screen.getByLabelText(
        "Additional navigation options"
      );
      fireEvent.click(dropdownTrigger);

      // Dropdown trigger should still be accessible
      expect(dropdownTrigger).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct CSS classes", () => {
      renderWithAllProviders(<NavigationDropdown />);

      const editAssetsButton = screen
        .getByText("Edit Assets")
        .closest("button");
      expect(editAssetsButton).toHaveClass("min-w-[140px]");

      const dropdownTrigger = screen.getByLabelText(
        "Additional navigation options"
      );
      expect(dropdownTrigger).toHaveClass("px-2");
    });
  });
});
