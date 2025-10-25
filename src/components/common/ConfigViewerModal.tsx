import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "../ui/Button";
import { ImportExportService } from "../../services/importExportService";
import { RefreshCw } from "lucide-react";

/**
 * Props for the ConfigViewerModal component
 */
export interface ConfigViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal for viewing the current MediaSpawnerConfig JSON that would be sent to Streamer.bot
 *
 * Displays the configuration data in a formatted, read-only JSON view.
 * This shows exactly what would be sent to the MediaSpawnerClient.cs when syncing.
 */
export function ConfigViewerModal({ isOpen, onClose }: ConfigViewerModalProps) {
  const [configData, setConfigData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load configuration data when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      loadConfigData();
    } else {
      // Reset state when modal closes
      setConfigData(null);
      setError(null);
    }
  }, [isOpen]);

  /**
   * Load configuration data from the export service
   */
  const loadConfigData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ImportExportService.exportConfiguration();

      if (result.success && result.data) {
        // Parse and pretty-print the JSON
        const config = JSON.parse(result.data);
        const formattedJson = JSON.stringify(config, null, 2);
        setConfigData(formattedJson);
      } else {
        setError(result.error || "Failed to load configuration");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle close action
   */
  const handleClose = () => {
    setConfigData(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Configuration JSON"
      description="View the complete MediaSpawner configuration that would be sent to Streamer.bot"
      size="xl"
    >
      <div className="space-y-6">
        {/* Information section */}
        <div>
          <p className="text-sm text-[rgb(var(--color-fg))] mb-2">
            This is the complete MediaSpawner configuration that would be sent
            to Streamer.bot when syncing. It includes all profiles, spawns,
            assets, and settings in the schema-compliant JSON format.
          </p>
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
            The configuration is read-only and shows the current state of your
            MediaSpawner data.
          </p>
        </div>

        {/* Content area */}
        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-[rgb(var(--color-muted-foreground))]">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading configuration...</span>
              </div>
            </div>
          )}

          {error && (
            <div
              className="p-3 bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error-border))] rounded-md"
              role="alert"
            >
              <p className="text-sm text-[rgb(var(--color-error))]">
                <strong>Error loading configuration:</strong> {error}
              </p>
            </div>
          )}

          {configData && !isLoading && !error && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-[rgb(var(--color-fg))]">
                  Configuration JSON
                </h4>
                <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
                  {configData.length.toLocaleString()} characters
                </span>
              </div>
              <div className="rounded-md border border-[rgb(var(--color-border))]">
                <pre
                  className="font-mono text-xs p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap break-words bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))]"
                  role="region"
                  aria-label="Configuration JSON"
                >
                  {configData}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-[rgb(var(--color-border))]">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfigViewerModal;
