import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import { inputVariants } from "./variants";

// Base props shared across all input element types
interface BaseControlProps extends VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

// Discriminated union for element-specific props
type InputControlProps =
  | ({ as?: "input" } & React.InputHTMLAttributes<HTMLInputElement>)
  | ({ as: "select" } & React.SelectHTMLAttributes<HTMLSelectElement>)
  | ({ as: "textarea" } & React.TextareaHTMLAttributes<HTMLTextAreaElement>);

// Combined props interface
export type InputProps = BaseControlProps &
  InputControlProps & {
    // Backward compatibility: allow 'type' prop to map to 'as' internally
    type?:
      | React.InputHTMLAttributes<HTMLInputElement>["type"]
      | "select"
      | "textarea";
  };

const Input = React.forwardRef<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  InputProps
>(
  (
    {
      className,
      variant,
      type,
      as,
      label,
      error,
      helperText,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    // Map 'type' prop to 'as' prop for backward compatibility
    const elementType =
      as ||
      (type === "select"
        ? "select"
        : type === "textarea"
        ? "textarea"
        : "input");

    // Determine the actual variant based on error state
    const actualVariant = error ? "error" : variant;

    const renderInput = () => {
      if (elementType === "select") {
        return (
          <select
            className={cn(inputVariants({ variant: actualVariant, className }))}
            ref={ref as React.Ref<HTMLSelectElement>}
            id={inputId}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>
        );
      } else if (elementType === "textarea") {
        return (
          <textarea
            className={cn(inputVariants({ variant: actualVariant, className }))}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        );
      } else {
        return (
          <input
            type={type as React.InputHTMLAttributes<HTMLInputElement>["type"]}
            className={cn(inputVariants({ variant: actualVariant, className }))}
            ref={ref as React.Ref<HTMLInputElement>}
            id={inputId}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        );
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-1"
          >
            {label}
          </label>
        )}
        {renderInput()}
        {error && (
          <p
            id={errorId}
            className="mt-1 text-sm text-[rgb(var(--color-error))]"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={helperId}
            className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
