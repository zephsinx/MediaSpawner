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
import * as dataTransformation from "../../utils/dataTransformation";
import * as importExportValidation from "../../utils/importExportValidation";

// Mock the services
vi.mock("../spawnProfileService");
vi.mock("../assetService");
vi.mock("../settingsService");
vi.mock("../../utils/dataTransformation");
vi.mock("../../utils/importExportValidation");

const mockSpawnProfileService = vi.mocked(SpawnProfileService);
const mockAssetService = vi.mocked(AssetService);
const mockSettingsService = vi.mocked(SettingsService);
const mockDataTransformation = vi.mocked(dataTransformation);
const mockImportExportValidation = vi.mocked(importExportValidation);

describe("ImportExportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup transform function mocks
    mockDataTransformation.transformProfileToSchema.mockImplementation(
      (profile) =>
        ({
          id: profile.id,
          name: profile.name,
          description: profile.description || "",
          spawns: profile.spawns.map((spawn) => ({
            id: spawn.id,
            name: spawn.name,
            enabled: spawn.enabled,
            trigger: {
              type: spawn.trigger.type,
              enabled: spawn.trigger.enabled ?? true,
              config: spawn.trigger.config as Record<string, unknown>,
            },
            duration: spawn.duration,
            assets: spawn.assets.map((asset) => ({
              assetId: asset.assetId,
              id: asset.id,
              enabled: asset.enabled,
              order: asset.order,
              overrides: asset.overrides || {},
            })),
            randomizationBuckets: spawn.randomizationBuckets || [],
          })),
        }) as ReturnType<typeof dataTransformation.transformProfileToSchema>,
    );

    mockDataTransformation.transformAssetToSchema.mockImplementation(
      (asset) => ({
        id: asset.id,
        name: asset.name,
        path: asset.path,
        isUrl: asset.isUrl,
        type: asset.type,
      }),
    );

    mockDataTransformation.transformProfileFromSchema.mockImplementation(
      (profile) =>
        ({
          id: profile.id,
          name: profile.name,
          description: profile.description,
          spawns: profile.spawns.map((spawn, index) => ({
            id: spawn.id,
            name: spawn.name,
            enabled: spawn.enabled,
            trigger: spawn.trigger as ReturnType<
              typeof dataTransformation.transformProfileFromSchema
            >["spawns"][number]["trigger"],
            duration: spawn.duration,
            assets: spawn.assets.map((asset) => ({
              assetId: asset.assetId,
              id: asset.id,
              enabled: asset.enabled,
              order: asset.order,
              overrides: asset.overrides || {},
            })),
            randomizationBuckets: spawn.randomizationBuckets || [],
            lastModified: Date.now(),
            order: index,
          })),
          lastModified: Date.now(),
          isActive: false,
        }) as ReturnType<typeof dataTransformation.transformProfileFromSchema>,
    );

    mockDataTransformation.transformAssetFromSchema.mockImplementation(
      (asset) => ({
        id: asset.id,
        name: asset.name,
        path: asset.path,
        isUrl: asset.isUrl,
        type: asset.type,
      }),
    );

    // Setup validation function mocks
    mockImportExportValidation.validateExportData.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      fieldErrors: {},
      profileErrors: {},
      assetErrors: {},
      spawnErrors: {},
    });

    mockImportExportValidation.validateImportData.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      fieldErrors: {},
      profileErrors: {},
      assetErrors: {},
      spawnErrors: {},
      relationshipErrors: [],
    });
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
        themeMode: "light" as const,
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
      expect(exportedData.workingDirectory).toBe("/test/path");
      expect(exportedData.profiles).toHaveLength(1);
      expect(exportedData.assets).toHaveLength(1);
    });

    it("should return error when no data is available to export", async () => {
      // Setup mocks with empty data
      mockSpawnProfileService.getAllProfiles.mockReturnValue([]);
      mockAssetService.getAssets.mockReturnValue([]);
      mockSettingsService.getSettings.mockReturnValue({
        workingDirectory: "",
        activeProfileId: undefined,
        themeMode: "light" as const,
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
        workingDirectory: "/imported/path",
        profiles: [
          {
            id: "imported-profile",
            name: "Imported Profile",
            description: "Imported Description",
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
          themeMode: "light" as const,
        },
      });

      // Execute
      const result =
        await ImportExportService.importConfiguration(importedJson);

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
    });

    it("should handle import errors gracefully", async () => {
      // Invalid JSON
      const invalidJson = "invalid json";

      const result = await ImportExportService.importConfiguration(invalidJson);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unexpected token");
    });

    it("should update working directory when updateWorkingDirectory option is enabled", async () => {
      // Mock imported data with working directory
      const importedJson = JSON.stringify({
        version: "1.0.0",
        workingDirectory: "/imported/path",
        profiles: [
          {
            id: "test-profile",
            name: "Test Profile",
            description: "Test Description",
            spawns: [],
          },
        ],
        assets: [
          {
            id: "test-asset",
            name: "Test Asset",
            path: "test.jpg",
            isUrl: false,
            type: "image",
          },
        ],
      });

      // Mock successful working directory update
      mockSettingsService.updateWorkingDirectory.mockReturnValue({
        success: true,
        settings: {
          workingDirectory: "/imported/path",
          themeMode: "light",
        },
      });

      // Mock existing data for merge
      mockSpawnProfileService.getAllProfiles.mockReturnValue([]);
      mockAssetService.getAssets.mockReturnValue([]);

      // Execute with updateWorkingDirectory enabled
      const result = await ImportExportService.importConfiguration(
        importedJson,
        {
          updateWorkingDirectory: true,
          profileConflictStrategy: "skip",
          assetConflictStrategy: "skip",
          validateAssetReferences: true,
        },
      );

      // Verify
      expect(result.success).toBe(true);
      expect(mockSettingsService.updateWorkingDirectory).toHaveBeenCalledWith(
        "/imported/path",
      );
    });

    it("should not update working directory when updateWorkingDirectory option is disabled", async () => {
      // Mock imported data with working directory
      const importedJson = JSON.stringify({
        version: "1.0.0",
        workingDirectory: "/imported/path",
        profiles: [
          {
            id: "test-profile",
            name: "Test Profile",
            description: "Test Description",
            spawns: [],
          },
        ],
        assets: [
          {
            id: "test-asset",
            name: "Test Asset",
            path: "test.jpg",
            isUrl: false,
            type: "image",
          },
        ],
      });

      // Mock existing data for merge
      mockSpawnProfileService.getAllProfiles.mockReturnValue([]);
      mockAssetService.getAssets.mockReturnValue([]);

      // Execute with updateWorkingDirectory disabled
      const result = await ImportExportService.importConfiguration(
        importedJson,
        {
          updateWorkingDirectory: false,
          profileConflictStrategy: "skip",
          assetConflictStrategy: "skip",
          validateAssetReferences: true,
        },
      );

      // Verify
      expect(result.success).toBe(true);
      expect(mockSettingsService.updateWorkingDirectory).not.toHaveBeenCalled();
    });

    it("should handle validation errors", async () => {
      // Invalid configuration structure
      const invalidConfig = JSON.stringify({
        version: "1.0.0",
        // Missing profiles and assets
      });

      const result =
        await ImportExportService.importConfiguration(invalidConfig);

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
          themeMode: "light" as const,
        },
      });

      // Execute with rename strategy
      const result = await ImportExportService.importConfiguration(
        importedJson,
        {
          ...DEFAULT_IMPORT_OPTIONS,
          profileConflictStrategy: "rename",
          assetConflictStrategy: "rename",
        },
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
        "Configuration must have a profiles array",
      );
      expect(result.errors).toContain(
        "Configuration must have an assets array",
      );
    });

    it("should warn about version mismatch", () => {
      const configWithVersionMismatch = {
        version: "2.0.0",
        profiles: [],
        assets: [],
      };

      const result = ImportExportService.validateImportedConfig(
        configWithVersionMismatch,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Version mismatch: expected 1.0.0, got 2.0.0",
      );
    });
  });
});
