/**
 * Tests for ImportExportService
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ImportExportService,
  DEFAULT_IMPORT_OPTIONS,
} from "../importExportService";
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
        themeMode: "system" as const,
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
        themeMode: "system" as const,
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

  describe("importConfiguration", () => {
    it("should import configuration successfully with valid data", async () => {
      // Mock existing data
      const existingProfiles = [
        {
          id: "existing-profile",
          name: "Existing Profile",
          spawns: [],
          lastModified: Date.now(),
          isActive: false,
        },
      ];

      const existingAssets = [
        {
          id: "existing-asset",
          name: "Existing Asset",
          path: "existing.jpg",
          isUrl: false,
          type: "image" as const,
        },
      ];

      // Mock imported data
      const importedJson = JSON.stringify({
        version: "1.0.0",
        profiles: [
          {
            id: "imported-profile",
            name: "Imported Profile",
            description: "Imported Description",
            workingDirectory: "/imported/path",
            spawns: [
              {
                id: "imported-spawn",
                name: "Imported Spawn",
                enabled: true,
                trigger: {
                  type: "manual",
                  enabled: true,
                  config: {},
                },
                duration: 5000,
                assets: [
                  {
                    assetId: "imported-asset",
                    id: "imported-spawn-asset",
                    enabled: true,
                    order: 0,
                  },
                ],
              },
            ],
            lastModified: "2023-01-01T00:00:00.000Z",
          },
        ],
        assets: [
          {
            id: "imported-asset",
            name: "Imported Asset",
            path: "imported.jpg",
            isUrl: false,
            type: "image",
          },
        ],
      });

      // Setup mocks
      mockSpawnProfileService.getAllProfiles.mockReturnValue(existingProfiles);
      mockSpawnProfileService.replaceProfiles.mockReturnValue({
        success: true,
        profiles: existingProfiles,
      });
      mockAssetService.getAssets.mockReturnValue(existingAssets);
      mockAssetService.saveAssets.mockImplementation(() => {});
      mockSettingsService.updateWorkingDirectory.mockReturnValue({
        success: true,
        settings: {
          workingDirectory: "/imported/path",
          activeProfileId: undefined,
          themeMode: "system" as const,
        },
      });

      // Execute
      const result = await ImportExportService.importConfiguration(
        importedJson
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.profiles).toBeDefined();
      expect(result.assets).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.profileCount).toBe(2); // existing + imported
      expect(result.metadata?.assetCount).toBe(2); // existing + imported

      // Verify services were called
      expect(mockSpawnProfileService.replaceProfiles).toHaveBeenCalled();
      expect(mockAssetService.saveAssets).toHaveBeenCalled();
      expect(mockSettingsService.updateWorkingDirectory).toHaveBeenCalledWith(
        "/imported/path"
      );
    });

    it("should handle import errors gracefully", async () => {
      // Invalid JSON
      const invalidJson = "invalid json";

      const result = await ImportExportService.importConfiguration(invalidJson);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unexpected token");
    });

    it("should handle validation errors", async () => {
      // Invalid configuration structure
      const invalidConfig = JSON.stringify({
        version: "1.0.0",
        // Missing profiles and assets
      });

      const result = await ImportExportService.importConfiguration(
        invalidConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid configuration");
    });

    it("should handle conflicts with rename strategy", async () => {
      // Mock existing data with conflicting IDs
      const existingProfiles = [
        {
          id: "conflict-profile",
          name: "Conflict Profile",
          spawns: [],
          lastModified: Date.now(),
          isActive: false,
        },
      ];

      const existingAssets = [
        {
          id: "conflict-asset",
          name: "Conflict Asset",
          path: "conflict.jpg",
          isUrl: false,
          type: "image" as const,
        },
      ];

      // Mock imported data with same IDs
      const importedJson = JSON.stringify({
        version: "1.0.0",
        profiles: [
          {
            id: "conflict-profile",
            name: "Conflict Profile",
            workingDirectory: "/conflict/path",
            spawns: [],
            lastModified: "2023-01-01T00:00:00.000Z",
          },
        ],
        assets: [
          {
            id: "conflict-asset",
            name: "Conflict Asset",
            path: "conflict.jpg",
            isUrl: false,
            type: "image",
          },
        ],
      });

      // Setup mocks
      mockSpawnProfileService.getAllProfiles.mockReturnValue(existingProfiles);
      mockSpawnProfileService.replaceProfiles.mockReturnValue({
        success: true,
        profiles: existingProfiles,
      });
      mockAssetService.getAssets.mockReturnValue(existingAssets);
      mockAssetService.saveAssets.mockImplementation(() => {});
      mockSettingsService.updateWorkingDirectory.mockReturnValue({
        success: true,
        settings: {
          workingDirectory: "/conflict/path",
          activeProfileId: undefined,
          themeMode: "system" as const,
        },
      });

      // Execute with rename strategy
      const result = await ImportExportService.importConfiguration(
        importedJson,
        {
          ...DEFAULT_IMPORT_OPTIONS,
          profileConflictStrategy: "rename",
          assetConflictStrategy: "rename",
        }
      );

      // Verify
      expect(result.success).toBe(true);
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts?.profileConflicts).toContain("Conflict Profile");
      expect(result.conflicts?.assetConflicts).toContain("Conflict Asset");
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
