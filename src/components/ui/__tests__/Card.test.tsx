import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../Card";
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

describe("Card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders as div element by default", () => {
      renderWithAllProviders(<Card>Card content</Card>);

      const card = screen.getByText("Card content");
      expect(card).toBeInTheDocument();
      expect(card.tagName).toBe("DIV");
    });

    it("renders with custom className", () => {
      renderWithAllProviders(
        <Card className="custom-class">Card content</Card>,
      );

      const card = screen.getByText("Card content");
      expect(card).toHaveClass("custom-class");
    });

    it("applies card variants correctly", () => {
      renderWithAllProviders(<Card variant="default">Card content</Card>);

      const card = screen.getByText("Card content");
      // Check for some classes that should be present in card variant
      expect(card).toHaveClass("rounded-lg");
    });
  });

  describe("asChild=false (default behavior)", () => {
    it("renders as div element when asChild is false", () => {
      renderWithAllProviders(<Card asChild={false}>Card content</Card>);

      const card = screen.getByText("Card content");
      expect(card).toBeInTheDocument();
      expect(card.tagName).toBe("DIV");
    });

    it("handles click events", () => {
      const handleClick = vi.fn();
      renderWithAllProviders(<Card onClick={handleClick}>Card content</Card>);

      const card = screen.getByText("Card content");
      card.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("asChild=true functionality", () => {
    it("renders as Slot when asChild is true", () => {
      renderWithAllProviders(
        <Card asChild>
          <Link to="/test">Card content</Link>
        </Card>,
      );

      const link = screen.getByRole("link", { name: "Card content" });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "/test");
    });

    it("renders without React warnings", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderWithAllProviders(
        <Card asChild>
          <Link to="/test">Card content</Link>
        </Card>,
      );

      // Should not have any React warnings about invalid props
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Invalid prop"),
      );

      consoleSpy.mockRestore();
    });

    it("filters out asChild prop from child element", () => {
      renderWithAllProviders(
        <Card asChild>
          <Link to="/test">Card content</Link>
        </Card>,
      );

      const link = screen.getByRole("link");
      // asChild prop should not be passed to the child element
      expect(link).not.toHaveAttribute("asChild");
    });
  });

  describe("Composition with different child elements", () => {
    it("works with div elements", () => {
      renderWithAllProviders(
        <Card asChild>
          <div data-testid="custom-div">Card content</div>
        </Card>,
      );

      const div = screen.getByTestId("custom-div");
      expect(div).toBeInTheDocument();
      expect(div.tagName).toBe("DIV");
    });

    it("works with span elements", () => {
      renderWithAllProviders(
        <Card asChild>
          <span data-testid="custom-span">Card content</span>
        </Card>,
      );

      const span = screen.getByTestId("custom-span");
      expect(span).toBeInTheDocument();
      expect(span.tagName).toBe("SPAN");
    });

    it("works with section elements", () => {
      renderWithAllProviders(
        <Card asChild>
          <section data-testid="custom-section">Card content</section>
        </Card>,
      );

      const section = screen.getByTestId("custom-section");
      expect(section).toBeInTheDocument();
      expect(section.tagName).toBe("SECTION");
    });
  });

  describe("Ref forwarding", () => {
    it("forwards ref correctly with asChild=false", () => {
      const ref = vi.fn();
      renderWithAllProviders(<Card ref={ref}>Card content</Card>);

      expect(ref).toHaveBeenCalled();
    });

    it("forwards ref correctly with asChild=true", () => {
      const ref = vi.fn();
      renderWithAllProviders(
        <Card asChild ref={ref}>
          <Link to="/test">Card content</Link>
        </Card>,
      );

      expect(ref).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("maintains proper ARIA attributes with asChild=false", () => {
      renderWithAllProviders(
        <Card role="article" aria-label="Custom card">
          Card content
        </Card>,
      );

      const card = screen.getByRole("article");
      expect(card).toHaveAttribute("aria-label", "Custom card");
    });

    it("passes through ARIA attributes with asChild=true", () => {
      renderWithAllProviders(
        <Card asChild role="article" aria-label="Custom card">
          <Link to="/test">Card content</Link>
        </Card>,
      );

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("aria-label", "Custom card");
    });
  });

  describe("Edge cases", () => {
    it("handles empty children with asChild", () => {
      renderWithAllProviders(
        <Card asChild>
          <Link to="/test" />
        </Card>,
      );

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });

    it("handles multiple children with asChild", () => {
      renderWithAllProviders(
        <Card asChild>
          <Link to="/test">
            <span>Icon</span>
            <span>Text</span>
          </Link>
        </Card>,
      );

      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent("IconText");
    });

    it("handles undefined asChild prop", () => {
      renderWithAllProviders(<Card>Card content</Card>);

      const card = screen.getByText("Card content");
      expect(card).toBeInTheDocument();
      expect(card.tagName).toBe("DIV");
    });
  });
});

describe("CardHeader", () => {
  it("renders as div element", () => {
    renderWithAllProviders(<CardHeader>Header content</CardHeader>);

    const header = screen.getByText("Header content");
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe("DIV");
  });

  it("applies correct className", () => {
    renderWithAllProviders(
      <CardHeader className="custom-class">Header content</CardHeader>,
    );

    const header = screen.getByText("Header content");
    expect(header).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    renderWithAllProviders(<CardHeader ref={ref}>Header content</CardHeader>);

    expect(ref).toHaveBeenCalled();
  });
});

describe("CardTitle", () => {
  it("renders as h3 element by default", () => {
    renderWithAllProviders(<CardTitle>Title content</CardTitle>);

    const title = screen.getByText("Title content");
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe("H3");
  });

  it("renders as specified heading level when as prop is provided", () => {
    renderWithAllProviders(<CardTitle as="h2">Title content</CardTitle>);

    const title = screen.getByText("Title content");
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe("H2");
  });

  it("applies correct className", () => {
    renderWithAllProviders(
      <CardTitle className="custom-class">Title content</CardTitle>,
    );

    const title = screen.getByText("Title content");
    expect(title).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    renderWithAllProviders(<CardTitle ref={ref}>Title content</CardTitle>);

    expect(ref).toHaveBeenCalled();
  });
});

describe("CardDescription", () => {
  it("renders as p element", () => {
    renderWithAllProviders(
      <CardDescription>Description content</CardDescription>,
    );

    const description = screen.getByText("Description content");
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe("P");
  });

  it("applies correct className", () => {
    renderWithAllProviders(
      <CardDescription className="custom-class">
        Description content
      </CardDescription>,
    );

    const description = screen.getByText("Description content");
    expect(description).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    renderWithAllProviders(
      <CardDescription ref={ref}>Description content</CardDescription>,
    );

    expect(ref).toHaveBeenCalled();
  });
});

describe("CardContent", () => {
  it("renders as div element", () => {
    renderWithAllProviders(<CardContent>Content</CardContent>);

    const content = screen.getByText("Content");
    expect(content).toBeInTheDocument();
    expect(content.tagName).toBe("DIV");
  });

  it("applies correct className", () => {
    renderWithAllProviders(
      <CardContent className="custom-class">Content</CardContent>,
    );

    const content = screen.getByText("Content");
    expect(content).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    renderWithAllProviders(<CardContent ref={ref}>Content</CardContent>);

    expect(ref).toHaveBeenCalled();
  });
});

describe("CardFooter", () => {
  it("renders as div element", () => {
    renderWithAllProviders(<CardFooter>Footer content</CardFooter>);

    const footer = screen.getByText("Footer content");
    expect(footer).toBeInTheDocument();
    expect(footer.tagName).toBe("DIV");
  });

  it("applies correct className", () => {
    renderWithAllProviders(
      <CardFooter className="custom-class">Footer content</CardFooter>,
    );

    const footer = screen.getByText("Footer content");
    expect(footer).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    renderWithAllProviders(<CardFooter ref={ref}>Footer content</CardFooter>);

    expect(ref).toHaveBeenCalled();
  });
});

describe("Card composition", () => {
  it("works with all card components together", () => {
    renderWithAllProviders(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card Description")).toBeInTheDocument();
    expect(screen.getByText("Card Content")).toBeInTheDocument();
    expect(screen.getByText("Card Footer")).toBeInTheDocument();
  });

  it("works with asChild and card components", () => {
    renderWithAllProviders(
      <Card asChild>
        <Link to="/test">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>Card Content</CardContent>
        </Link>
      </Card>,
    );

    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent("Card TitleCard Content");
  });
});
