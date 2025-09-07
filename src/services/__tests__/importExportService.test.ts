/**
 * Tests for ImportExportService
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ImportExportService } from "../importExportService";
import { SpawnProfileService } from "../spawnProfileService";
import { AssetService } from "../assetService";
import { SettingsService } from "../settingsService";

// Mock the services
vi.mock("../spawnProfileService");
vi.mock("../assetService");
vi.mock("../settingsService");

const mockSpawnProfileService = vi.mocked(SpawnProfileService);
const mockAssetService = vi.mocked(AssetService);
const mockSettingsService = vi.mocked(SettingsService);

describe("ImportExportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exportConfiguration", () => {
    it("should export configuration successfully with valid data", async () => {
      // Mock data
      const mockProfiles = [
        {
          id: "profile-1",
          name: "Test Profile",
          description: "Test Description",
          spawns: [],
          lastModified: Date.now(),
          isActive: false,
        },
      ];

      const mockAssets = [
        {
          id: "asset-1",
          name: "Test Asset",
          path: "test.jpg",
          isUrl: false,
          type: "image" as const,
        },
      ];

      const mockSettings = {
        workingDirectory: "/test/path",
        activeProfileId: "profile-1",
      };

      // Setup mocks
      mockSpawnProfileService.getAllProfiles.mockReturnValue(mockProfiles);
      mockAssetService.getAssets.mockReturnValue(mockAssets);
      mockSettingsService.getSettings.mockReturnValue(mockSettings);

      // Execute
      const result = await ImportExportService.exportConfiguration();

      // Verify
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.profileCount).toBe(1);
      expect(result.metadata?.assetCount).toBe(1);
      expect(result.metadata?.spawnCount).toBe(0);

      // Verify JSON structure
      const exportedData = JSON.parse(result.data!);
      expect(exportedData.version).toBe("1.0.0");
      expect(exportedData.profiles).toHaveLength(1);
      expect(exportedData.assets).toHaveLength(1);
      expect(exportedData.profiles[0].workingDirectory).toBe("/test/path");
    });

    it("should return error when no data is available to export", async () => {
      // Setup mocks with empty data
      mockSpawnProfileService.getAllProfiles.mockReturnValue([]);
      mockAssetService.getAssets.mockReturnValue([]);
      mockSettingsService.getSettings.mockReturnValue({
        workingDirectory: "",
        activeProfileId: undefined,
      });

      // Execute
      const result = await ImportExportService.exportConfiguration();

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("No data available to export");
    });

    it("should handle export errors gracefully", async () => {
      // Setup mocks to throw error
      mockSpawnProfileService.getAllProfiles.mockImplementation(() => {
        throw new Error("Service error");
      });

      // Execute
      const result = await ImportExportService.exportConfiguration();

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe("Service error");
    });
  });

  describe("validateImportedConfig", () => {
    it("should validate valid configuration", () => {
      const validConfig = {
        version: "1.0.0",
        profiles: [],
        assets: [],
      };

      const result = ImportExportService.validateImportedConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid configuration", () => {
      const invalidConfig = {
        version: "1.0.0",
        // Missing profiles and assets
      };

      const result = ImportExportService.validateImportedConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Configuration must have a profiles array"
      );
      expect(result.errors).toContain(
        "Configuration must have an assets array"
      );
    });

    it("should warn about version mismatch", () => {
      const configWithVersionMismatch = {
        version: "2.0.0",
        profiles: [],
        assets: [],
      };

      const result = ImportExportService.validateImportedConfig(
        configWithVersionMismatch
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Version mismatch: expected 1.0.0, got 2.0.0"
      );
    });
  });
});
