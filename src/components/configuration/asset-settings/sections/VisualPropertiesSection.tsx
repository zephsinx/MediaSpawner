import { useMemo } from "react";
import type {
  MediaAssetProperties,
  BoundsType,
  AlignmentOption,
} from "../../../../types/media";
import { cn } from "../../../../utils/cn";
import { inputVariants } from "../../../ui/variants";
import { FieldTooltip } from "../fields/FieldTooltip";
import { CoordinatePairInput } from "../fields/CoordinatePairInput";
import { SliderWithInput } from "../fields/SliderWithInput";
import { ScaleInput } from "../fields/ScaleInput";
import { CropInput } from "../fields/CropInput";
import { Info } from "lucide-react";

type FieldKey = keyof MediaAssetProperties;

interface VisualPropertiesSectionProps {
  draftValues: Partial<MediaAssetProperties>;
  validationErrors: Partial<Record<FieldKey, string>>;
  setField: (key: FieldKey, value: MediaAssetProperties[FieldKey]) => void;
  handleBlur: (key: FieldKey) => void;
  localRotation: number;
  setLocalRotation: (value: number) => void;
  validateField: (
    key: FieldKey,
    values: Partial<MediaAssetProperties>,
  ) => string | undefined;
  draftValuesRef: React.RefObject<Partial<MediaAssetProperties>>;
  setValidationErrors: React.Dispatch<
    React.SetStateAction<Partial<Record<FieldKey, string>>>
  >;
}

