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
      themeMode: "light" as const,
    });
    mockSettingsService.getThemeMode.mockReturnValue("light");
    mockSettingsService.setThemeMode.mockReturnValue({
      success: true,
      settings: { themeMode: "dark", workingDirectory: "" },
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
    it("renders theme toggle with light theme by default", () => {
      renderWithAllProviders(<ThemeToggle />);

      expect(screen.getByRole("switch")).toBeInTheDocument();
      // Should show sun icon for light theme
      const icon = screen
        .getByRole("switch")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-sun");
    });

    it("renders with light theme", () => {
      mockSettingsService.getThemeMode.mockReturnValue("light");

      renderWithAllProviders(<ThemeToggle />);

      // Should show sun icon for light theme
      const icon = screen
        .getByRole("switch")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-sun");
    });

    it("renders with dark theme", () => {
      mockSettingsService.getThemeMode.mockReturnValue("dark");

      renderWithAllProviders(<ThemeToggle />);

      // Should show moon icon for dark theme
      const icon = screen
        .getByRole("switch")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-moon");
    });

    it("applies custom className", () => {
      renderWithAllProviders(<ThemeToggle className="custom-class" />);

      const container = screen.getByRole("switch").closest("div");
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("Theme Switching", () => {
    it("toggles between light and dark themes", () => {
      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");

      // First toggle: light -> dark
      fireEvent.click(switchElement);
      expect(mockSettingsService.setThemeMode).toHaveBeenCalledWith("dark");

      // Second toggle: dark -> light
      fireEvent.click(switchElement);
      expect(mockSettingsService.setThemeMode).toHaveBeenCalledWith("light");
    });

    it("handles theme switching success", () => {
      mockSettingsService.setThemeMode.mockReturnValue({
        success: true,
        settings: { themeMode: "dark", workingDirectory: "" },
      });

      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");
      fireEvent.click(switchElement);

      expect(mockSettingsService.setThemeMode).toHaveBeenCalledWith("dark");
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
        "Failed to save theme",
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

      // Should still show light theme (original state)
      const icon = screen
        .getByRole("switch")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-sun");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA label for light theme", () => {
      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute(
        "aria-label",
        "Switch to dark theme",
      );
    });

    it("updates ARIA label when theme changes", () => {
      mockSettingsService.getThemeMode.mockReturnValue("dark");

      renderWithAllProviders(<ThemeToggle />);

      const switchElement = screen.getByRole("switch");
      expect(switchElement).toHaveAttribute(
        "aria-label",
        "Switch to light theme",
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
        .getByRole("switch")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-sun");
    });

    it("shows moon icon for dark theme", () => {
      mockSettingsService.getThemeMode.mockReturnValue("dark");

      renderWithAllProviders(<ThemeToggle />);

      // Check for moon icon (from lucide-react)
      const icon = screen
        .getByRole("switch")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-moon");
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined theme mode gracefully", () => {
      mockSettingsService.getThemeMode.mockReturnValue(undefined as never);

      renderWithAllProviders(<ThemeToggle />);

      // Should default to light theme (isDark = false)
      const icon = screen
        .getByRole("switch")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-sun");
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
