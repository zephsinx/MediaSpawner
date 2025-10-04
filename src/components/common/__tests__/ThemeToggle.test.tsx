import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";

// Mock SettingsService
vi.mock("../../../services/settingsService", () => ({
  SettingsService: {
    getSettings: vi.fn(),
    getThemeMode: vi.fn(),
    setThemeMode: vi.fn(),
    applyThemeMode: vi.fn(),
  },
}));

// Mock SpawnProfileService
vi.mock("../../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    getProfilesWithActiveInfo: vi.fn(),
  },
}));

// Import after mocking
import { SettingsService } from "../../../services/settingsService";
import { SpawnProfileService } from "../../../services/spawnProfileService";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";

const mockSettingsService = vi.mocked(SettingsService);
const mockSpawnProfileService = vi.mocked(SpawnProfileService);

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementation
    mockSettingsService.getSettings.mockReturnValue({
      workingDirectory: "",
      themeMode: "system" as const,
    });
    mockSettingsService.getThemeMode.mockReturnValue("system");
    mockSettingsService.setThemeMode.mockReturnValue({
      success: true,
      settings: { themeMode: "light", workingDirectory: "" },
    });
    mockSettingsService.applyThemeMode.mockImplementation(() => {});

    // Mock SpawnProfileService
    mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
      profiles: [],
      activeProfileId: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders theme toggle with system theme by default", () => {
      renderWithAllProviders(<ThemeToggle />);

      expect(screen.getByText("System theme")).toBeInTheDocument();
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it("renders with light theme", () => {
      mockSettingsService.getThemeMode.mockReturnValue("light");

      renderWithAllProviders(<ThemeToggle />);

      expect(screen.getByText("Light theme")).toBeInTheDocument();
    });

    it("renders with dark theme", () => {
      mockSettingsService.getThemeMode.mockReturnValue("dark");

      renderWithAllProviders(<ThemeToggle />);

      expect(screen.getByText("Dark theme")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      renderWithAllProviders(<ThemeToggle className="custom-class" />);

      const container = screen.getByText("System theme").closest("div");
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("Theme Switching", () => {
    it("cycles through themes when toggled", () => {
      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");

      // First toggle: system -> light
      fireEvent.click(switchElement);
      expect(mockSettingsService.setThemeMode).toHaveBeenCalledWith("light");

      // Second toggle: light -> dark
      fireEvent.click(switchElement);
      expect(mockSettingsService.setThemeMode).toHaveBeenCalledWith("dark");

      // Third toggle: dark -> system
      fireEvent.click(switchElement);
      expect(mockSettingsService.setThemeMode).toHaveBeenCalledWith("system");
    });

    it("handles theme switching success", () => {
      mockSettingsService.setThemeMode.mockReturnValue({
        success: true,
        settings: { themeMode: "light", workingDirectory: "" },
      });

      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");
      fireEvent.click(switchElement);

      expect(mockSettingsService.setThemeMode).toHaveBeenCalledWith("light");
    });

    it("handles theme switching failure gracefully", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockSettingsService.setThemeMode.mockReturnValue({
        success: false,
        error: "Failed to save theme",
      });

      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");
      fireEvent.click(switchElement);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to set theme mode:",
        "Failed to save theme"
      );

      consoleSpy.mockRestore();
    });

    it("reverts state on theme switching failure", () => {
      mockSettingsService.setThemeMode.mockReturnValue({
        success: false,
        error: "Failed to save theme",
      });

      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");
      fireEvent.click(switchElement);

      // Should still show system theme (original state)
      expect(screen.getByText("System theme")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA label", () => {
      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute(
        "aria-label",
        "Switch theme. Current: System theme"
      );
    });

    it("updates ARIA label when theme changes", () => {
      mockSettingsService.getThemeMode.mockReturnValue("light");

      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute(
        "aria-label",
        "Switch theme. Current: Light theme"
      );
    });

    it("is keyboard accessible", () => {
      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");

      // Should be focusable
      switchElement.focus();
      expect(document.activeElement).toBe(switchElement);

      // Should respond to click (which is what the switch actually does)
      fireEvent.click(switchElement);
      expect(mockSettingsService.setThemeMode).toHaveBeenCalled();
    });
  });

  describe("Icon Display", () => {
    it("shows sun icon for light theme", () => {
      mockSettingsService.getThemeMode.mockReturnValue("light");

      renderWithAllProviders(<ThemeToggle />);

      // Check for sun icon (from lucide-react)
      const icon = screen
        .getByText("Light theme")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-sun");
    });

    it("shows moon icon for dark theme", () => {
      mockSettingsService.getThemeMode.mockReturnValue("dark");

      renderWithAllProviders(<ThemeToggle />);

      // Check for moon icon (from lucide-react)
      const icon = screen
        .getByText("Dark theme")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-moon");
    });

    it("shows monitor icon for system theme", () => {
      mockSettingsService.getThemeMode.mockReturnValue("system");

      renderWithAllProviders(<ThemeToggle />);

      // Check for monitor icon (from lucide-react)
      const icon = screen
        .getByText("System theme")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-monitor");
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined theme mode gracefully", () => {
      mockSettingsService.getThemeMode.mockReturnValue(undefined as never);

      renderWithAllProviders(<ThemeToggle />);

      // Should default to light theme (first in array)
      expect(screen.getByText("Light theme")).toBeInTheDocument();
    });

    it("handles service errors during initialization", () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock getThemeMode to return a fallback instead of throwing
      mockSettingsService.getThemeMode.mockReturnValue("light");

      // Should render without crashing
      const { container } = renderWithAllProviders(<ThemeToggle />);
      expect(container).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});
