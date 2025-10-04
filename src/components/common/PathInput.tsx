import { useState, useEffect, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import { SettingsService } from "../../services/settingsService";
import type { WorkingDirectoryValidationResult } from "../../types/settings";
import { inputVariants } from "../ui/variants";
import { cn } from "../../utils/cn";

// Constants for timing
const VALIDATION_DEBOUNCE_MS = 300;

export interface PathInputProps {
  value: string;
  onChange: (value: string, isValid: boolean, normalizedPath?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  showBrowseButton?: boolean;
}

export function PathInput({
  value,
  onChange,
  placeholder = "Enter working directory path...",
  disabled = false,
  className = "",
  label,
  showBrowseButton = true,
}: PathInputProps) {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    error?: string;
    normalizedPath?: string;
  }>({ isValid: true });

  const [isDirty, setIsDirty] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const debouncedValidation = useCallback(
    (pathValue: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        const validation: WorkingDirectoryValidationResult =
          SettingsService.validateWorkingDirectory(pathValue);

        setValidationState({
          isValid: validation.isValid,
          error: validation.error,
          normalizedPath: validation.normalizedPath,
        });

        if (isDirty) {
          onChange(pathValue, validation.isValid, validation.normalizedPath);
        }
      }, VALIDATION_DEBOUNCE_MS);
    },
    [onChange, isDirty]
  );

  // Sync currentValue when prop value changes
  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  // Validate path whenever currentValue changes (with debouncing)
  useEffect(() => {
    debouncedValidation(currentValue);
  }, [currentValue, debouncedValidation]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setCurrentValue(newValue);
    setIsDirty(true);

    // Remove immediate onChange call to prevent circular dependency
    // Let debounced validation handle the onChange call
    debouncedValidation(newValue);
  };

  const getValidationMessage = () => {
    if (!isDirty || !currentValue) {
      return null;
    }

    if (!validationState.isValid && validationState.error) {
      return (
        <div className="mt-1 text-sm text-[rgb(var(--color-error))]">
          {validationState.error}
        </div>
      );
    }

    if (
      validationState.isValid &&
      currentValue &&
      validationState.normalizedPath
    ) {
      return (
        <div className="mt-1 text-sm text-[rgb(var(--color-success))]">
          ✓ Valid path
          {validationState.normalizedPath !== currentValue
            ? ` (normalized: ${validationState.normalizedPath})`
            : ""}
        </div>
      );
    }

    return null;
  };

  const getInputVariant = () => {
    if (disabled) return "disabled";
    if (!isDirty || !currentValue) return "default";
    if (!validationState.isValid) return "error";
    return "default";
  };

  const inputClasses = cn(
    inputVariants({ variant: getInputVariant() }),
    // Add success state styling for valid paths
    !disabled &&
      isDirty &&
      currentValue &&
      validationState.isValid &&
      "border-[rgb(var(--color-success))] bg-[rgb(var(--color-success))]/10",
    className
  );

  const buttonClasses = cn(
    "px-4 py-2 ml-2 bg-[rgb(var(--color-muted))] border border-[rgb(var(--color-border))] rounded-md",
    "cursor-not-allowed opacity-50 text-[rgb(var(--color-muted-foreground))]",
    "transition-colors duration-200"
  );

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
          {label}
        </label>
      )}

      <div className="flex items-center">
        <input
          type="text"
          value={currentValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />

        {showBrowseButton && (
          <button
            type="button"
            disabled={true}
            className={buttonClasses}
            title="Directory browsing is not available in web browsers. Please type the full path manually."
          >
            Browse
          </button>
        )}
      </div>

      {getValidationMessage()}

      {!currentValue && isDirty && (
        <div className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
          Leave empty to not set a working directory
        </div>
      )}
    </div>
  );
}
