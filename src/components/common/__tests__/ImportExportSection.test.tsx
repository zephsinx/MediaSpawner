import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportExportSection } from "../ImportExportSection";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ImportExportSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders without errors", () => {
    render(<ImportExportSection />);

    expect(screen.getByText("Import/Export Configuration")).toBeInTheDocument();
    expect(screen.getByText("Export Configuration")).toBeInTheDocument();
    expect(screen.getByText("Import Configuration")).toBeInTheDocument();
  });

  it("includes export and import buttons", () => {
    render(<ImportExportSection />);

    const exportButton = screen.getByRole("button", {
      name: /export configuration/i,
    });
    const importButton = screen.getByRole("button", {
      name: /import configuration/i,
    });

    expect(exportButton).toBeInTheDocument();
    expect(importButton).toBeInTheDocument();
  });

  it("has file input for JSON files", () => {
    render(<ImportExportSection />);

    const fileInput = screen.getByRole("button", {
      name: /import configuration/i,
    });
    expect(fileInput).toBeInTheDocument();

    // The actual file input is hidden, but we can check it exists
    const hiddenInput = document.querySelector('input[type="file"]');
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput).toHaveAttribute("accept", ".json,application/json");
  });

  it("follows existing UI patterns", () => {
    render(<ImportExportSection />);

    // Check for consistent styling classes
    const section = screen
      .getByText("Import/Export Configuration")
      .closest("div");
    expect(section).toHaveClass(
      "bg-white",
      "border",
      "rounded-lg",
      "p-6",
      "mb-6"
    );

    const exportButton = screen.getByRole("button", {
      name: /export configuration/i,
    });
    expect(exportButton).toHaveClass(
      "bg-indigo-600",
      "text-white",
      "rounded-md"
    );
  });

  it("includes proper TypeScript types", () => {
    // This test verifies the component can be rendered with proper props
    render(<ImportExportSection className="test-class" />);

    const section = screen
      .getByText("Import/Export Configuration")
      .closest("div");
    expect(section).toHaveClass("test-class");
  });

  it("has basic accessibility features", () => {
    render(<ImportExportSection />);

    const exportButton = screen.getByRole("button", {
      name: /export configuration/i,
    });
    const importButton = screen.getByRole("button", {
      name: /import configuration/i,
    });

    expect(exportButton).toHaveAttribute(
      "aria-label",
      "Export configuration as JSON file"
    );
    expect(importButton).toHaveAttribute(
      "aria-label",
      "Import configuration from JSON file"
    );
  });

  it("handles export button click", async () => {
    render(<ImportExportSection />);

    const exportButton = screen.getByRole("button", {
      name: /export configuration/i,
    });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText("Exporting...")).toBeInTheDocument();
    });
  });

  it("handles import button click", () => {
    render(<ImportExportSection />);

    const importButton = screen.getByRole("button", {
      name: /import configuration/i,
    });
    fireEvent.click(importButton);

    // The file input should be triggered (we can't easily test the file dialog)
    // but we can verify the button click doesn't cause errors
    expect(importButton).toBeInTheDocument();
  });

  it("shows loading states correctly", async () => {
    render(<ImportExportSection />);

    const exportButton = screen.getByRole("button", {
      name: /export configuration/i,
    });
    const importButton = screen.getByRole("button", {
      name: /import configuration/i,
    });

    // Initially both buttons should be enabled
    expect(exportButton).not.toBeDisabled();
    expect(importButton).not.toBeDisabled();

    // Click export button
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText("Exporting...")).toBeInTheDocument();
      expect(exportButton).toBeDisabled();
      expect(importButton).toBeDisabled();
    });
  });
});
