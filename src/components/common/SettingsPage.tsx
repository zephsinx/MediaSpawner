import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PathInput } from "./PathInput";
import { ImportExportSection } from "./ImportExportSection";
import { SettingsService } from "../../services/settingsService";
import { usePanelState } from "../../hooks";
import type { Settings } from "../../types/settings";
import { toast } from "sonner";
import { SyncStatusIndicator, SyncActionsDropdown } from "./";
import { StreamerbotService } from "../../services/streamerbotService";
import type { SyncStatusInfo } from "../../types/sync";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasUnsavedChanges, setUnsavedChanges } = usePanelState();
  const [settings, setSettings] = useState<Settings>({
    workingDirectory: "",
    themeMode: "light",
  });
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [isWorkingDirValid, setIsWorkingDirValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    status: "unknown",
  });

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

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = StreamerbotService.subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

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

  const settingsInfo = SettingsService.getSettingsInfo();

  return (
    <div className="p-6 max-w-4xl mx-auto bg-[rgb(var(--color-bg))]">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold text-[rgb(var(--color-fg))] mb-2">
              Settings
            </h1>
            <p className="text-[rgb(var(--color-muted-foreground))]">
              Configure application settings and manage your preferences.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Sync Status and Actions */}
            <div className="flex items-center space-x-3">
              <SyncStatusIndicator statusInfo={syncStatus} size="sm" />
              <SyncActionsDropdown
                syncStatus={syncStatus}
                onSyncStatusChange={setSyncStatus}
              />
            </div>
            <Button onClick={() => navigate("/")} variant="outline">
              Back to Editor
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Working Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-[rgb(var(--color-muted-foreground))] mb-4">
              Base directory for your local media files. Required for
              Streamer.bot to access local assets. Leave empty if not using
              local files.
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
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || !isWorkingDirValid || isSaving}
              loading={isSaving}
              variant="primary"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>

            <Button
              onClick={handleReset}
              disabled={!hasUnsavedChanges || isSaving}
              variant="outline"
            >
              Reset
            </Button>

            <Button
              onClick={handleResetToDefaults}
              disabled={isSaving}
              variant="destructive"
            >
              Reset to Defaults
            </Button>
          </div>

          {/* Unsaved Changes Warning */}
          {hasUnsavedChanges && (
            <div className="mt-4 p-3 bg-[rgb(var(--color-warning))]/10 border border-[rgb(var(--color-warning))]/20 rounded-md">
              <p className="text-sm text-[rgb(var(--color-warning))]">
                You have unsaved changes. Click "Save Settings" to apply them.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import/Export Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import/Export Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))] mb-4">
            Export your MediaSpawner configuration to a JSON file for backup or
            sharing, or import a configuration from a JSON file.
          </p>
          <ImportExportSection />
        </CardContent>
      </Card>

      {/* Settings Information */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-[rgb(var(--color-fg))]">
                Storage:
              </span>
              <span className="ml-2 text-[rgb(var(--color-muted-foreground))]">
                Browser localStorage
              </span>
            </div>
            <div>
              <span className="font-medium text-[rgb(var(--color-fg))]">
                Settings Status:
              </span>
              <span className="ml-2 text-[rgb(var(--color-muted-foreground))]">
                {settingsInfo.hasStoredSettings
                  ? "Custom settings saved"
                  : "Using defaults"}
              </span>
            </div>
            <div>
              <span className="font-medium text-[rgb(var(--color-fg))]">
                Working Directory:
              </span>
              <span className="ml-2 text-[rgb(var(--color-muted-foreground))]">
                {settingsInfo.workingDirectorySet ? "Configured" : "Not set"}
              </span>
            </div>
            <div>
              <span className="font-medium text-[rgb(var(--color-fg))]">
                Current Path:
              </span>
              <span className="ml-2 text-[rgb(var(--color-muted-foreground))] font-mono text-xs">
                {settings.workingDirectory || "(none)"}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-[rgb(var(--color-accent))]/10 border border-[rgb(var(--color-accent))]/20 rounded-md">
            <p className="text-sm text-[rgb(var(--color-accent))]">
              <strong>Note:</strong> Settings are stored locally in your
              browser.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
