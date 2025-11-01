import { describe, it, expect } from "vitest";
import {
  detectAssetTypeFromPath,
  isValidAssetPath,
} from "../assetTypeDetection";

describe("assetTypeDetection", () => {
  describe("detectAssetTypeFromPath", () => {
    describe("URLs with query strings", () => {
      it("detects image type from URL with query string", () => {
        const url = "https://example.com/image.png?param=value";
        expect(detectAssetTypeFromPath(url)).toBe("image");
      });

      it("detects video type from URL with query string", () => {
        const url = "https://example.com/video.mp4?autoplay=true";
        expect(detectAssetTypeFromPath(url)).toBe("video");
      });

      it("detects audio type from URL with query string", () => {
        const url = "https://example.com/audio.mp3?t=123";
        expect(detectAssetTypeFromPath(url)).toBe("audio");
      });
    });

    describe("URLs with path segments after extension", () => {
      it("detects image type from problematic URL in TEST_FINDINGS.md", () => {
        const url =
          "https://static.wikia.nocookie.net/hollowknight/images/d/da/Hornet_Beast%27s_Den.png/revision/latest?cb=20251028212915";
        expect(detectAssetTypeFromPath(url)).toBe("image");
      });

      it("detects type from URL with revision path", () => {
        const url = "https://example.com/video.webm/revision/latest?cb=123";
        expect(detectAssetTypeFromPath(url)).toBe("video");
      });
    });

    describe("URLs with fragments", () => {
      it("detects image type from URL with fragment", () => {
        const url = "https://example.com/image.png#section";
        expect(detectAssetTypeFromPath(url)).toBe("image");
      });

      it("detects video type from URL with query and fragment", () => {
        const url = "https://example.com/video.mp4?autoplay=true#player";
        expect(detectAssetTypeFromPath(url)).toBe("video");
      });
    });

    describe("File paths", () => {
      it("detects audio type from Windows file path", () => {
        const path = "C:\\Media\\test-audio.mp3";
        expect(detectAssetTypeFromPath(path)).toBe("audio");
      });

      it("detects video type from Unix file path", () => {
        const path = "/media/test-video.mp4";
        expect(detectAssetTypeFromPath(path)).toBe("video");
      });

      it("detects image type from relative file path", () => {
        const path = "./assets/image.png";
        expect(detectAssetTypeFromPath(path)).toBe("image");
      });
    });

    describe("Fallback behavior", () => {
      it("falls back to image for path without extension", () => {
        const path = "https://example.com/path/to/file";
        expect(detectAssetTypeFromPath(path)).toBe("image");
      });

      it("falls back to image for unsupported extension", () => {
        const path = "https://example.com/file.exe";
        expect(detectAssetTypeFromPath(path)).toBe("image");
      });
    });
  });

  describe("isValidAssetPath", () => {
    describe("URLs with query strings", () => {
      it("validates image URL with query string", () => {
        expect(
          isValidAssetPath("https://example.com/image.png?param=value"),
        ).toBe(true);
      });

      it("validates video URL with query string", () => {
        expect(
          isValidAssetPath("https://example.com/video.mp4?autoplay=true"),
        ).toBe(true);
      });
    });

    describe("URLs with path segments after extension", () => {
      it("validates problematic URL from TEST_FINDINGS.md", () => {
        const url =
          "https://static.wikia.nocookie.net/hollowknight/images/d/da/Hornet_Beast%27s_Den.png/revision/latest?cb=20251028212915";
        expect(isValidAssetPath(url)).toBe(true);
      });
    });

    describe("File paths", () => {
      it("validates Windows file path", () => {
        expect(isValidAssetPath("C:\\Media\\test-audio.mp3")).toBe(true);
      });

      it("validates Unix file path", () => {
        expect(isValidAssetPath("/media/test-video.mp4")).toBe(true);
      });
    });

    describe("Invalid paths", () => {
      it("returns false for path without extension", () => {
        expect(isValidAssetPath("https://example.com/path/to/file")).toBe(
          false,
        );
      });

      it("returns false for unsupported extension", () => {
        expect(isValidAssetPath("https://example.com/file.exe")).toBe(false);
      });
    });
  });
});
