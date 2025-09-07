import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PathInput } from "./PathInput";
import { SettingsService } from "../../services/settingsService";
import { usePanelState } from "../../hooks";
import type { Settings } from "../../types/settings";
import { toast } from "sonner";

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasUnsavedChanges, setUnsavedChanges } = usePanelState();
  const [settings, setSettings] = useState<Settings>({ workingDirectory: "" });
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [isWorkingDirValid, setIsWorkingDirValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    const currentSettings = SettingsService.getSettings();
    setSettings(currentSettings);
    setWorkingDirectory(currentSettings.workingDirectory);
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    setUnsavedChanges(workingDirectory !== settings.workingDirectory);
  }, [workingDirectory, settings.workingDirectory, setUnsavedChanges]);

  const handleWorkingDirectoryChange = (value: string, isValid: boolean) => {
    setWorkingDirectory(value);
    setIsWorkingDirValid(isValid);
  };

  const handleSave = () => {
    if (!isWorkingDirValid) {
      toast.error("Cannot save: Working directory path is invalid");
      return;
    }

    setIsSaving(true);

    const result = SettingsService.updateWorkingDirectory(workingDirectory);

    if (result.success) {
      setSettings(result.settings!);
      setUnsavedChanges(false);
      toast.success("Settings saved successfully");
    } else {
      toast.error(result.error || "Failed to save settings");
    }

    setIsSaving(false);
  };

  const handleReset = () => {
    const currentSettings = SettingsService.getSettings();
    setWorkingDirectory(currentSettings.workingDirectory);
    setUnsavedChanges(false);
  };

  const handleResetToDefaults = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset all settings to defaults? This action cannot be undone."
    );

    if (confirmReset) {
      const defaultSettings = SettingsService.resetSettings();
      setSettings(defaultSettings);
      setWorkingDirectory(defaultSettings.workingDirectory);
      setUnsavedChanges(false);
      toast.success("Settings reset to defaults");
    }
  };

  const getSaveButtonText = () => {
    return isSaving ? "Saving..." : "Save Settings";
  };

  const getSaveButtonClasses = () => {
    const baseClasses =
      "px-3 py-1.5 rounded-md font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2";

    if (isSaving) {
      return `${baseClasses} bg-gray-400 text-white cursor-not-allowed`;
    }

    return hasUnsavedChanges && isWorkingDirValid
      ? `${baseClasses} bg-indigo-600 text-white hover:bg-indigo-700`
      : `${baseClasses} bg-gray-300 text-gray-500 cursor-not-allowed`;
  };

  const settingsInfo = SettingsService.getSettingsInfo();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
            <p className="text-gray-600">
              Configure application settings and manage your preferences.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            Back to Editor
          </button>
        </div>
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || !isWorkingDirValid || isSaving}
            className={getSaveButtonClasses()}
          >
            {getSaveButtonText()}
          </button>

          <button
            onClick={handleReset}
            disabled={!hasUnsavedChanges || isSaving}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
          >
            Reset
          </button>

          <button
            onClick={handleResetToDefaults}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
          >
            Reset to Defaults
          </button>
        </div>

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

        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
          <p className="text-sm text-indigo-700">
            <strong>Note:</strong> Settings are stored locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
