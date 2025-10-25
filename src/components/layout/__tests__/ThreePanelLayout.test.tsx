import { screen, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ThreePanelLayout from "../ThreePanelLayout";
import { renderWithAllProviders } from "./testUtils";

// Mock the skip navigation hook
vi.mock("../../hooks/useFocusManagement", () => ({
  useSkipNavigation: () => ({
    skipToElement: vi.fn(),
  }),
}));

// Mock SpawnProfileService
vi.mock("../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    getProfilesWithActiveInfo: vi.fn(() => ({
      profiles: [],
      activeProfileId: undefined,
    })),
    setActiveProfile: vi.fn(() => ({ success: true })),
  },
}));

describe("ThreePanelLayout", () => {
  const defaultProps = {
    leftPanel: <div>Left Panel Content</div>,
    centerPanel: <div>Center Panel Content</div>,
    rightPanel: <div>Right Panel Content</div>,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders three panels with correct IDs", async () => {
    await act(async () => {
      renderWithAllProviders(<ThreePanelLayout {...defaultProps} />);
    });

    expect(screen.getByText("Left Panel Content")).toBeInTheDocument();
    expect(screen.getByText("Center Panel Content")).toBeInTheDocument();
    expect(screen.getByText("Right Panel Content")).toBeInTheDocument();

    // Check that panels have correct IDs
    expect(document.getElementById("spawn-list")).toBeInTheDocument();
    expect(document.getElementById("main-content")).toBeInTheDocument();
    expect(document.getElementById("asset-management")).toBeInTheDocument();
  });

  it("renders skip navigation links", async () => {
    await act(async () => {
      renderWithAllProviders(<ThreePanelLayout {...defaultProps} />);
    });

    // Skip links should be present but visually hidden
    expect(screen.getByText("Skip to main content")).toBeInTheDocument();
    expect(screen.getByText("Skip to spawn list")).toBeInTheDocument();
    expect(screen.getByText("Skip to asset management")).toBeInTheDocument();
  });

  it("applies sr-only class to skip links container", async () => {
    await act(async () => {
      renderWithAllProviders(<ThreePanelLayout {...defaultProps} />);
    });

    // Find the skip links container by looking for the div that contains all skip buttons
    const skipButtons = screen
      .getAllByRole("button")
      .filter((button) => button.textContent?.includes("Skip to"));
    const skipLinksContainer = skipButtons[0].closest("div")?.parentElement;
    expect(skipLinksContainer).toHaveClass("sr-only");
    expect(skipLinksContainer).toHaveClass("focus-within:not-sr-only");
  });

  it("panels have correct tabIndex for focus management", async () => {
    await act(async () => {
      renderWithAllProviders(<ThreePanelLayout {...defaultProps} />);
    });

    const spawnListPanel = document.getElementById("spawn-list");
    const mainContentPanel = document.getElementById("main-content");
    const assetManagementPanel = document.getElementById("asset-management");

    expect(spawnListPanel).toHaveAttribute("tabIndex", "-1");
    expect(mainContentPanel).toHaveAttribute("tabIndex", "-1");
    expect(assetManagementPanel).toHaveAttribute("tabIndex", "-1");
  });

  it("applies correct CSS classes using design tokens", async () => {
    await act(async () => {
      renderWithAllProviders(<ThreePanelLayout {...defaultProps} />);
    });

    // Filter to only get skip navigation buttons
    const skipButtons = screen
      .getAllByRole("button")
      .filter((button) => button.textContent?.includes("Skip to"));

    skipButtons.forEach((button) => {
      expect(button).toHaveClass("text-[rgb(var(--color-fg))]");
      expect(button).toHaveClass("bg-[rgb(var(--color-surface-1))]");
      expect(button).toHaveClass("hover:bg-[rgb(var(--color-surface-2))]");
      expect(button).toHaveClass("border-[rgb(var(--color-border))]");
      expect(button).toHaveClass("focus:ring-[rgb(var(--color-ring))]");
    });
  });
});
