import { cn } from "../../../../utils/cn";
import { inputVariants } from "../../../ui/variants";

interface SliderWithInputProps {
  label: string;
  value: number | undefined;
  localValue: number;
  onLocalChange: (value: number) => void;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  error?: string;
  min: number;
  max: number;
  step: number;
  sliderTabIndex?: number;
  inputTabIndex?: number;
  ariaDescribedBy?: string;
  displayValue?: number;
  unit?: string;
  /** Custom aria-label for the slider element */
  sliderAriaLabel?: string;
  /** Custom aria-label for the number input element */
  inputAriaLabel?: string;
}

export function SliderWithInput({
  label,
  value,
  localValue,
  onLocalChange,
  onChange,
  onBlur,
  error,
  min,
  max,
  step,
  sliderTabIndex,
  inputTabIndex,
  ariaDescribedBy,
  displayValue,
  unit = "",
  sliderAriaLabel,
  inputAriaLabel,
}: SliderWithInputProps) {
  const getInputClassName = () =>
    cn(
      inputVariants({
        variant: error ? "error" : "default",
      }),
    );

  const display = displayValue ?? value ?? 0;

  return (
    <div>
      <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={(e) => onLocalChange(Number(e.target.value))}
          onBlur={onBlur}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
          aria-label={sliderAriaLabel ?? `${label} slider`}
          aria-describedby={ariaDescribedBy}
          tabIndex={sliderTabIndex}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={display}
          onChange={(e) => {
            const newValue =
              e.target.value === "" ? undefined : Number(e.target.value);
            onChange(newValue);
          }}
          onBlur={onBlur}
          className={cn(getInputClassName(), "w-20")}
          aria-label={inputAriaLabel ?? `${label} input`}
          aria-describedby={ariaDescribedBy}
          tabIndex={inputTabIndex}
        />
        {unit && (
          <span className="text-sm text-[rgb(var(--color-muted-foreground))]">
            {unit}
          </span>
        )}
      </div>
      {error && (
        <p
          id={ariaDescribedBy}
          className="text-xs text-[rgb(var(--color-error))] mt-1"
        >
          {error}
        </p>
      )}
    </div>
  );
}
