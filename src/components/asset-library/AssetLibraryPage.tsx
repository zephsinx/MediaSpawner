import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AssetList, type AssetTypeFilter } from "./AssetList";
import { AssetPreview } from "./AssetPreview";
import { FileReferenceInput } from "../common/FileReferenceInput";
import { AssetService } from "../../services/assetService";
import { detectAssetTypeFromPath } from "../../utils/assetTypeDetection";
import type { MediaAsset } from "../../types/media";

const AssetLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssetPath, setNewAssetPath] = useState("");
  const [newAssetName, setNewAssetName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>("all");

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
    if (asset.isUrl) {
      setPreviewAsset(asset);
    }
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
            onClick={() => navigate("/")}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            Back to Editor
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Add Asset
          </button>
        </div>
      </div>

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
