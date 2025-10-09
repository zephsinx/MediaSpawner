import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { Button } from "../Button";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";

// Mock react-router-dom Link component for asChild testing
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children: React.ReactNode;
      to: string;
      [key: string]: unknown;
    }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

// Import the mocked Link component
import { Link } from "react-router-dom";

describe("Button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders as button element by default", () => {
      renderWithAllProviders(<Button>Click me</Button>);

      const button = screen.getByRole("button", { name: "Click me" });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });

    it("renders with custom className", () => {
      renderWithAllProviders(
        <Button className="custom-class">Click me</Button>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("applies button variants correctly", () => {
      renderWithAllProviders(
        <Button variant="destructive" size="lg">
          Click me
        </Button>,
      );

      const button = screen.getByRole("button");
      // Check for some classes that should be present in destructive variant
      expect(button).toHaveClass("bg-[rgb(var(--color-error))]");
    });
  });

  describe("asChild=false (default behavior)", () => {
    it("renders as button element when asChild is false", () => {
      renderWithAllProviders(<Button asChild={false}>Click me</Button>);

      const button = screen.getByRole("button", { name: "Click me" });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });

    it("handles disabled state correctly", () => {
      renderWithAllProviders(<Button disabled>Click me</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    it("handles loading state correctly", () => {
      renderWithAllProviders(<Button loading>Click me</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");

      // Check for loading spinner
      const spinner = button.querySelector("svg");
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass("animate-spin");
    });

    it("handles click events", () => {
      const handleClick = vi.fn();
      renderWithAllProviders(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("asChild=true functionality", () => {
    it("renders as Slot when asChild is true", () => {
      renderWithAllProviders(
        <Button asChild>
          <Link to="/test">Click me</Link>
        </Button>,
      );

      const link = screen.getByRole("link", { name: "Click me" });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "/test");
    });

    it("renders without React warnings", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderWithAllProviders(
        <Button asChild>
          <Link to="/test">Click me</Link>
        </Button>,
      );

      // Should not have any React warnings about invalid props
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Invalid prop"),
      );

      consoleSpy.mockRestore();
    });

    it("filters out asChild prop from child element", () => {
      renderWithAllProviders(
        <Button asChild>
          <Link to="/test">Click me</Link>
        </Button>,
      );

      const link = screen.getByRole("link");
      // asChild prop should not be passed to the child element
      expect(link).not.toHaveAttribute("asChild");
    });
  });

  describe("Loading state with asChild", () => {
    it("renders with asChild when loading", () => {
      renderWithAllProviders(
        <Button asChild loading>
          <Link to="/test">Click me</Link>
        </Button>,
      );

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "/test");
    });
  });

  describe("Composition with different child elements", () => {
    it("works with div elements", () => {
      renderWithAllProviders(
        <Button asChild>
          <div data-testid="custom-div">Click me</div>
        </Button>,
      );

      const div = screen.getByTestId("custom-div");
      expect(div).toBeInTheDocument();
      expect(div.tagName).toBe("DIV");
    });

    it("works with span elements", () => {
      renderWithAllProviders(
        <Button asChild>
          <span data-testid="custom-span">Click me</span>
        </Button>,
      );

      const span = screen.getByTestId("custom-span");
      expect(span).toBeInTheDocument();
      expect(span.tagName).toBe("SPAN");
    });

    it("works with button elements", () => {
      renderWithAllProviders(
        <Button asChild>
          <button data-testid="custom-button">Click me</button>
        </Button>,
      );

      const button = screen.getByTestId("custom-button");
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });
  });

  describe("Ref forwarding", () => {
    it("forwards ref correctly with asChild=false", () => {
      const ref = vi.fn();
      renderWithAllProviders(<Button ref={ref}>Click me</Button>);

      expect(ref).toHaveBeenCalled();
    });

    it("forwards ref correctly with asChild=true", () => {
      const ref = vi.fn();
      renderWithAllProviders(
        <Button asChild ref={ref}>
          <Link to="/test">Click me</Link>
        </Button>,
      );

      expect(ref).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("maintains proper ARIA attributes with asChild=false", () => {
      renderWithAllProviders(
        <Button disabled aria-label="Custom button">
          Click me
        </Button>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Custom button");
      expect(button).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("Edge cases", () => {
    it("handles empty children with asChild", () => {
      renderWithAllProviders(
        <Button asChild>
          <Link to="/test" />
        </Button>,
      );

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });

    it("handles multiple children with asChild", () => {
      renderWithAllProviders(
        <Button asChild>
          <Link to="/test">
            <span>Icon</span>
            <span>Text</span>
          </Link>
        </Button>,
      );

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent("IconText");
    });

    it("handles undefined asChild prop", () => {
      renderWithAllProviders(<Button>Click me</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });
  });
});
