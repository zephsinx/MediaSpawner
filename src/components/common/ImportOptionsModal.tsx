import React, { useState } from "react";
import { Modal } from "./Modal";
import type { ImportOptions } from "../../services/importExportService";

/**
 * Props for the ImportOptionsModal component
 */
export interface ImportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ImportOptions) => void;
  defaultOptions?: ImportOptions;
}

/**
 * Modal for configuring import options before importing configuration
 *
 * Allows users to set conflict resolution strategies and other import settings
 * before proceeding with the import operation.
 */
export function ImportOptionsModal({
  isOpen,
  onClose,
  onConfirm,
  defaultOptions,
}: ImportOptionsModalProps) {
  const [options, setOptions] = useState<ImportOptions>(
    defaultOptions || {
      profileConflictStrategy: "rename",
      assetConflictStrategy: "rename",
      updateWorkingDirectory: true,
      validateAssetReferences: true,
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate options
    const newErrors: Record<string, string> = {};

    if (!options.profileConflictStrategy) {
      newErrors.profileConflictStrategy =
        "Please select a profile conflict strategy";
    }

    if (!options.assetConflictStrategy) {
      newErrors.assetConflictStrategy =
        "Please select an asset conflict strategy";
    }

    setErrors(newErrors);

    // If no errors, proceed with import
    if (Object.keys(newErrors).length === 0) {
      onConfirm(options);
    }
  };

  /**
   * Handle option changes
   */
  const handleOptionChange = (
    key: keyof ImportOptions,
    value: ImportOptions[keyof ImportOptions]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));

    // Clear error for this field
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Import Options"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6" role="form">
        {/* Profile Conflict Strategy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Conflict Strategy
          </label>
          <p className="text-xs text-gray-500 mb-3">
            How to handle profiles that already exist with the same ID
          </p>
          <div className="space-y-2">
            {[
              {
                value: "skip",
                label: "Skip",
                description: "Keep existing profile, ignore imported one",
              },
              {
                value: "overwrite",
                label: "Overwrite",
                description: "Replace existing profile with imported one",
              },
              {
                value: "rename",
                label: "Rename",
                description: "Create new profile with different ID",
              },
            ].map((option) => (
              <label key={option.value} className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="profileConflictStrategy"
                  value={option.value}
                  checked={options.profileConflictStrategy === option.value}
                  onChange={(e) =>
                    handleOptionChange(
                      "profileConflictStrategy",
                      e.target.value as "skip" | "overwrite" | "rename"
                    )
                  }
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.profileConflictStrategy && (
            <p className="mt-1 text-xs text-red-600">
              {errors.profileConflictStrategy}
            </p>
          )}
        </div>

        {/* Asset Conflict Strategy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Conflict Strategy
          </label>
          <p className="text-xs text-gray-500 mb-3">
            How to handle assets that already exist with the same ID
          </p>
          <div className="space-y-2">
            {[
              {
                value: "skip",
                label: "Skip",
                description: "Keep existing asset, ignore imported one",
              },
              {
                value: "overwrite",
                label: "Overwrite",
                description: "Replace existing asset with imported one",
              },
              {
                value: "rename",
                label: "Rename",
                description: "Create new asset with different ID",
              },
            ].map((option) => (
              <label key={option.value} className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="assetConflictStrategy"
                  value={option.value}
                  checked={options.assetConflictStrategy === option.value}
                  onChange={(e) =>
                    handleOptionChange(
                      "assetConflictStrategy",
                      e.target.value as "skip" | "overwrite" | "rename"
                    )
                  }
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.assetConflictStrategy && (
            <p className="mt-1 text-xs text-red-600">
              {errors.assetConflictStrategy}
            </p>
          )}
        </div>

        {/* Additional Options */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">
            Additional Options
          </h4>

          {/* Update Working Directory */}
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={options.updateWorkingDirectory}
              onChange={(e) =>
                handleOptionChange("updateWorkingDirectory", e.target.checked)
              }
              className="mt-1 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                Update Working Directory
              </div>
              <div className="text-xs text-gray-500">
                Update the working directory setting from the imported
                configuration
              </div>
            </div>
          </label>

          {/* Validate Asset References */}
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={options.validateAssetReferences}
              onChange={(e) =>
                handleOptionChange("validateAssetReferences", e.target.checked)
              }
              className="mt-1 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                Validate Asset References
              </div>
              <div className="text-xs text-gray-500">
                Check that all asset references in profiles point to valid
                assets
              </div>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Import Configuration
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ImportOptionsModal;
