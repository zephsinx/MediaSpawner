import React, { useState, useEffect } from "react";
import type { Configuration } from "../../types/media";
import { ConfigurationService } from "../../services/configurationService";
import { usePanelState } from "../../hooks";

export interface ConfigurationFormProps {
  configuration?: Configuration;
  onSave: (config: Configuration) => void;
  onCancel: () => void;
}

export function ConfigurationForm({
  configuration,
  onSave,
  onCancel,
}: ConfigurationFormProps) {
  const { setUnsavedChanges } = usePanelState();
  const [name, setName] = useState(configuration?.name || "");
  const [description, setDescription] = useState(
    configuration?.description || ""
  );
  const [nameError, setNameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!configuration;

  // Validate name in real-time
  useEffect(() => {
    if (!name.trim()) {
      setNameError("Configuration name is required");
      return;
    }

    // Check for name uniqueness
    const isTaken = ConfigurationService.isNameTaken(
      name.trim(),
      configuration?.id
    );

    if (isTaken) {
      setNameError("A configuration with this name already exists");
      return;
    }

    setNameError("");
  }, [name, configuration?.id]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = isEditMode
      ? name !== (configuration?.name || "") ||
        description !== (configuration?.description || "")
      : name.trim() !== "" || description.trim() !== "";

    setUnsavedChanges(hasChanges);
  }, [name, description, configuration, isEditMode, setUnsavedChanges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || nameError) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && configuration) {
        // Update existing configuration
        const updatedConfig: Configuration = {
          ...configuration,
          name: name.trim(),
          description: description.trim() || undefined,
        };

        const success = ConfigurationService.updateConfiguration(updatedConfig);
        if (success) {
          setUnsavedChanges(false);
          onSave(updatedConfig);
        } else {
          console.error("Failed to update configuration");
        }
      } else {
        // Create new configuration
        const newConfig = ConfigurationService.createConfiguration(
          name.trim(),
          description.trim() || undefined
        );

        if (newConfig) {
          setUnsavedChanges(false);
          onSave(newConfig);
        } else {
          console.error("Failed to create configuration");
        }
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = name.trim() && !nameError;

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">
        {isEditMode ? "Edit Configuration" : "Create New Configuration"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Configuration Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter configuration name"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
              nameError
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
            disabled={isSubmitting}
          />
          {nameError && (
            <p className="text-red-600 text-sm mt-1">{nameError}</p>
          )}
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? "Saving..."
              : isEditMode
              ? "Update Configuration"
              : "Create Configuration"}
          </button>
          <button
            type="button"
            onClick={() => {
              setUnsavedChanges(false);
              onCancel();
            }}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
