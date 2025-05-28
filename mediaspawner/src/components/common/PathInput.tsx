import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { SettingsService } from "../../services/settingsService";
import type { WorkingDirectoryValidationResult } from "../../types/settings";

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

  // Validate path whenever value changes
  useEffect(() => {
    const validation: WorkingDirectoryValidationResult =
      SettingsService.validateWorkingDirectory(value);

    setValidationState({
      isValid: validation.isValid,
      error: validation.error,
      normalizedPath: validation.normalizedPath,
    });

    // Call onChange with validation results
    onChange(value, validation.isValid, validation.normalizedPath);
  }, [value, onChange]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setIsDirty(true);
    onChange(newValue, false); // Will be updated by useEffect
  };

  const handleBrowseClick = () => {
    // Note: We can't actually browse directories in a web browser
    // This button could be used for future desktop app integration
    // For now, we'll show a helpful message
    alert(
      "Directory browsing is not available in web browsers. Please type the full path manually."
    );
  };

  const getValidationMessage = () => {
    if (!isDirty || !value) {
      return null;
    }

    if (!validationState.isValid && validationState.error) {
      return (
        <div className="mt-1 text-sm text-red-600">{validationState.error}</div>
      );
    }

    if (validationState.isValid && value && validationState.normalizedPath) {
      return (
        <div className="mt-1 text-sm text-green-600">
          ✓ Valid path
          {validationState.normalizedPath !== value
            ? ` (normalized: ${validationState.normalizedPath})`
            : ""}
        </div>
      );
    }

    return null;
  };

  const inputClasses = `
    w-full px-3 py-2 border rounded-md
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    transition-colors duration-200
    ${
      !isDirty || !value
        ? "border-gray-300"
        : validationState.isValid
        ? "border-green-500 bg-green-50"
        : "border-red-500 bg-red-50"
    }
    ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
    ${className}
  `.trim();

  const buttonClasses = `
    px-4 py-2 ml-2 bg-gray-100 border border-gray-300 rounded-md
    hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500
    transition-colors duration-200
    ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
  `.trim();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="flex items-center">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />

        {showBrowseButton && (
          <button
            type="button"
            onClick={handleBrowseClick}
            disabled={disabled}
            className={buttonClasses}
            title="Directory browsing not available in web browsers"
          >
            Browse
          </button>
        )}
      </div>

      {getValidationMessage()}

      {!value && isDirty && (
        <div className="mt-1 text-sm text-gray-500">
          Leave empty to not set a working directory
        </div>
      )}
    </div>
  );
}
