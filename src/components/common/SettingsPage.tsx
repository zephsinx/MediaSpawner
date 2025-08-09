import React, { useState, useEffect, useRef } from "react";
import { PathInput } from "./PathInput";
import { SettingsService } from "../../services/settingsService";
import { ImportExportService } from "../../services/ImportExportService";
import { usePanelState } from "../../hooks";
import type { Settings } from "../../types/settings";

// Constants
const SUCCESS_MESSAGE_TIMEOUT_MS = 3000;

const SettingsPage: React.FC = () => {
  const { hasUnsavedChanges, setUnsavedChanges } = usePanelState();
  const [settings, setSettings] = useState<Settings>({ workingDirectory: "" });
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [isWorkingDirValid, setIsWorkingDirValid] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Import/Export state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load settings on component mount
  useEffect(() => {
    const currentSettings = SettingsService.getSettings();
    setSettings(currentSettings);
    setWorkingDirectory(currentSettings.workingDirectory);
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    setUnsavedChanges(workingDirectory !== settings.workingDirectory);
    setSaveStatus("idle");
  }, [workingDirectory, settings.workingDirectory, setUnsavedChanges]);

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
      setUnsavedChanges(false);
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
    setUnsavedChanges(false);
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
      setUnsavedChanges(false);
      setErrorMessage("");
      setSaveStatus("idle");
    }
  };

  // Import/Export handlers
  const handleExport = async () => {
    setIsExporting(true);
    setImportStatus("idle");
    setImportMessage("");

    try {
      ImportExportService.downloadExport();
      setImportStatus("success");
      setImportMessage("Export completed successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => {
        setImportStatus("idle");
        setImportMessage("");
      }, SUCCESS_MESSAGE_TIMEOUT_MS);
    } catch (error) {
      setImportStatus("error");
      setImportMessage(
        error instanceof Error ? error.message : "Failed to export data"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus("idle");
    setImportMessage("");

    try {
      // Parse the file
      const parseResult = await ImportExportService.parseImportFile(file);
      if (!parseResult.success) {
        setImportStatus("error");
        setImportMessage(parseResult.error || "Failed to parse import file");
        return;
      }

      // Show confirmation dialog
      const confirmImport = window.confirm(
        "This will replace ALL current data (configurations, assets, and settings). This action cannot be undone. Are you sure you want to continue?"
      );

      if (!confirmImport) {
        setImportMessage("Import cancelled by user");
        return;
      }

      // Perform import
      const importResult = await ImportExportService.importData(
        parseResult.data!
      );
      if (importResult.success) {
        setImportStatus("success");
        const { configurationsCount, assetsCount } = importResult.importedData!;
        setImportMessage(
          `Import completed! ${configurationsCount} configurations, ${assetsCount} assets, and settings imported successfully.`
        );

        // Reload current settings to reflect imported data
        const newSettings = SettingsService.getSettings();
        setSettings(newSettings);
        setWorkingDirectory(newSettings.workingDirectory);

        // Clear success message after 5 seconds (longer for import success)
        setTimeout(() => {
          setImportStatus("idle");
          setImportMessage("");
        }, 5000);
      } else {
        setImportStatus("error");
        setImportMessage(importResult.error || "Failed to import data");
      }
    } catch (error) {
      setImportStatus("error");
      setImportMessage(
        error instanceof Error
          ? error.message
          : "Unexpected error during import"
      );
    } finally {
      setIsImporting(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
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

      {/* Import/Export Section */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Import/Export
        </h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            Backup and restore your configurations, assets, and settings. Import
            will replace all current data.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Section */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Export Data</h3>
              <p className="text-sm text-gray-600 mb-3">
                Download all your configurations, assets, and settings as a JSON
                file.
              </p>
              <button
                onClick={handleExport}
                disabled={isExporting || isImporting}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isExporting ? "Exporting..." : "📥 Export Data"}
              </button>
            </div>

            {/* Import Section */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">Import Data</h3>
              <p className="text-sm text-gray-600 mb-3">
                Upload a previously exported JSON file to restore your data.
              </p>
              <button
                onClick={handleImportClick}
                disabled={isImporting || isExporting}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isImporting ? "Importing..." : "📤 Import Data"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Import/Export Status Messages */}
        {importMessage && (
          <div
            className={`mt-4 p-3 border rounded-md ${
              importStatus === "success"
                ? "bg-green-50 border-green-200"
                : importStatus === "error"
                ? "bg-red-50 border-red-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <p
              className={`text-sm ${
                importStatus === "success"
                  ? "text-green-700"
                  : importStatus === "error"
                  ? "text-red-600"
                  : "text-blue-700"
              }`}
            >
              {importMessage}
            </p>
          </div>
        )}

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-700">
            <strong>Warning:</strong> Import will replace ALL current data
            including configurations, assets, and settings. Make sure to export
            your current data first if you want to keep it.
          </p>
        </div>
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
            Use the import/export features above to backup your settings and
            transfer them between devices.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
