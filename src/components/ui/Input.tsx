import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import { inputVariants } from "./variants";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, variant, type, label, error, helperText, id, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    // Determine the actual variant based on error state
    const actualVariant = error ? "error" : variant;

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
        <input
          type={type}
          className={cn(inputVariants({ variant: actualVariant, className }))}
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        />
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
