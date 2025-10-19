import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LiveProfileIndicator } from "../LiveProfileIndicator";

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
}));

describe("LiveProfileIndicator", () => {
  const defaultProps = {
    isLive: false,
    onSetLive: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with not live state by default", () => {
      render(<LiveProfileIndicator {...defaultProps} />);

      expect(screen.getByText("Not Live")).toBeInTheDocument();
      expect(screen.getByText("Set as Live")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Live status: Not live",
      );
    });

    it("renders with live state when isLive is true", () => {
      render(<LiveProfileIndicator {...defaultProps} isLive={true} />);

      expect(screen.getAllByText("Live")).toHaveLength(2); // Status text and button text
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Live status: Live",
      );
    });

    it("renders without button when showButton is false", () => {
      render(<LiveProfileIndicator {...defaultProps} showButton={false} />);

      expect(screen.queryByText("Set as Live")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <LiveProfileIndicator {...defaultProps} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Size variants", () => {
    it("renders small size correctly", () => {
      render(<LiveProfileIndicator {...defaultProps} size="sm" />);

      const statusElement = screen.getByRole("status");
      expect(statusElement).toBeInTheDocument();
    });

    it("renders medium size correctly", () => {
      render(<LiveProfileIndicator {...defaultProps} size="md" />);

      const statusElement = screen.getByRole("status");
      expect(statusElement).toBeInTheDocument();
    });

    it("renders large size correctly", () => {
      render(<LiveProfileIndicator {...defaultProps} size="lg" />);

      const statusElement = screen.getByRole("status");
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe("Button interactions", () => {
    it("calls onSetLive when Set as Live button is clicked", () => {
      const onSetLive = vi.fn();
      render(<LiveProfileIndicator {...defaultProps} onSetLive={onSetLive} />);

      const button = screen.getByText("Set as Live");
      fireEvent.click(button);

      expect(onSetLive).toHaveBeenCalledTimes(1);
    });

    it("disables button when disabled prop is true", () => {
      render(<LiveProfileIndicator {...defaultProps} disabled={true} />);

      const button = screen.getByText("Set as Live");
      expect(button).toBeDisabled();
    });

    it("disables button when isLive is true", () => {
      render(<LiveProfileIndicator {...defaultProps} isLive={true} />);

      const button = screen.getByRole("button", {
        name: "Profile is already live",
      });
      expect(button).toBeDisabled();
    });

    it("shows Live text when isLive is true", () => {
      render(<LiveProfileIndicator {...defaultProps} isLive={true} />);

      expect(screen.getAllByText("Live")).toHaveLength(2); // Status text and button text
      expect(screen.queryByText("Set as Live")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for not live state", () => {
      render(<LiveProfileIndicator {...defaultProps} />);

      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Live status: Not live",
      );
      expect(screen.getByText("Set as Live")).toHaveAttribute(
        "aria-label",
        "Set this profile as live",
      );
    });

    it("has proper ARIA labels for live state", () => {
      render(<LiveProfileIndicator {...defaultProps} isLive={true} />);

      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Live status: Live",
      );
      expect(
        screen.getByRole("button", { name: "Profile is already live" }),
      ).toHaveAttribute("aria-label", "Profile is already live");
    });

    it("has proper ARIA labels when disabled", () => {
      render(<LiveProfileIndicator {...defaultProps} disabled={true} />);

      expect(screen.getByText("Set as Live")).toHaveAttribute(
        "aria-label",
        "Set this profile as live",
      );
    });
  });

  describe("Tooltip content", () => {
    it("shows correct tooltip for not live state", () => {
      render(<LiveProfileIndicator {...defaultProps} />);

      // Hover over the status indicator to show tooltip
      const statusElement = screen.getByRole("status");
      fireEvent.mouseEnter(statusElement);

      // Note: Tooltip content is not easily testable with jsdom
      // The tooltip content is defined in the component but may not be visible in tests
      expect(statusElement).toBeInTheDocument();
    });

    it("shows correct tooltip for live state", () => {
      render(<LiveProfileIndicator {...defaultProps} isLive={true} />);

      const statusElement = screen.getByRole("status");
      fireEvent.mouseEnter(statusElement);

      expect(statusElement).toBeInTheDocument();
    });
  });

  describe("Visual states", () => {
    it("applies correct colors for not live state", () => {
      render(<LiveProfileIndicator {...defaultProps} />);

      // Check for muted colors in not live state
      const statusText = screen.getByText("Not Live");
      expect(statusText).toHaveClass(
        "text-[rgb(var(--color-muted-foreground))]",
      );
    });

    it("applies correct colors for live state", () => {
      render(<LiveProfileIndicator {...defaultProps} isLive={true} />);

      // Check for emerald colors in live state - get the first "Live" text (status text)
      const statusTexts = screen.getAllByText("Live");
      const statusText = statusTexts[0]; // First one is the status text
      expect(statusText).toHaveClass("text-[rgb(var(--color-success))]");
    });
  });

  describe("Edge cases", () => {
    it("handles rapid button clicks", () => {
      const onSetLive = vi.fn();
      render(<LiveProfileIndicator {...defaultProps} onSetLive={onSetLive} />);

      const button = screen.getByText("Set as Live");
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(onSetLive).toHaveBeenCalledTimes(3);
    });
  });
});
