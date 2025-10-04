import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SettingsService } from "../settingsService";
import { CacheService } from "../cacheService";

// Mock CacheService
vi.mock("../cacheService", () => ({
  CacheService: {
    get: vi.fn(),
    invalidate: vi.fn(),
  },
  CACHE_KEYS: {
    SETTINGS: "SETTINGS",
  },
}));

const mockCacheService = vi.mocked(CacheService);

describe("SettingsService", () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset all mocks
    vi.clearAllMocks();

    // Mock CacheService.get to return default settings
    mockCacheService.get.mockImplementation((key, fallback) => {
      if (key === "SETTINGS") {
        return fallback();
      }
      return undefined;
    });

    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Theme Management", () => {
    it("should get default theme mode", () => {
      const themeMode = SettingsService.getThemeMode();
      expect(themeMode).toBe("system");
    });

    it("should set theme mode successfully", () => {
      const result = SettingsService.setThemeMode("dark");

      expect(result.success).toBe(true);
      expect(result.settings?.themeMode).toBe("dark");
      expect(mockCacheService.invalidate).toHaveBeenCalledWith("SETTINGS");
    });

    it("should set theme mode to light", () => {
      const result = SettingsService.setThemeMode("light");

      expect(result.success).toBe(true);
      expect(result.settings?.themeMode).toBe("light");
    });

    it("should set theme mode to system", () => {
      const result = SettingsService.setThemeMode("system");

      expect(result.success).toBe(true);
      expect(result.settings?.themeMode).toBe("system");
    });

    it("should apply theme mode to DOM", () => {
      // Mock document.documentElement
      const mockHtmlElement = {
        classList: {
          remove: vi.fn(),
          add: vi.fn(),
        },
      };
      Object.defineProperty(document, "documentElement", {
        value: mockHtmlElement,
        writable: true,
      });

      // Mock window.matchMedia
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      Object.defineProperty(window, "matchMedia", {
        value: mockMatchMedia,
        writable: true,
      });

      // Set theme to light and apply
      SettingsService.setThemeMode("light");
      SettingsService.applyThemeMode();

      expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith(
        "light",
        "dark"
      );
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("light");
    });

    it("should apply system theme based on preference", () => {
      // Mock document.documentElement
      const mockHtmlElement = {
        classList: {
          remove: vi.fn(),
          add: vi.fn(),
        },
      };
      Object.defineProperty(document, "documentElement", {
        value: mockHtmlElement,
        writable: true,
      });

      // Mock window.matchMedia to return dark preference
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      Object.defineProperty(window, "matchMedia", {
        value: mockMatchMedia,
        writable: true,
      });

      // Set theme to system and apply
      SettingsService.setThemeMode("system");
      SettingsService.applyThemeMode();

      expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith(
        "light",
        "dark"
      );
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
    });

    it("should handle invalid theme mode gracefully", () => {
      // Mock localStorage to return invalid theme mode
      localStorage.setItem(
        "mediaspawner_settings",
        JSON.stringify({
          workingDirectory: "",
          themeMode: "invalid",
        })
      );

      // Mock CacheService to return invalid settings
      mockCacheService.get.mockImplementation((key) => {
        if (key === "SETTINGS") {
          return {
            workingDirectory: "",
            themeMode: "invalid",
          };
        }
        return undefined;
      });

      const result = SettingsService.setThemeMode("dark");

      // Should still succeed and override invalid value
      expect(result.success).toBe(true);
      expect(result.settings?.themeMode).toBe("dark");
    });
  });

  describe("Settings Validation", () => {
    it("should validate settings with theme mode", () => {
      const validSettings = {
        workingDirectory: "",
        themeMode: "light" as const,
      };

      const result = SettingsService.validateSettings(validSettings);
      expect(result.isValid).toBe(true);
    });

    it("should reject settings with invalid theme mode", () => {
      const invalidSettings = {
        workingDirectory: "",
        themeMode: "invalid" as "light" | "dark" | "system",
      };

      const result = SettingsService.validateSettings(invalidSettings);
      expect(result.isValid).toBe(false);
    });

    it("should check if using defaults includes theme mode", () => {
      const result = SettingsService.isUsingDefaults();
      expect(result).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle localStorage errors gracefully", () => {
      // Mock CacheService.get to throw error
      mockCacheService.get.mockImplementation(() => {
        throw new Error("Cache error");
      });

      const result = SettingsService.setThemeMode("dark");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cache error");
    });

    it("should handle JSON parsing errors", () => {
      // Set invalid JSON in localStorage
      localStorage.setItem("mediaspawner_settings", "invalid json");

      // Mock CacheService to return default settings on error
      mockCacheService.get.mockImplementation((key, fallback) => {
        if (key === "SETTINGS") {
          return fallback();
        }
        return undefined;
      });

      const themeMode = SettingsService.getThemeMode();
      expect(themeMode).toBe("system");
    });
  });
});
