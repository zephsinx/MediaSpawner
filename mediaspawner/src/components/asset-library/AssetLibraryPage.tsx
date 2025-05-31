import React, { useState, useEffect } from "react";
import { AssetList, type AssetTypeFilter } from "./AssetList";
import { AssetPreview } from "./AssetPreview";
import { FileReferenceInput } from "../common/FileReferenceInput";
import {
  AssetService,
  type AssetValidationResult,
  type CleanupResult,
} from "../../services/assetService";
import { detectAssetTypeFromPath } from "../../utils/assetTypeDetection";
import type { MediaAsset } from "../../types/media";

const AssetLibraryPage: React.FC = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [newAssetPath, setNewAssetPath] = useState("");
  const [newAssetName, setNewAssetName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>("all");
  const [validationResults, setValidationResults] = useState<
    AssetValidationResult[]
  >([]);
  const [isValidating, setIsValidating] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(
    null
  );

  // Load assets on component mount
  useEffect(() => {
    setAssets(AssetService.getAssets());
  }, []);

  const handleAssetDelete = (asset: MediaAsset) => {
    const success = AssetService.deleteAsset(asset.id);
    if (success) {
      setAssets(AssetService.getAssets());
    }
  };

  const handleAssetPreview = (asset: MediaAsset) => {
    setPreviewAsset(asset);
  };

  const handleClosePreview = () => {
    setPreviewAsset(null);
  };

  const handleAddAsset = () => {
    if (!newAssetPath.trim() || !newAssetName.trim()) {
      return;
    }

    // Use the new asset type detection utility
    const type = detectAssetTypeFromPath(newAssetPath.trim());

    AssetService.addAsset(type, newAssetName.trim(), newAssetPath.trim());
    setAssets(AssetService.getAssets());
    setNewAssetPath("");
    setNewAssetName("");
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setNewAssetPath("");
    setNewAssetName("");
    setShowAddForm(false);
  };

  const handleValidateAssets = async () => {
    setIsValidating(true);
    try {
      const results = await AssetService.validateAllAssets();
      setValidationResults(results);
    } catch (error) {
      console.error("Failed to validate assets:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCleanupBroken = async () => {
    try {
      const result = await AssetService.cleanupBrokenReferences();
      setCleanupResult(result);
      setAssets(AssetService.getAssets());
      setValidationResults([]);
    } catch (error) {
      console.error("Failed to cleanup broken references:", error);
    }
  };

  const handleRepairData = () => {
    const result = AssetService.repairAssetData();
    if (result.repaired) {
      setAssets(result.validAssets);
      setCleanupResult({
        removedAssets: [],
        remainingAssets: result.validAssets,
        totalRemoved: result.removedEntries,
      });
    }
  };

  const brokenAssets = validationResults.filter((result) => !result.isValid);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Asset Library
          </h1>
          <p className="text-gray-600">
            Manage your media files (images, videos, audio) here.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMaintenance(!showMaintenance)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Maintenance
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Add Asset
          </button>
        </div>
      </div>

      {/* Maintenance Section */}
      {showMaintenance && (
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-4">Asset Maintenance</h3>

          <div className="space-y-4">
            {/* Validation Section */}
            <div className="border-b pb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">
                  Validate Asset References
                </h4>
                <button
                  onClick={handleValidateAssets}
                  disabled={isValidating}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                >
                  {isValidating ? "Validating..." : "Validate All"}
                </button>
              </div>

              {validationResults.length > 0 && (
                <div className="text-sm">
                  <div className="mb-2">
                    <span className="text-green-600">
                      ✓ Valid:{" "}
                      {validationResults.filter((r) => r.isValid).length}
                    </span>
                    {brokenAssets.length > 0 && (
                      <span className="text-red-600 ml-4">
                        ✗ Broken: {brokenAssets.length}
                      </span>
                    )}
                  </div>

                  {brokenAssets.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                      <h5 className="font-medium text-red-800 mb-2">
                        Broken References:
                      </h5>
                      <ul className="space-y-1">
                        {brokenAssets.map((result) => (
                          <li
                            key={result.asset.id}
                            className="text-red-700 text-xs"
                          >
                            <span className="font-medium">
                              {result.asset.name}
                            </span>
                            : {result.error}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={handleCleanupBroken}
                        className="mt-3 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                      >
                        Remove Broken References
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Data Repair Section */}
            <div className="border-b pb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Data Integrity</h4>
                <button
                  onClick={handleRepairData}
                  className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors"
                >
                  Repair Data
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Check and repair corrupted asset data in storage.
              </p>
            </div>

            {/* Cleanup Results */}
            {cleanupResult && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <h5 className="font-medium text-green-800 mb-2">
                  Cleanup Complete
                </h5>
                <div className="text-sm text-green-700">
                  <div>Removed: {cleanupResult.totalRemoved} assets</div>
                  <div>
                    Remaining: {cleanupResult.remainingAssets.length} assets
                  </div>
                </div>
                <button
                  onClick={() => setCleanupResult(null)}
                  className="mt-2 text-xs text-green-600 hover:text-green-800"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Asset Form */}
      {showAddForm && (
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-4">Add New Asset</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asset Name
              </label>
              <input
                type="text"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="Enter asset name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Path or URL
              </label>
              <FileReferenceInput
                value={newAssetPath}
                onChange={setNewAssetPath}
                placeholder="Enter file path or URL"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleAddAsset}
                disabled={!newAssetPath.trim() || !newAssetName.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 transition-colors"
              >
                Add Asset
              </button>
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset List */}
      <AssetList
        assets={assets}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onAssetDelete={handleAssetDelete}
        onAssetSelect={handleAssetPreview}
      />

      {/* Asset Preview Modal */}
      {previewAsset && (
        <AssetPreview
          asset={previewAsset}
          isOpen={true}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
};

export default AssetLibraryPage;
