import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PanelPlaceholder, {
  SpawnNavigationPlaceholder,
  ConfigurationWorkspacePlaceholder,
  AssetManagementPlaceholder,
} from "../PanelPlaceholder";

describe("PanelPlaceholder", () => {
  describe("Basic Rendering", () => {
    it("renders with title, description, and icon", () => {
      render(
        <PanelPlaceholder
          title="Test Panel"
          description="Test description"
          icon="🔧"
        />
      );

      expect(screen.getByText("Test Panel")).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
      expect(screen.getAllByText("🔧")).toHaveLength(2); // Icon appears in header and content
    });

    it("renders with default icon when not provided", () => {
      render(
        <PanelPlaceholder title="Test Panel" description="Test description" />
      );

      expect(screen.getAllByText("🔧")).toHaveLength(2); // Icon appears in header and content
    });

    it("applies optional className prop correctly", () => {
      const { container } = render(
        <PanelPlaceholder
          title="Test Panel"
          description="Test description"
          className="custom-class"
        />
      );

      const placeholderContainer = container.firstChild as HTMLElement;
      expect(placeholderContainer).toHaveClass("custom-class");
    });
  });

  describe("Panel Structure", () => {
    it("renders panel header with correct structure", () => {
      render(
        <PanelPlaceholder
          title="Test Panel"
          description="Test description"
          icon="📋"
        />
      );

      const header = screen.getByText("Test Panel").closest("div")
        ?.parentElement?.parentElement;
      expect(header).toHaveClass(
        "p-4",
        "border-b",
        "border-gray-200",
        "bg-gray-50"
      );
    });

    it("renders placeholder content area", () => {
      render(
        <PanelPlaceholder title="Test Panel" description="Test description" />
      );

      expect(screen.getByText("Test Panel Coming Soon")).toBeInTheDocument();
      expect(
        screen.getByText(/This panel will contain test description/)
      ).toBeInTheDocument();
    });

    it("renders large icon in content area", () => {
      render(
        <PanelPlaceholder
          title="Test Panel"
          description="Test description"
          icon="📋"
        />
      );

      const icons = screen.getAllByText("📋");
      const largeIcon = icons[1]; // Second icon is the large one in content area
      expect(largeIcon.closest("div")).toHaveClass(
        "text-6xl",
        "mb-4",
        "opacity-20"
      );
    });
  });

  describe("Specific Placeholder Components", () => {
    it("SpawnNavigationPlaceholder renders with correct content", () => {
      render(<SpawnNavigationPlaceholder />);

      expect(screen.getByText("Spawn List")).toBeInTheDocument();
      expect(
        screen.getByText("spawn navigation and management")
      ).toBeInTheDocument();
      expect(screen.getAllByText("📋")).toHaveLength(2); // Icon appears in header and content
      expect(screen.getByText("Spawn List Coming Soon")).toBeInTheDocument();
    });

    it("ConfigurationWorkspacePlaceholder renders with correct content", () => {
      render(<ConfigurationWorkspacePlaceholder />);

      expect(
        screen.getByText("Unified Configuration Workspace")
      ).toBeInTheDocument();
      expect(
        screen.getByText("spawn configuration and settings management")
      ).toBeInTheDocument();
      expect(screen.getAllByText("⚙️")).toHaveLength(2); // Icon appears in header and content
      expect(
        screen.getByText("Unified Configuration Workspace Coming Soon")
      ).toBeInTheDocument();
    });

    it("AssetManagementPlaceholder renders with correct content", () => {
      render(<AssetManagementPlaceholder />);

      expect(screen.getByText("Dynamic Asset Management")).toBeInTheDocument();
      expect(
        screen.getByText("asset library and management tools")
      ).toBeInTheDocument();
      expect(screen.getAllByText("📁")).toHaveLength(2); // Icon appears in header and content
      expect(
        screen.getByText("Dynamic Asset Management Coming Soon")
      ).toBeInTheDocument();
    });
  });

  describe("Layout and Styling", () => {
    it("applies flex column layout", () => {
      const { container } = render(
        <PanelPlaceholder title="Test Panel" description="Test description" />
      );

      const placeholderContainer = container.firstChild as HTMLElement;
      expect(placeholderContainer).toHaveClass("h-full", "flex", "flex-col");
    });

    it("renders content in center of placeholder area", () => {
      render(
        <PanelPlaceholder title="Test Panel" description="Test description" />
      );

      const contentArea = screen
        .getByText("Test Panel Coming Soon")
        .closest("div");
      expect(contentArea?.parentElement).toHaveClass(
        "flex-1",
        "flex",
        "items-center",
        "justify-center"
      );
    });

    it("applies proper text styling to placeholder content", () => {
      render(
        <PanelPlaceholder title="Test Panel" description="Test description" />
      );

      const title = screen.getByText("Test Panel Coming Soon");
      const description = screen.getByText(/This panel will contain/);

      expect(title).toHaveClass("text-xl", "font-medium", "text-gray-700");
      expect(description).toHaveClass("text-gray-500");
    });
  });

  describe("Content Description", () => {
    it("includes description in placeholder text", () => {
      render(
        <PanelPlaceholder
          title="Test Panel"
          description="custom functionality"
        />
      );

      expect(
        screen.getByText(/This panel will contain custom functionality/)
      ).toBeInTheDocument();
    });

    it("handles long descriptions appropriately", () => {
      render(
        <PanelPlaceholder
          title="Test Panel"
          description="very long description that might wrap to multiple lines"
        />
      );

      expect(
        screen.getByText(/This panel will contain very long description/)
      ).toBeInTheDocument();
    });
  });
});
