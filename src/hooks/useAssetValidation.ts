import { useCallback } from "react";
import type { MediaAssetProperties } from "../types/media";
import {
  validateVolumePercent,
  validateDimensionsValues,
  validatePositionValues,
  validateScaleValue,
  validateRotation,
  validateCropSettings,
  validateBoundsType,
  validateAlignment,
} from "../utils/assetValidation";

type FieldKey = keyof MediaAssetProperties;

export function useAssetValidation() {
  const validateField = useCallback(
    (
      key: FieldKey,
      values: Partial<MediaAssetProperties>,
    ): string | undefined => {
      switch (key) {
        case "volume": {
          const pct = Math.round(((values.volume ?? 0.5) as number) * 100);
          const res = validateVolumePercent(pct);
          return res.isValid ? undefined : res.error;
        }
        case "dimensions": {
          const res = validateDimensionsValues(values.dimensions);
          return res.isValid ? undefined : res.error;
        }
        case "position": {
          const res = validatePositionValues(values.position);
          return res.isValid ? undefined : res.error;
        }
        case "scale": {
          const scaleValue =
            typeof values.scale === "number" ? values.scale : values.scale?.x;
          const res = validateScaleValue(scaleValue);
          return res.isValid ? undefined : res.error;
        }
        case "rotation": {
          const res = validateRotation(values.rotation);
          return res.isValid ? undefined : res.error;
        }
        case "crop": {
          const res = validateCropSettings(values.crop);
          return res.isValid ? undefined : res.error;
        }
        case "boundsType": {
          const res = validateBoundsType(values.boundsType);
          return res.isValid ? undefined : res.error;
        }
        case "alignment": {
          const res = validateAlignment(values.alignment);
          return res.isValid ? undefined : res.error;
        }
        default:
          return undefined;
      }
    },
    [],
  );

  return { validateField };
}
