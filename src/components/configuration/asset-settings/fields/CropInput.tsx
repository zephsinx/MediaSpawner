import { cn } from "../../../../utils/cn";
import { inputVariants } from "../../../ui/variants";
import { FieldTooltip } from "./FieldTooltip";

type CropValue =
  | {
      left?: number;
      top?: number;
      right?: number;
      bottom?: number;
    }
  | undefined;

interface CropInputProps {
  label: string;
  value: CropValue;
  onChange: (value: CropValue) => void;
  onBlur?: () => void;
  error?: string;
  tooltip?: string;
  tabIndex?: number;
  ariaDescribedBy?: string;
}

export function CropInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  tooltip,
  tabIndex,
  ariaDescribedBy,
}: CropInputProps) {
  const getInputClassName = () =>
    cn(
      inputVariants({
        variant: error ? "error" : "default",
      }),
    );

  const updateCrop = (
    field: "left" | "top" | "right" | "bottom",
    fieldValue: number | undefined,
  ) => {
    const currentCrop = value;
    const newCrop = {
      left: currentCrop?.left,
      top: currentCrop?.top,
      right: currentCrop?.right,
      bottom: currentCrop?.bottom,
      [field]: fieldValue,
    };

    if (
      newCrop.left === undefined &&
      newCrop.top === undefined &&
      newCrop.right === undefined &&
      newCrop.bottom === undefined
    ) {
      onChange(undefined);
    } else {
      onChange(newCrop);
    }
  };

  return (
    <div>
      <label className="inline-flex items-center text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
        {label}
        {tooltip && <FieldTooltip content={tooltip} />}
      </label>
      <div className="flex-1 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
            Left
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={value?.left ?? ""}
            onChange={(e) => {
              const leftValue =
                e.target.value === "" ? undefined : Number(e.target.value);
              updateCrop("left", leftValue);
            }}
            onBlur={onBlur}
            className={getInputClassName()}
            aria-describedby={ariaDescribedBy}
            tabIndex={(tabIndex ?? 0) + 1}
          />
        </div>
        <div>
          <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
            Top
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={value?.top ?? ""}
            onChange={(e) => {
              const topValue =
                e.target.value === "" ? undefined : Number(e.target.value);
              updateCrop("top", topValue);
            }}
            onBlur={onBlur}
            className={getInputClassName()}
            aria-describedby={ariaDescribedBy}
            tabIndex={(tabIndex ?? 0) + 2}
          />
        </div>
        <div>
          <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
            Right
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={value?.right ?? ""}
            onChange={(e) => {
              const rightValue =
                e.target.value === "" ? undefined : Number(e.target.value);
              updateCrop("right", rightValue);
            }}
            onBlur={onBlur}
            className={getInputClassName()}
            aria-describedby={ariaDescribedBy}
            tabIndex={(tabIndex ?? 0) + 3}
          />
        </div>
        <div>
          <label className="block text-xs text-[rgb(var(--color-muted-foreground))] mb-1">
            Bottom
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={value?.bottom ?? ""}
            onChange={(e) => {
              const bottomValue =
                e.target.value === "" ? undefined : Number(e.target.value);
              updateCrop("bottom", bottomValue);
            }}
            onBlur={onBlur}
            className={getInputClassName()}
            aria-describedby={ariaDescribedBy}
            tabIndex={(tabIndex ?? 0) + 4}
          />
        </div>
      </div>
      {error && (
        <p
          id={ariaDescribedBy}
          className="text-xs text-[rgb(var(--color-error))] mt-1 col-span-2"
        >
          {error}
        </p>
      )}
    </div>
  );
}