export function VisualPropertiesSection({
  draftValues,
  validationErrors,
  setField,
  handleBlur,
  localRotation,
  setLocalRotation,
  validateField,
  draftValuesRef,
  setValidationErrors,
}: VisualPropertiesSectionProps) {
  const getInputClassName = (field?: FieldKey) =>
    cn(
      inputVariants({
        variant: field && validationErrors[field] ? "error" : "default",
      }),
    );

  // Ensure scale objects always have a boolean `linked` to satisfy ScaleValue
  const normalizedScale = useMemo(() => {
    const scale = draftValues.scale;
    if (scale === undefined || typeof scale === "number") {
      return scale;
    }
    return {
      x: scale.x,
      y: scale.y,
      linked: scale.linked ?? true,
    };
  }, [draftValues.scale]);

  return (
    <section className="bg-[rgb(var(--color-surface-1))] border border-[rgb(var(--color-border))] rounded-lg shadow-md p-4">
      <h3 className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
        Visual Properties
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CoordinatePairInput
          label="Dimensions"
          xLabel="Width (px)"
          yLabel="Height (px)"
          xValue={draftValues.dimensions?.width}
          yValue={draftValues.dimensions?.height}
          onChange={(width, height) => {
            if (width === undefined && height === undefined) {
              setField("dimensions", undefined);
            } else {
              setField("dimensions", { width, height });
            }
          }}
          onBlur={() => handleBlur("dimensions")}
          error={validationErrors.dimensions}
          tooltip="Positive numbers only."
          xMin={1}
          yMin={1}
          xTabIndex={1}
          yTabIndex={2}
          xAriaDescribedBy="dimensions-error"
        />

        <CoordinatePairInput
          label="Position"
          xLabel="X Position (px)"
          yLabel="Y Position (px)"
          xValue={draftValues.position?.x}
          yValue={draftValues.position?.y}
          onChange={(x, y) => {
            if (x === undefined && y === undefined) {
              setField("position", undefined);
            } else {
              setField("position", { x, y });
            }
          }}
          onBlur={() => handleBlur("position")}
          error={validationErrors.position}
          tooltip="Use non-negative values. Relative/centered behavior depends on mode."
          xMin={0}
          yMin={0}
          xTabIndex={3}
          yTabIndex={4}
          xAriaDescribedBy="position-error"
        />

        <ScaleInput
          label="Scale"
          value={normalizedScale}
          onChange={(value) => setField("scale", value)}
          onBlur={() => handleBlur("scale")}
          error={validationErrors.scale}
          tooltip='Enter a non-negative factor (1.0 = 100%). Toggle "Unlinked" to scale X and Y independently.'
          tabIndex={5}
          ariaDescribedBy="scale-error"
        />
      </div>

      <div className="mb-6">
        <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
          Random Coordinates
          <FieldTooltip content="Generates random position each spawn execution." />
        </label>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={draftValues.randomCoordinates ?? false}
            onChange={(e) => {
              const isEnabled = e.target.checked;
              setField("randomCoordinates", isEnabled);
              // Automatically set to absolute positioning when enabled
              if (isEnabled && draftValues.positionMode !== "absolute") {
                setField("positionMode", "absolute");
              }
            }}
            className="mt-0.5 rounded focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
            tabIndex={8}
          />
          <span className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Enable random positioning
          </span>
        </div>
        {draftValues.randomCoordinates &&
          !draftValues.dimensions?.width &&
          !draftValues.dimensions?.height && (
            <div className="mt-2 flex items-start gap-2 p-2 bg-[rgb(var(--color-warning))]/10 border border-[rgb(var(--color-warning))]/20 rounded-md">
              <Info className="w-4 h-4 text-[rgb(var(--color-warning))] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[rgb(var(--color-warning))]">
                Asset may spawn off-screen without width/height set
              </p>
            </div>
          )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
          Position Mode
        </label>
        <select
          value={draftValues.positionMode ?? "absolute"}
          onChange={(e) =>
            setField(
              "positionMode",
              e.target.value as MediaAssetProperties["positionMode"],
            )
          }
          className={getInputClassName()}
          tabIndex={9}
        >
          <option value="absolute">Absolute (px)</option>
          <option value="relative">Relative (%)</option>
          <option value="centered">Centered</option>
        </select>
      </div>

      <div className="mb-6">
        <SliderWithInput
          label="Rotation (°)"
          value={draftValues.rotation}
          localValue={localRotation}
          onLocalChange={setLocalRotation}
          onChange={(value) => setField("rotation", value)}
          onBlur={() => {
            // Validate using the local value for sliders
            const error = validateField("rotation", {
              ...draftValuesRef.current,
              rotation: localRotation,
            });
            setValidationErrors((prev) => ({
              ...prev,
              rotation: error,
            }));
          }}
          error={validationErrors.rotation}
          min={0}
          max={360}
          step={1}
          sliderTabIndex={10}
          inputTabIndex={11}
          ariaDescribedBy="rotation-error"
          sliderAriaLabel="Rotation slider"
          inputAriaLabel="Rotation input"
        />
      </div>

      <div>
        <CropInput
          label="Crop (px)"
          value={draftValues.crop}
          onChange={(value) => setField("crop", value)}
          onBlur={() => handleBlur("crop")}
          error={validationErrors.crop}
          tooltip="Crop the source (0 means no crop). Applied before scaling."
          tabIndex={12}
          ariaDescribedBy="crop-error"
        />
      </div>

      <div>
        <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
          Bounds Type
          <FieldTooltip content="OBS bounds setting. 'None' uses source size; others fit/fill within dimensions." />
        </label>
        <select
          value={draftValues.boundsType ?? ""}
          onChange={(e) =>
            setField(
              "boundsType",
              e.target.value ? (e.target.value as BoundsType) : undefined,
            )
          }
          onBlur={() => handleBlur("boundsType")}
          className={getInputClassName("boundsType")}
          aria-describedby="bounds-type-error"
          tabIndex={16}
        >
          <option value="">Select bounds type...</option>
          <option value="OBS_BOUNDS_NONE">None</option>
          <option value="OBS_BOUNDS_STRETCH">Stretch</option>
          <option value="OBS_BOUNDS_SCALE_INNER">Scale Inner</option>
          <option value="OBS_BOUNDS_SCALE_OUTER">Scale Outer</option>
          <option value="OBS_BOUNDS_SCALE_TO_WIDTH">Scale to Width</option>
          <option value="OBS_BOUNDS_SCALE_TO_HEIGHT">Scale to Height</option>
          <option value="OBS_BOUNDS_MAX_ONLY">Max Only</option>
        </select>
        {validationErrors.boundsType && (
          <p
            id="bounds-type-error"
            className="text-xs text-[rgb(var(--color-error))] mt-1"
          >
            {validationErrors.boundsType}
          </p>
        )}
      </div>

      <div>
        <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
          Alignment
          <FieldTooltip content="Alignment within the bounds." />
        </label>
        <select
          value={draftValues.alignment ?? ""}
          onChange={(e) =>
            setField(
              "alignment",
              e.target.value
                ? (Number(e.target.value) as AlignmentOption)
                : undefined,
            )
          }
          onBlur={() => handleBlur("alignment")}
          className={getInputClassName("alignment")}
          aria-describedby="alignment-error"
          tabIndex={17}
        >
          <option value="">Select alignment...</option>
          <option value="0">Top Left</option>
          <option value="1">Top Center</option>
          <option value="2">Top Right</option>
          <option value="4">Center Left</option>
          <option value="5">Center</option>
          <option value="6">Center Right</option>
          <option value="8">Bottom Left</option>
          <option value="9">Bottom Center</option>
          <option value="10">Bottom Right</option>
        </select>
        {validationErrors.alignment && (
          <p
            id="alignment-error"
            className="text-xs text-[rgb(var(--color-error))] mt-1"
          >
            {validationErrors.alignment}
          </p>
        )}
      </div>
    </section>
  );
}
