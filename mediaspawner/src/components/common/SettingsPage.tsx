import React, { useState, useEffect } from "react";
import { PathInput } from "./PathInput";
import { SettingsService } from "../../services/settingsService";
import type { Settings } from "../../types/settings";

// Constants
const SUCCESS_MESSAGE_TIMEOUT_MS = 3000;

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({ workingDirectory: "" });
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [isWorkingDirValid, setIsWorkingDirValid] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Load settings on component mount
  useEffect(() => {
    const currentSettings = SettingsService.getSettings();
    setSettings(currentSettings);
    setWorkingDirectory(currentSettings.workingDirectory);
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(workingDirectory !== settings.workingDirectory);
    setSaveStatus("idle");
  }, [workingDirectory, settings.workingDirectory]);

  const handleWorkingDirectoryChange = (value: string, isValid: boolean) => {
    setWorkingDirectory(value);
    setIsWorkingDirValid(isValid);
    setErrorMessage("");
  };

  const handleSave = () => {
    if (!isWorkingDirValid) {
      setErrorMessage("Cannot save: Working directory path is invalid");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");

    const result = SettingsService.updateWorkingDirectory(workingDirectory);

    if (result.success) {
      setSettings(result.settings!);
      setSaveStatus("saved");
      setErrorMessage("");

      // Clear "saved" status after 3 seconds
      setTimeout(() => {
        setSaveStatus("idle");
      }, SUCCESS_MESSAGE_TIMEOUT_MS);
    } else {
      setErrorMessage(result.error || "Failed to save settings");
      setSaveStatus("error");
    }
  };

  const handleReset = () => {
    const currentSettings = SettingsService.getSettings();
    setWorkingDirectory(currentSettings.workingDirectory);
    setErrorMessage("");
    setSaveStatus("idle");
  };

  const handleResetToDefaults = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset all settings to defaults? This action cannot be undone."
    );

    if (confirmReset) {
      const defaultSettings = SettingsService.resetSettings();
      setSettings(defaultSettings);
      setWorkingDirectory(defaultSettings.workingDirectory);
      setErrorMessage("");
      setSaveStatus("idle");
    }
  };

  const getSaveButtonText = () => {
    switch (saveStatus) {
      case "saving":
        return "Saving...";
      case "saved":
        return "Saved ✓";
      case "error":
        return "Save";
      default:
        return "Save Settings";
    }
  };

  const getSaveButtonClasses = () => {
    const baseClasses =
      "px-4 py-2 rounded-md font-medium transition-colors duration-200";

    switch (saveStatus) {
      case "saving":
        return `${baseClasses} bg-gray-400 text-white cursor-not-allowed`;
      case "saved":
        return `${baseClasses} bg-green-500 text-white cursor-default`;
      case "error":
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600`;
      default:
        return hasUnsavedChanges && isWorkingDirValid
          ? `${baseClasses} bg-blue-500 text-white hover:bg-blue-600`
          : `${baseClasses} bg-gray-300 text-gray-500 cursor-not-allowed`;
    }
  };

  const settingsInfo = SettingsService.getSettingsInfo();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
        <p className="text-gray-600">
          Configure application settings and manage your preferences.
        </p>
      </div>

      {/* Settings Form */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Working Directory
        </h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            Base directory for your local media files. Required for Streamer.bot
            to access local assets. Leave empty if not using local files.
          </p>

          <PathInput
            value={workingDirectory}
            onChange={handleWorkingDirectoryChange}
            label="Working Directory Path"
            placeholder="e.g., C:\StreamAssets or /home/user/stream-assets"
            showBrowseButton={false}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={
              !hasUnsavedChanges ||
              !isWorkingDirValid ||
              saveStatus === "saving"
            }
            className={getSaveButtonClasses()}
          >
            {getSaveButtonText()}
          </button>

          <button
            onClick={handleReset}
            disabled={!hasUnsavedChanges || saveStatus === "saving"}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Reset
          </button>

          <button
            onClick={handleResetToDefaults}
            disabled={saveStatus === "saving"}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Reset to Defaults
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              You have unsaved changes. Click "Save Settings" to apply them.
            </p>
          </div>
        )}
      </div>

      {/* Settings Information */}
      <div className="bg-gray-50 border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">
          Settings Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Storage:</span>
            <span className="ml-2 text-gray-600">Browser localStorage</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Settings Status:</span>
            <span className="ml-2 text-gray-600">
              {settingsInfo.hasStoredSettings
                ? "Custom settings saved"
                : "Using defaults"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">
              Working Directory:
            </span>
            <span className="ml-2 text-gray-600">
              {settingsInfo.workingDirectorySet ? "Configured" : "Not set"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Current Path:</span>
            <span className="ml-2 text-gray-600 font-mono text-xs">
              {settings.workingDirectory || "(none)"}
            </span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Settings are stored locally in your browser.
            They will not be available on other devices or if you clear your
            browser data. Use the import/export features (coming soon) to backup
            your settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
