import type {
  MediaAssetProperties,
  MonitorType,
} from "../../../../types/media";
import { cn } from "../../../../utils/cn";
import { inputVariants } from "../../../ui/variants";
import { FieldTooltip } from "../fields/FieldTooltip";
import { SliderWithInput } from "../fields/SliderWithInput";

type FieldKey = keyof MediaAssetProperties;

interface PlaybackPropertiesSectionProps {
  draftValues: Partial<MediaAssetProperties>;
  validationErrors: Partial<Record<FieldKey, string>>;
  setField: (key: FieldKey, value: MediaAssetProperties[FieldKey]) => void;
  handleBlur: (key: FieldKey) => void;
  localVolume: number;
  setLocalVolume: (value: number) => void;
  validateField: (
    key: FieldKey,
    values: Partial<MediaAssetProperties>,
  ) => string | undefined;
  draftValuesRef: React.RefObject<Partial<MediaAssetProperties>>;
  setValidationErrors: React.Dispatch<
    React.SetStateAction<Partial<Record<FieldKey, string>>>
  >;
}

export function PlaybackPropertiesSection({
  draftValues,
  validationErrors,
  setField,
  handleBlur,
  localVolume,
  setLocalVolume,
  validateField,
  draftValuesRef,
  setValidationErrors,
}: PlaybackPropertiesSectionProps) {
  const getInputClassName = (field?: FieldKey) =>
    cn(
      inputVariants({
        variant: field && validationErrors[field] ? "error" : "default",
      }),
    );

  return (
    <section className="bg-[rgb(var(--color-surface-1))] border border-[rgb(var(--color-border))] rounded-lg shadow-md p-4">
      <h3 className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
        Playback Properties
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <SliderWithInput
            label="Volume (%)"
            value={
              draftValues.volume !== undefined
                ? draftValues.volume * 100
                : undefined
            }
            localValue={Math.round(localVolume * 100)}
            onLocalChange={(value) => setLocalVolume(value / 100)}
            onChange={(value) =>
              setField("volume", value !== undefined ? value / 100 : undefined)
            }
            onBlur={() => {
              const error = validateField("volume", {
                ...draftValuesRef.current,
                volume: localVolume,
              });
              setValidationErrors((prev) => ({
                ...prev,
                volume: error,
              }));
            }}
            error={validationErrors.volume}
            min={0}
            max={100}
            step={1}
            displayValue={Math.round((draftValues.volume ?? 0.5) * 100)}
            sliderTabIndex={18}
            inputTabIndex={19}
            ariaDescribedBy="volume-error"
            sliderAriaLabel="Volume slider"
            inputAriaLabel="Volume input"
          />
        </div>

        <div>
          <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
            Monitor Type
            <FieldTooltip content="Monitor Only: Hear through headphones, not in stream. Monitor and Output: Both headphones and stream." />
          </label>
          <select
            value={draftValues.monitorType ?? ""}
            onChange={(e) =>
              setField(
                "monitorType",
                e.target.value ? (e.target.value as MonitorType) : undefined,
              )
            }
            onBlur={() => handleBlur("monitorType")}
            className={getInputClassName("monitorType")}
            tabIndex={20}
          >
            <option value="">Not set (OBS default)</option>
            <option value="monitor-only">Monitor Only</option>
            <option value="monitor-and-output">Monitor and Output</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-[rgb(var(--color-fg))]">
            <input
              type="checkbox"
              checked={!!draftValues.loop}
              onChange={(e) => setField("loop", e.target.checked)}
              className="focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
              tabIndex={21}
            />
            Loop
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-[rgb(var(--color-fg))]">
            <input
              type="checkbox"
              checked={!!draftValues.muted}
              onChange={(e) => setField("muted", e.target.checked)}
              className="focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
              tabIndex={22}
            />
            Muted
          </label>
        </div>
      </div>
    </section>
  );
}
