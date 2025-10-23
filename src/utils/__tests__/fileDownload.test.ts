import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  downloadJsonFile,
  generateTimestampedFilename,
  downloadConfiguration,
} from "../fileDownload";

// Mock DOM methods
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

// Mock URL methods
Object.defineProperty(global, "URL", {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

// Mock document methods
Object.defineProperty(global, "document", {
  value: {
    createElement: mockCreateElement,
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
  },
  writable: true,
});

describe("fileDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    const mockAnchor = {
      href: "",
      download: "",
      click: mockClick,
    };

    mockCreateElement.mockReturnValue(mockAnchor);
    mockCreateObjectURL.mockReturnValue("blob:mock-url");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("downloadJsonFile", () => {
    it("should download JSON file with correct data and filename", async () => {
      const testData = { name: "test", value: 123 };
      const filename = "test-file";

      await downloadJsonFile(testData, filename);

      // Verify Blob creation
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));

      // Verify anchor element creation and configuration
      expect(mockCreateElement).toHaveBeenCalledWith("a");
      const anchor = mockCreateElement.mock.results[0].value;
      expect(anchor.href).toBe("blob:mock-url");
      expect(anchor.download).toBe("test-file.json");

      // Verify DOM manipulation
      expect(mockAppendChild).toHaveBeenCalledWith(anchor);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalledWith(anchor);

      // Verify cleanup
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should format JSON with proper indentation", async () => {
      const testData = { nested: { value: "test" } };
      const filename = "formatted-test";

      await downloadJsonFile(testData, filename);

      // Verify Blob was created with formatted JSON
      const blobCall = mockCreateObjectURL.mock.calls[0][0];
      expect(blobCall).toBeInstanceOf(Blob);
      expect(blobCall.type).toBe("application/json");
    });

    it("should handle errors gracefully", async () => {
      const testData = { name: "test" };
      const filename = "error-test";

      // Mock an error in createObjectURL
      mockCreateObjectURL.mockImplementation(() => {
        throw new Error("Mock error");
      });

      await expect(downloadJsonFile(testData, filename)).rejects.toThrow(
        "Failed to download file: Mock error",
      );
    });

    it("should handle non-serializable data", async () => {
      const testData = { circular: {} };
      testData.circular = testData; // Create circular reference
      const filename = "circular-test";

      await expect(downloadJsonFile(testData, filename)).rejects.toThrow();
    });
  });

  describe("generateTimestampedFilename", () => {
    it("should generate filename with current timestamp", () => {
      const baseName = "test-config";
      const filename = generateTimestampedFilename(baseName);

      // Should match pattern: baseName_YYYY-MM-DD_HH-MM-SS
      const pattern = /^test-config_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
      expect(filename).toMatch(pattern);
    });

    it("should handle empty base name", () => {
      const filename = generateTimestampedFilename("");
      const pattern = /^_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
      expect(filename).toMatch(pattern);
    });

    it("should handle base name with special characters", () => {
      const baseName = "test-config_v1.0";
      const filename = generateTimestampedFilename(baseName);

      expect(filename).toContain("test-config_v1.0");
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
    });
  });

  describe("downloadConfiguration", () => {
    it("should download configuration with default filename", async () => {
      const configData = { profiles: [], settings: {} };

      await downloadConfiguration(configData);

      expect(mockCreateElement).toHaveBeenCalledWith("a");
      const anchor = mockCreateElement.mock.results[0].value;
      expect(anchor.download).toMatch(
        /^mediaspawner-config_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/,
      );
    });

    it("should download configuration with custom base name", async () => {
      const configData = { profiles: [] };
      const customName = "my-config";

      await downloadConfiguration(configData, customName);

      const anchor = mockCreateElement.mock.results[0].value;
      expect(anchor.download).toMatch(
        /^my-config_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/,
      );
    });

    it("should handle empty configuration data", async () => {
      const configData = {};

      await expect(downloadConfiguration(configData)).resolves.not.toThrow();
    });
  });
});
