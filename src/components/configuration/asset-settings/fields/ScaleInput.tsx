import { cn } from "../../../../utils/cn";
import { inputVariants } from "../../../ui/variants";
import { FieldTooltip } from "./FieldTooltip";

type ScaleValue =
  | number
  | { x?: number; y?: number; linked: boolean }
  | undefined;

interface ScaleInputProps {
  label: string;
  value: ScaleValue;
  onChange: (value: ScaleValue) => void;
  onBlur?: () => void;
  error?: string;
  tooltip?: string;
  tabIndex?: number;
  ariaDescribedBy?: string;
}

export function ScaleInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  tooltip,
  tabIndex,
  ariaDescribedBy,
}: ScaleInputProps) {
  const getInputClassName = () =>
    cn(
      inputVariants({
        variant: error ? "error" : "default",
      }),
    );

  const isUnlinked =
    typeof value === "object" && value !== null && value.linked === false;

  const handleUnlinkedToggle = (checked: boolean) => {
    const currentScale = value;

    if (checked) {
      // Convert to unlinked mode
      const scaleValue =
        typeof currentScale === "number"
          ? currentScale
          : (currentScale?.x ?? 1);
      onChange({
        x: scaleValue,
        y: scaleValue,
        linked: false,
      });
    } else {
      // Convert to linked mode - use X value for both
      const scaleValue =
        typeof currentScale === "number"
          ? currentScale
          : (currentScale?.x ?? 1);
      onChange({
        x: scaleValue,
        y: scaleValue,
        linked: true,
      });
    }
  };

  return (
    <div>
      <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
        {label}
        {tooltip && <FieldTooltip content={tooltip} />}
      </label>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
            <input
              type="checkbox"
              checked={isUnlinked}
              onChange={(e) => handleUnlinkedToggle(e.target.checked)}
              className="rounded focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
              tabIndex={tabIndex}
            />
            Unlinked
          </label>
        </div>

        <div className="flex items-center gap-2">
          {isUnlinked ? (
            <>
              <div className="flex-1">
                <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                  X
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={typeof value === "object" ? (value.x ?? "") : ""}
                  onChange={(e) => {
                    const xValue =
                      e.target.value === ""
                        ? undefined
                        : parseFloat(e.target.value);
                    const currentScale = value;
                    const yValue =
                      typeof currentScale === "object" &&
                      currentScale?.y !== undefined
                        ? currentScale.y
                        : undefined;

                    if (xValue === undefined && yValue === undefined) {
                      onChange(undefined);
                    } else {
                      onChange({
                        x: xValue,
                        y: yValue,
                        linked: false,
                      });
                    }
                  }}
                  onBlur={onBlur}
                  className={getInputClassName()}
                  aria-describedby={ariaDescribedBy}
                  tabIndex={(tabIndex ?? 0) + 1}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
                  Y
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={typeof value === "object" ? (value.y ?? "") : ""}
                  onChange={(e) => {
                    const yValue =
                      e.target.value === ""
                        ? undefined
                        : parseFloat(e.target.value);
                    const currentScale = value;
                    const xValue =
                      typeof currentScale === "object" &&
                      currentScale?.x !== undefined
                        ? currentScale.x
                        : undefined;

                    if (xValue === undefined && yValue === undefined) {
                      onChange(undefined);
                    } else {
                      onChange({
                        x: xValue,
                        y: yValue,
                        linked: false,
                      });
                    }
                  }}
                  onBlur={onBlur}
                  className={getInputClassName()}
                  aria-describedby={ariaDescribedBy}
                  tabIndex={(tabIndex ?? 0) + 2}
                />
              </div>
            </>
          ) : (
            <input
              type="number"
              min={0}
              step={0.1}
              value={
                typeof value === "number"
                  ? value
                  : typeof value === "object"
                    ? (value?.x ?? "")
                    : ""
              }
              onChange={(e) => {
                const scaleValue =
                  e.target.value === ""
                    ? undefined
                    : parseFloat(e.target.value);
                if (scaleValue === undefined) {
                  onChange(undefined);
                } else {
                  onChange({
                    x: scaleValue,
                    y: scaleValue,
                    linked: true,
                  });
                }
              }}
              onBlur={onBlur}
              className={cn(getInputClassName(), "w-24")}
              aria-describedby={ariaDescribedBy}
              tabIndex={(tabIndex ?? 0) + 1}
            />
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
    </div>
  );
}
