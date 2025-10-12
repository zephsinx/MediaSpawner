/**
 * Tests for import/export validation utilities
 */

import { describe, it, expect } from "vitest";
import {
  validateExportData,
  validateImportData,
  validateWorkingDirectory,
  validateAssetAccessibility,
} from "../importExportValidation";
import type { SpawnProfile, MediaAsset } from "../../types";
import type {
  ExportedAsset,
  ExportedSpawnProfile,
} from "../dataTransformation";

describe("importExportValidation", () => {
  describe("validateExportData", () => {
    it("should validate valid export data", () => {
      const profiles = [
        {
          id: "profile-1",
          name: "Test Profile",
          description: "Test Description",
          spawns: [
            {
              id: "spawn-1",
              name: "Test Spawn",
              description: "Test Spawn Description",
              enabled: true,
              trigger: {
                type: "manual",
                enabled: true,
                config: {},
              },
              duration: 5000,
              assets: [
                {
                  assetId: "asset-1",
                  id: "spawn-asset-1",
                  enabled: true,
                  order: 0,
                },
              ],
            },
          ],
          lastModified: "2022-01-01T00:00:00.000Z",
        },
      ];

      const assets = [
        {
          id: "asset-1",
          name: "Test Asset",
          path: "/test/asset.jpg",
          isUrl: false,
          type: "image" as const,
        },
      ];

      const result = validateExportData(profiles, assets);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should detect invalid profile data", () => {
      const profiles = [
        {
          id: "",
          name: "",
          spawns: [],
          lastModified: "invalid-date",
        },
      ];

      const assets: ExportedAsset[] = [];

      const result = validateExportData(profiles, assets);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.profileErrors).length).toBeGreaterThan(0);
      expect(result.profileErrors[0]).toContain("Profile must have a valid ID");
      expect(result.profileErrors[0]).toContain(
        "Profile must have a non-empty name",
      );
    });

    it("should detect invalid asset data", () => {
      const profiles: ExportedSpawnProfile[] = [];
      const assets = [
        {
          id: "",
          name: "",
          path: "",
          isUrl: false,
          type: "invalid-type" as ExportedAsset["type"],
        },
      ];

      const result = validateExportData(profiles, assets);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.assetErrors).length).toBeGreaterThan(0);
      expect(result.assetErrors[0]).toContain("Asset must have a valid ID");
      expect(result.assetErrors[0]).toContain(
        "Asset must have a non-empty name",
      );
    });

    it("should detect duplicate IDs", () => {
      const profiles = [
        {
          id: "duplicate-id",
          name: "Profile 1",
          spawns: [],
          lastModified: "2022-01-01T00:00:00.000Z",
        },
        {
          id: "duplicate-id",
          name: "Profile 2",
          spawns: [],
          lastModified: "2022-01-01T00:00:00.000Z",
        },
      ];

      const assets: ExportedAsset[] = [];

      const result = validateExportData(profiles, assets);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Duplicate profile IDs found: duplicate-id",
      );
    });

    it("should detect orphaned spawn assets", () => {
      const profiles = [
        {
          id: "profile-1",
          name: "Test Profile",
          spawns: [
            {
              id: "spawn-1",
              name: "Test Spawn",
              enabled: true,
              trigger: { type: "manual", enabled: true, config: {} },
              duration: 5000,
              assets: [
                {
                  assetId: "missing-asset",
                  id: "spawn-asset-1",
                  enabled: true,
                  order: 0,
                },
              ],
            },
          ],
          lastModified: "2022-01-01T00:00:00.000Z",
        },
      ];

      const assets: ExportedAsset[] = [];

      const result = validateExportData(profiles, assets);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Profile 0, Spawn 0: Asset missing-asset is referenced but not found in assets array",
      );
    });
  });

  describe("validateImportData", () => {
    it("should validate valid import data", () => {
      const profiles: SpawnProfile[] = [
        {
          id: "profile-1",
          name: "Test Profile",
          description: "Test Description",
          spawns: [],
          lastModified: Date.now(),
          isActive: false,
        },
      ];

      const assets: MediaAsset[] = [
        {
          id: "asset-1",
          name: "Test Asset",
          path: "/test/asset.jpg",
          isUrl: false,
          type: "image",
        },
      ];

      const result = validateImportData(profiles, assets);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid profile data", () => {
      const profiles: SpawnProfile[] = [
        {
          id: "",
          name: "",
          spawns: [],
          lastModified: Date.now(),
          isActive: false,
        },
      ];

      const assets: MediaAsset[] = [];

      const result = validateImportData(profiles, assets);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.profileErrors).length).toBeGreaterThan(0);
    });

    it("should detect relationship errors", () => {
      const profiles: SpawnProfile[] = [
        {
          id: "profile-1",
          name: "Test Profile",
          spawns: [
            {
              id: "spawn-1",
              name: "Test Spawn",
              enabled: true,
              trigger: { type: "manual", enabled: true, config: {} },
              duration: 5000,
              assets: [
                {
                  assetId: "missing-asset",
                  id: "spawn-asset-1",
                  enabled: true,
                  order: 0,
                  overrides: {},
                },
              ],
              lastModified: Date.now(),
              order: 0,
            },
          ],
          lastModified: Date.now(),
          isActive: false,
        },
      ];

      const assets: MediaAsset[] = [];

      const result = validateImportData(profiles, assets);

      expect(result.isValid).toBe(false);
      expect(result.relationshipErrors).toContain(
        "Profile 0, Spawn 0: Asset missing-asset is referenced but not found in assets array",
      );
    });
  });

  describe("validateWorkingDirectory", () => {
    it("should validate valid working directory", () => {
      const result = validateWorkingDirectory("/valid/path");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid working directory", () => {
      const result = validateWorkingDirectory("/invalid<path>");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Working directory contains invalid characters",
      );
    });

    it("should warn about empty working directory", () => {
      const result = validateWorkingDirectory("");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Working directory is empty");
    });
  });

  describe("validateAssetAccessibility", () => {
    it("should validate URL assets", () => {
      const asset: MediaAsset = {
        id: "asset-1",
        name: "Test Asset",
        path: "https://example.com/asset.jpg",
        isUrl: true,
        type: "image",
      };

      const result = validateAssetAccessibility(asset);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate local file assets", () => {
      const asset: MediaAsset = {
        id: "asset-1",
        name: "Test Asset",
        path: "/test/asset.jpg",
        isUrl: false,
        type: "image",
      };

      const result = validateAssetAccessibility(asset);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Cannot verify local file accessibility in browser environment",
      );
    });

    it("should detect invalid local file paths", () => {
      const asset: MediaAsset = {
        id: "asset-1",
        name: "Test Asset",
        path: "/test/asset.unsupported",
        isUrl: false,
        type: "image",
      };

      const result = validateAssetAccessibility(asset);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Asset path: Unsupported file type");
    });
  });
});
