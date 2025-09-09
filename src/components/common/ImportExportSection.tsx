import React, { useState, useRef } from "react";
import { Download, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { ImportOptionsModal } from "./ImportOptionsModal";
import { ImportExportService } from "../../services/importExportService";
import { downloadConfiguration } from "../../utils/fileDownload";
import type { ImportOptions } from "../../services/importExportService";

/**
 * Props for the ImportExportSection component
 */
export interface ImportExportSectionProps {
  className?: string;
}

/**
 * Import/Export section component for the Settings page
 *
 * Provides UI for exporting MediaSpawner configuration as JSON files
 * and importing configuration from JSON files.
 */
export function ImportExportSection({
  className = "",
}: ImportExportSectionProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Read file content as text
   */
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsText(file);
    });
  };

  /**
   * Handle export button click
   * Exports current configuration to a JSON file
   */
  const handleExport = async () => {
    setIsExporting(true);
    setImportError(null);

    try {
      // Call the export service
      const result = await ImportExportService.exportConfiguration();

      if (result.success && result.data) {
        // Download the configuration file
        await downloadConfiguration(
          JSON.parse(result.data),
          "mediaspawner-config"
        );

        // Show success message with metadata
        const metadata = result.metadata;
        const message = metadata
          ? `Configuration exported successfully! (${metadata.profileCount} profiles, ${metadata.assetCount} assets, ${metadata.spawnCount} spawns)`
          : "Configuration exported successfully!";

        toast.success(message);
      } else {
        throw new Error(result.error || "Export failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Export failed";
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle import button click
   * Opens file selection dialog
   */
  const handleImport = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  /**
   * Handle file selection for import
   * Validates file and shows import options modal
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".json")) {
      setImportError("Please select a JSON file");
      toast.error("Invalid file type. Please select a JSON file.");
      return;
    }

    // Store selected file and show import options modal
    setSelectedFile(file);
    setImportError(null);
    setShowImportModal(true);
  };

  /**
   * Handle import confirmation with options
   * Reads the selected file and imports the configuration
   */
  const handleImportConfirm = async (options: ImportOptions) => {
    if (!selectedFile) return;

    setIsImporting(true);
    setShowImportModal(false);
    setImportError(null);

    try {
      // Read the file content
      const fileContent = await readFileAsText(selectedFile);

      // Call the import service
      const result = await ImportExportService.importConfiguration(
        fileContent,
        options
      );

      if (result.success) {
        // Show success message with metadata
        const message = result.metadata
          ? `Configuration imported successfully! (${result.metadata.profileCount} profiles, ${result.metadata.assetCount} assets)`
          : "Configuration imported successfully!";

        toast.success(message);

        // Dispatch event to refresh the UI
        window.dispatchEvent(
          new CustomEvent("mediaspawner:configuration-imported")
        );
      } else {
        throw new Error(result.error || "Import failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Import failed";
      setImportError(errorMessage);
      toast.error(`Import failed: ${errorMessage}`);
    } finally {
      setIsImporting(false);
      setSelectedFile(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /**
   * Handle import modal close
   */
  const handleImportModalClose = () => {
    setShowImportModal(false);
    setSelectedFile(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`bg-white border rounded-lg p-6 mb-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Import/Export Configuration
      </h2>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-4">
          Export your MediaSpawner configuration as a JSON file for backup or
          sharing, or import a previously exported configuration file.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          disabled={isExporting || isImporting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="Export configuration as JSON file"
        >
          <Download className="w-4 h-4" />
          {isExporting ? "Exporting..." : "Export Configuration"}
        </button>

        <button
          onClick={handleImport}
          disabled={isExporting || isImporting}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="Import configuration from JSON file"
        >
          <Upload className="w-4 h-4" />
          {isImporting ? "Importing..." : "Import Configuration"}
        </button>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Error display */}
      {importError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            <strong>Import Error:</strong> {importError}
          </p>
        </div>
      )}

      {/* Information section */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Configuration Files</p>
            <p>
              Exported files contain all your spawn profiles, assets, and
              settings. Import files must be valid JSON format exported from
              MediaSpawner.
            </p>
          </div>
        </div>
      </div>

      {/* Import Options Modal */}
      <ImportOptionsModal
        isOpen={showImportModal}
        onClose={handleImportModalClose}
        onConfirm={handleImportConfirm}
      />
    </div>
  );
}

export default ImportExportSection;
