import { useState, useRef } from "react";
import type { ChangeEvent } from "react";
import { validateFileReference } from "../../utils/fileValidation";
import type { MediaType } from "../../utils/fileValidation";

export interface FileReferenceInputProps {
  value: string;
  onChange: (value: string, mediaType?: MediaType) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function FileReferenceInput({
  value,
  onChange,
  placeholder = "Enter file path or URL...",
  disabled = false,
  className = "",
}: FileReferenceInputProps) {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    error?: string;
    mediaType?: MediaType;
  }>({ isValid: true });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;

    // Validate the input
    const validation = validateFileReference(newValue);
    setValidationState({
      isValid: validation.isValid,
      error: validation.error,
      mediaType: validation.mediaType,
    });

    // Call onChange with the formatted path if valid
    onChange(validation.formattedPath || newValue, validation.mediaType);
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a local file path reference
      const filePath = file.name;
      const validation = validateFileReference(filePath);

      setValidationState({
        isValid: validation.isValid,
        error: validation.error,
        mediaType: validation.mediaType,
      });

      onChange(filePath, validation.mediaType);
    }

    // Reset the file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const inputClasses = `
    flex-1 px-3 py-2 border rounded-md
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    ${validationState.isValid ? "border-gray-300" : "border-red-500 bg-red-50"}
    ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
    ${className}
  `.trim();

  const buttonClasses = `
    px-4 py-2 ml-2 bg-gray-100 border border-gray-300 rounded-md
    hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500
    ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
  `.trim();

  return (
    <div className="w-full">
      <div className="flex items-center">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />
        <button
          type="button"
          onClick={handleBrowseClick}
          disabled={disabled}
          className={buttonClasses}
        >
          Browse
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a"
        />
      </div>

      {!validationState.isValid && validationState.error && (
        <div className="mt-1 text-sm text-red-600">{validationState.error}</div>
      )}

      {validationState.isValid && validationState.mediaType && value && (
        <div className="mt-1 text-sm text-green-600">
          {validationState.mediaType.charAt(0).toUpperCase() +
            validationState.mediaType.slice(1)}{" "}
          file detected
        </div>
      )}
    </div>
  );
}
