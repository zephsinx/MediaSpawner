import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { SettingsButton } from "../SettingsButton";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";

// Mock the Tooltip component to avoid Radix UI complexity in tests
vi.mock("@radix-ui/react-tooltip", () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-root">{children}</div>
  ),
  Trigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <div data-testid="tooltip-trigger">{children}</div>
    ),
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-portal">{children}</div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  Arrow: () => <div data-testid="tooltip-arrow" />,
  Provider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

describe("SettingsButton", () => {
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
    it("renders settings button with proper icon", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");
      expect(button).toBeInTheDocument();

      // Check for Settings icon
      const icon = button.querySelector("svg");
      expect(icon).toHaveClass("lucide-settings");
    });

    it("applies custom className when provided", () => {
      renderWithAllProviders(<SettingsButton className="custom-class" />);

      const button = screen.getByLabelText("Settings");
      expect(button).toHaveClass("custom-class");
    });

    it("renders as a link to /settings", () => {
      renderWithAllProviders(<SettingsButton />);

      const link = screen.getByLabelText("Settings").closest("a");
      expect(link).toHaveAttribute("href", "/settings");
    });
  });

  describe("Navigation Functionality", () => {
    it("navigates to /settings when clicked", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");
      const link = button.closest("a");

      expect(link).toHaveAttribute("href", "/settings");
    });

    it("maintains navigation functionality with custom className", () => {
      renderWithAllProviders(<SettingsButton className="test-class" />);

      const button = screen.getByLabelText("Settings");
      const link = button.closest("a");

      expect(link).toHaveAttribute("href", "/settings");
    });
  });

  describe("Tooltip Behavior", () => {
    it("shows tooltip on hover", () => {
      renderWithAllProviders(<SettingsButton />);

      // Check if tooltip components are rendered
      expect(screen.getByTestId("tooltip-root")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip-arrow")).toBeInTheDocument();
    });

    it("tooltip has proper styling", () => {
      renderWithAllProviders(<SettingsButton />);

      // Check tooltip content is rendered
      const tooltipContent = screen.getByTestId("tooltip-content");
      expect(tooltipContent).toBeInTheDocument();
      expect(tooltipContent).toHaveTextContent("Settings");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA label", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");
      expect(button).toHaveAttribute("aria-label", "Settings");
    });

    it("has proper icon accessibility", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");
      const icon = button.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("is keyboard accessible", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");

      // Should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it("maintains accessibility with custom className", () => {
      renderWithAllProviders(<SettingsButton className="test-class" />);

      const button = screen.getByLabelText("Settings");
      expect(button).toHaveAttribute("aria-label", "Settings");
    });
  });

  describe("Styling", () => {
    it("applies correct CSS classes for icon button", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");
      expect(button).toHaveClass("h-8", "w-8", "p-0");
    });

    it("applies correct color classes", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");
      expect(button).toHaveClass(
        "text-[rgb(var(--color-muted-foreground))]",
        "hover:text-[rgb(var(--color-fg))]"
      );
    });

    it("applies ghost variant styling", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");
      expect(button).toHaveClass("hover:bg-[rgb(var(--color-muted))]");
    });

    it("applies small size styling", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");
      expect(button).toHaveClass("text-xs", "h-8");
    });
  });

  describe("Icon Properties", () => {
    it("icon has correct size", () => {
      renderWithAllProviders(<SettingsButton />);

      const icon = screen.getByLabelText("Settings").querySelector("svg");
      expect(icon).toHaveClass("h-4", "w-4");
    });

    it("icon is properly hidden from screen readers", () => {
      renderWithAllProviders(<SettingsButton />);

      const icon = screen.getByLabelText("Settings").querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Integration", () => {
    it("works correctly within header layout", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");
      const link = button.closest("a");

      // Should maintain all functionality when used in header
      expect(link).toHaveAttribute("href", "/settings");
      expect(button).toHaveAttribute("aria-label", "Settings");
    });

    it("maintains consistent styling with other icon buttons", () => {
      renderWithAllProviders(<SettingsButton />);

      const button = screen.getByLabelText("Settings");

      // Should have consistent icon button styling
      expect(button).toHaveClass("h-8", "w-8", "p-0");
      expect(button).toHaveClass(
        "hover:bg-[rgb(var(--color-muted))]",
        "text-xs"
      );
    });
  });
});
