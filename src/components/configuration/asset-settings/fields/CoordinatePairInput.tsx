import { cn } from "../../../../utils/cn";
import { inputVariants } from "../../../ui/variants";
import { FieldTooltip } from "./FieldTooltip";

interface CoordinatePairInputProps {
  label: string;
  xLabel: string;
  yLabel: string;
  xValue: number | undefined;
  yValue: number | undefined;
  onChange: (x: number | undefined, y: number | undefined) => void;
  onBlur?: () => void;
  error?: string;
  tooltip?: string;
  xMin?: number;
  yMin?: number;
  xTabIndex?: number;
  yTabIndex?: number;
  xAriaDescribedBy?: string;
}

export function CoordinatePairInput({
  xLabel,
  yLabel,
  xValue,
  yValue,
  onChange,
  onBlur,
  error,
  tooltip,
  xMin = 0,
  yMin = 0,
  xTabIndex,
  yTabIndex,
  xAriaDescribedBy,
}: CoordinatePairInputProps) {
  const getInputClassName = () =>
    cn(
      inputVariants({
        variant: error ? "error" : "default",
      }),
    );

  return (
    <>
      <div>
        <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
          {xLabel}
          {tooltip && <FieldTooltip content={tooltip} />}
        </label>
        <input
          type="number"
          min={xMin}
          value={xValue ?? ""}
          onChange={(e) => {
            const newXValue =
              e.target.value === "" ? undefined : Number(e.target.value);
            if (newXValue === undefined && yValue === undefined) {
              onChange(undefined, undefined);
            } else {
              onChange(newXValue, yValue);
            }
          }}
          onBlur={onBlur}
          className={getInputClassName()}
          aria-describedby={xAriaDescribedBy}
          tabIndex={xTabIndex}
        />
        {error && xAriaDescribedBy && (
          <p
            id={xAriaDescribedBy}
            className="text-xs text-[rgb(var(--color-error))] mt-1"
          >
            {error}
          </p>
        )}
      </div>
      <div>
        <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
          {yLabel}
          {tooltip && <FieldTooltip content={tooltip} />}
        </label>
        <input
          type="number"
          min={yMin}
          value={yValue ?? ""}
          onChange={(e) => {
            const newYValue =
              e.target.value === "" ? undefined : Number(e.target.value);
            if (xValue === undefined && newYValue === undefined) {
              onChange(undefined, undefined);
            } else {
              onChange(xValue, newYValue);
            }
          }}
          onBlur={onBlur}
          className={getInputClassName()}
          tabIndex={yTabIndex}
        />
      </div>
    </>
  );
}
