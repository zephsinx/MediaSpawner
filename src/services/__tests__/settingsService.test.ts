import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SettingsService } from "../settingsService";
import { CacheService } from "../cacheService";
import { STORAGE_KEYS } from "../constants";

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
      expect(themeMode).toBe("dark");
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

    it("should default to dark for legacy system theme", () => {
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify({
          workingDirectory: "",
          themeMode: "system",
        }),
      );

      const themeMode = SettingsService.getThemeMode();
      expect(themeMode).toBe("dark");
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
        "dark",
      );
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("light");
    });

    it("should apply migrated system theme as dark", () => {
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

      // Mock localStorage with legacy system theme
      localStorage.setItem(
        "mediaspawner-settings",
        JSON.stringify({
          workingDirectory: "",
          themeMode: "system",
        }),
      );

      // Apply theme mode (should migrate system to dark)
      SettingsService.applyThemeMode();

      expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith(
        "light",
        "dark",
      );
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
    });

    it("should handle invalid theme mode gracefully", () => {
      // Mock localStorage to return invalid theme mode
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify({
          workingDirectory: "",
          themeMode: "invalid",
        }),
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

    it("should reject settings with legacy system theme", () => {
      const legacySettings = {
        workingDirectory: "",
        themeMode: "system",
      } as unknown as Parameters<typeof SettingsService.validateSettings>[0];

      const result = SettingsService.validateSettings(legacySettings);
      expect(result.isValid).toBe(false);
    });

    it("should reject settings with invalid theme mode", () => {
      const invalidSettings = {
        workingDirectory: "",
        themeMode: "invalid",
      } as unknown as Parameters<typeof SettingsService.validateSettings>[0];

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
      expect(themeMode).toBe("dark");
    });
  });

  describe("OBS Canvas Size Management", () => {
    describe("validateOBSCanvasSize", () => {
      it("should reject non-integer width", () => {
        const result = SettingsService.validateOBSCanvasSize(1920.5, 1080);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("positive integer");
      });

      it("should reject non-integer height", () => {
        const result = SettingsService.validateOBSCanvasSize(1920, 1080.5);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("positive integer");
      });

      it("should reject zero width", () => {
        const result = SettingsService.validateOBSCanvasSize(0, 1080);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("positive integer");
      });

      it("should reject zero height", () => {
        const result = SettingsService.validateOBSCanvasSize(1920, 0);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("positive integer");
      });

      it("should reject negative width", () => {
        const result = SettingsService.validateOBSCanvasSize(-100, 1080);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("positive integer");
      });

      it("should reject negative height", () => {
        const result = SettingsService.validateOBSCanvasSize(1920, -100);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("positive integer");
      });

      it("should reject canvas size exceeding maximum width", () => {
        const result = SettingsService.validateOBSCanvasSize(20000, 1080);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("maximum supported size");
      });

      it("should reject canvas size exceeding maximum height", () => {
        const result = SettingsService.validateOBSCanvasSize(1920, 10000);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("maximum supported size");
      });

      it("should accept valid canvas size 1920x1080", () => {
        const result = SettingsService.validateOBSCanvasSize(1920, 1080);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should accept valid canvas size 2560x1440", () => {
        const result = SettingsService.validateOBSCanvasSize(2560, 1440);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should accept maximum canvas size", () => {
        const result = SettingsService.validateOBSCanvasSize(15360, 8640);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe("updateOBSCanvasSize", () => {
      it("should update canvas size successfully", () => {
        const result = SettingsService.updateOBSCanvasSize(2560, 1440);
        expect(result.success).toBe(true);
        expect(result.settings?.obsCanvasWidth).toBe(2560);
        expect(result.settings?.obsCanvasHeight).toBe(1440);
      });

      it("should reject invalid canvas width", () => {
        const result = SettingsService.updateOBSCanvasSize(-100, 1080);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should reject invalid canvas height", () => {
        const result = SettingsService.updateOBSCanvasSize(1920, -100);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it("should persist canvas size to localStorage", () => {
        SettingsService.updateOBSCanvasSize(3840, 2160);
        const stored = localStorage.getItem("mediaspawner_settings");
        expect(stored).toBeDefined();
        const parsed = JSON.parse(stored!);
        expect(parsed.obsCanvasWidth).toBe(3840);
        expect(parsed.obsCanvasHeight).toBe(2160);
      });
    });

    describe("getSettings with canvas size", () => {
      it("should apply default canvas size for new settings", () => {
        const settings = SettingsService.getSettings();
        expect(settings.obsCanvasWidth).toBe(1920);
        expect(settings.obsCanvasHeight).toBe(1080);
      });

      it("should preserve custom canvas size", () => {
        SettingsService.updateOBSCanvasSize(2560, 1440);
        mockCacheService.get.mockImplementation((key, fallback) => {
          if (key === "SETTINGS") {
            return fallback();
          }
          return undefined;
        });
        const settings = SettingsService.getSettings();
        expect(settings.obsCanvasWidth).toBe(2560);
        expect(settings.obsCanvasHeight).toBe(1440);
      });
    });
  });
});
