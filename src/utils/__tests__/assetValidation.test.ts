import { describe, it, expect } from "vitest";
import {
  validateRotation,
  validateCropSettings,
  validateAlignment,
  validateBoundsType,
  validateBoundsAlignment,
  validateScaleValue,
  validateDimensionsValues,
  validatePositionValues,
} from "../assetValidation";
import type {
  ScaleObject,
  CropSettings,
  Dimensions,
  Position,
  AlignmentOption,
  BoundsType,
} from "../../types/media";

describe("assetValidation", () => {
  describe("validateDimensionsValues", () => {
    it("returns valid for undefined", () => {
      const result = validateDimensionsValues(undefined);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for valid dimensions", () => {
      const dimensions: Dimensions = { width: 100, height: 200 };
      const result = validateDimensionsValues(dimensions);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for minimum valid dimensions", () => {
      const dimensions: Dimensions = { width: 1, height: 1 };
      const result = validateDimensionsValues(dimensions);
      expect(result.isValid).toBe(true);
    });

    it("returns invalid for zero width", () => {
      const dimensions: Dimensions = { width: 0, height: 100 };
      const result = validateDimensionsValues(dimensions);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Width/Height must be > 0");
    });

    it("returns invalid for zero height", () => {
      const dimensions: Dimensions = { width: 100, height: 0 };
      const result = validateDimensionsValues(dimensions);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Width/Height must be > 0");
    });

    it("returns invalid for negative width", () => {
      const dimensions: Dimensions = { width: -1, height: 100 };
      const result = validateDimensionsValues(dimensions);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Width/Height must be > 0");
    });

    it("returns invalid for negative height", () => {
      const dimensions: Dimensions = { width: 100, height: -1 };
      const result = validateDimensionsValues(dimensions);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Width/Height must be > 0");
    });
  });

  describe("validatePositionValues", () => {
    it("returns valid for undefined", () => {
      const result = validatePositionValues(undefined);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for valid position", () => {
      const position: Position = { x: 100, y: 200 };
      const result = validatePositionValues(position);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for zero position", () => {
      const position: Position = { x: 0, y: 0 };
      const result = validatePositionValues(position);
      expect(result.isValid).toBe(true);
    });

    it("returns invalid for negative x", () => {
      const position: Position = { x: -1, y: 100 };
      const result = validatePositionValues(position);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Use non-negative values");
    });

    it("returns invalid for negative y", () => {
      const position: Position = { x: 100, y: -1 };
      const result = validatePositionValues(position);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Use non-negative values");
    });
  });

  describe("validateRotation", () => {
    it("returns valid for undefined", () => {
      const result = validateRotation(undefined);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for valid rotation values", () => {
      expect(validateRotation(0).isValid).toBe(true);
      expect(validateRotation(180).isValid).toBe(true);
      expect(validateRotation(360).isValid).toBe(true);
    });

    it("returns invalid for negative values", () => {
      const result = validateRotation(-1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Enter 0–360°");
    });

    it("returns invalid for values greater than 360", () => {
      const result = validateRotation(361);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Enter 0–360°");
    });

    it("returns invalid for NaN values", () => {
      const result = validateRotation(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Enter 0–360°");
    });
  });

  describe("validateCropSettings", () => {
    it("returns valid for undefined", () => {
      const result = validateCropSettings(undefined);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for valid crop settings", () => {
      const crop: CropSettings = { left: 10, top: 20, right: 30, bottom: 40 };
      const result = validateCropSettings(crop);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for zero crop values", () => {
      const crop: CropSettings = { left: 0, top: 0, right: 0, bottom: 0 };
      const result = validateCropSettings(crop);
      expect(result.isValid).toBe(true);
    });

    it("returns invalid for negative left value", () => {
      const crop: CropSettings = { left: -1, top: 0, right: 0, bottom: 0 };
      const result = validateCropSettings(crop);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Crop left must be ≥ 0");
    });

    it("returns invalid for negative top value", () => {
      const crop: CropSettings = { left: 0, top: -1, right: 0, bottom: 0 };
      const result = validateCropSettings(crop);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Crop top must be ≥ 0");
    });

    it("returns invalid for negative right value", () => {
      const crop: CropSettings = { left: 0, top: 0, right: -1, bottom: 0 };
      const result = validateCropSettings(crop);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Crop right must be ≥ 0");
    });

    it("returns invalid for negative bottom value", () => {
      const crop: CropSettings = { left: 0, top: 0, right: 0, bottom: -1 };
      const result = validateCropSettings(crop);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Crop bottom must be ≥ 0");
    });

    it("returns invalid when left + right >= width", () => {
      const crop: CropSettings = { left: 30, top: 0, right: 30, bottom: 0 };
      const dimensions: Dimensions = { width: 50, height: 100 };
      const result = validateCropSettings(crop, dimensions);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Crop left + right must be < width");
    });

    it("returns invalid when top + bottom >= height", () => {
      const crop: CropSettings = { left: 0, top: 50, right: 0, bottom: 50 };
      const dimensions: Dimensions = { width: 100, height: 80 };
      const result = validateCropSettings(crop, dimensions);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Crop top + bottom must be < height");
    });

    it("returns valid when crop is within dimensions", () => {
      const crop: CropSettings = { left: 10, top: 20, right: 30, bottom: 40 };
      const dimensions: Dimensions = { width: 100, height: 100 };
      const result = validateCropSettings(crop, dimensions);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for partial crop objects with undefined fields", () => {
      const crop: Partial<CropSettings> = {
        left: 10,
        top: undefined,
        right: 30,
        bottom: undefined,
      };
      const result = validateCropSettings(crop as CropSettings);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for partial crop objects with only some fields defined", () => {
      const crop: Partial<CropSettings> = { left: 10, top: 20 };
      const result = validateCropSettings(crop as CropSettings);
      expect(result.isValid).toBe(true);
    });

    it("returns invalid for partial crop with negative defined field", () => {
      const crop: Partial<CropSettings> = {
        left: -1,
        top: undefined,
        right: undefined,
        bottom: undefined,
      };
      const result = validateCropSettings(crop as CropSettings);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Crop left must be ≥ 0");
    });
  });

  describe("validateAlignment", () => {
    it("returns valid for undefined", () => {
      const result = validateAlignment(undefined);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for all valid alignment values", () => {
      const validAlignments: AlignmentOption[] = [0, 1, 2, 4, 5, 6, 8, 9, 10];
      validAlignments.forEach((alignment) => {
        const result = validateAlignment(alignment);
        expect(result.isValid).toBe(true);
      });
    });

    it("returns invalid for invalid alignment values", () => {
      const invalidAlignments = [3, 7, 11, -1, 15];
      invalidAlignments.forEach((alignment) => {
        // @ts-expect-error - Testing invalid input
        const result = validateAlignment(alignment);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Invalid alignment value");
      });
    });
  });

  describe("validateBoundsType", () => {
    it("returns valid for undefined", () => {
      const result = validateBoundsType(undefined);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for all valid bounds types", () => {
      const validBoundsTypes: BoundsType[] = [
        "OBS_BOUNDS_NONE",
        "OBS_BOUNDS_STRETCH",
        "OBS_BOUNDS_SCALE_INNER",
        "OBS_BOUNDS_SCALE_OUTER",
        "OBS_BOUNDS_SCALE_TO_WIDTH",
        "OBS_BOUNDS_SCALE_TO_HEIGHT",
        "OBS_BOUNDS_MAX_ONLY",
      ];
      validBoundsTypes.forEach((boundsType) => {
        const result = validateBoundsType(boundsType);
        expect(result.isValid).toBe(true);
      });
    });

    it("returns invalid for invalid bounds type", () => {
      // @ts-expect-error - Testing invalid input
      const result = validateBoundsType("INVALID_BOUNDS_TYPE");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid bounds type");
    });
  });

  describe("validateBoundsAlignment", () => {
    it("returns valid for undefined", () => {
      const result = validateBoundsAlignment(undefined);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for all valid alignment values", () => {
      const validAlignments: AlignmentOption[] = [0, 1, 2, 4, 5, 6, 8, 9, 10];
      validAlignments.forEach((alignment) => {
        const result = validateBoundsAlignment(alignment);
        expect(result.isValid).toBe(true);
      });
    });

    it("returns invalid for invalid alignment values", () => {
      const invalidAlignments = [3, 7, 11, -1, 15];
      invalidAlignments.forEach((alignment) => {
        // @ts-expect-error - Testing invalid input
        const result = validateBoundsAlignment(alignment);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Invalid bounds alignment value");
      });
    });
  });

  describe("validateScaleValue", () => {
    it("returns valid for undefined", () => {
      const result = validateScaleValue(undefined);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for valid number values", () => {
      expect(validateScaleValue(0).isValid).toBe(true);
      expect(validateScaleValue(1).isValid).toBe(true);
      expect(validateScaleValue(2.5).isValid).toBe(true);
    });

    it("returns invalid for negative number values", () => {
      const result = validateScaleValue(-1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Must be ≥ 0");
    });

    it("returns invalid for NaN number values", () => {
      const result = validateScaleValue(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Must be ≥ 0");
    });

    it("returns valid for valid ScaleObject", () => {
      const scaleObj: ScaleObject = { x: 1, y: 2, linked: true };
      const result = validateScaleValue(scaleObj);
      expect(result.isValid).toBe(true);
    });

    it("returns valid for ScaleObject with zero values", () => {
      const scaleObj: ScaleObject = { x: 0, y: 0, linked: false };
      const result = validateScaleValue(scaleObj);
      expect(result.isValid).toBe(true);
    });

    it("returns invalid for ScaleObject with negative x value", () => {
      const scaleObj: ScaleObject = { x: -1, y: 1, linked: true };
      const result = validateScaleValue(scaleObj);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Scale X must be ≥ 0");
    });

    it("returns invalid for ScaleObject with negative y value", () => {
      const scaleObj: ScaleObject = { x: 1, y: -1, linked: true };
      const result = validateScaleValue(scaleObj);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Scale Y must be ≥ 0");
    });

    it("returns invalid for ScaleObject with NaN x value", () => {
      const scaleObj: ScaleObject = { x: NaN, y: 1, linked: true };
      const result = validateScaleValue(scaleObj);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Scale X must be ≥ 0");
    });

    it("returns invalid for ScaleObject with NaN y value", () => {
      const scaleObj: ScaleObject = { x: 1, y: NaN, linked: true };
      const result = validateScaleValue(scaleObj);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Scale Y must be ≥ 0");
    });

    it("returns invalid for non-object, non-number values", () => {
      // @ts-expect-error - Testing invalid input
      const result = validateScaleValue("invalid");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid scale value");
    });

    it("returns invalid for null values", () => {
      // @ts-expect-error - Testing invalid input
      const result = validateScaleValue(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid scale value");
    });
  });
});
