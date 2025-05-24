import { useState } from "react";
import type { MediaAsset } from "../../types/media";
import { AssetCard } from "./AssetCard";
import { ConfirmDialog } from "../common/ConfirmDialog";

export type ViewMode = "grid" | "list";
export type AssetTypeFilter = "all" | "image" | "video" | "audio";

export interface AssetListProps {
  assets: MediaAsset[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onAssetSelect?: (asset: MediaAsset) => void;
  onAssetDelete?: (asset: MediaAsset) => void;
  selectedAssets?: string[]; // Array of asset IDs
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  typeFilter?: AssetTypeFilter;
  onTypeFilterChange?: (filter: AssetTypeFilter) => void;
  className?: string;
}

export function AssetList({
  assets,
  viewMode: controlledViewMode,
  onViewModeChange,
  onAssetSelect,
  onAssetDelete,
  selectedAssets = [],
  searchQuery: controlledSearchQuery,
  onSearchChange,
  typeFilter: controlledTypeFilter,
  onTypeFilterChange,
  className = "",
}: AssetListProps) {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>("grid");
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalTypeFilter, setInternalTypeFilter] =
    useState<AssetTypeFilter>("all");

  // Use controlled or internal state
  const currentViewMode = controlledViewMode ?? internalViewMode;
  const currentSearchQuery = controlledSearchQuery ?? internalSearchQuery;
  const currentTypeFilter = controlledTypeFilter ?? internalTypeFilter;

  const handleViewModeToggle = (mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const handleSearchChange = (query: string) => {
    if (onSearchChange) {
      onSearchChange(query);
    } else {
      setInternalSearchQuery(query);
    }
  };

  const handleTypeFilterChange = (filter: AssetTypeFilter) => {
    if (onTypeFilterChange) {
      onTypeFilterChange(filter);
    } else {
      setInternalTypeFilter(filter);
    }
  };

  const handleAssetClick = (asset: MediaAsset) => {
    if (onAssetSelect) {
      onAssetSelect(asset);
    }
  };

  const handleAssetDelete = (asset: MediaAsset) => {
    setAssetToDelete(asset);
  };

  const confirmDelete = () => {
    if (assetToDelete && onAssetDelete) {
      onAssetDelete(assetToDelete);
    }
    setAssetToDelete(null);
  };

  const cancelDelete = () => {
    setAssetToDelete(null);
  };

  // Filter assets based on search query and type filter
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
      asset.path.toLowerCase().includes(currentSearchQuery.toLowerCase());
    const matchesType =
      currentTypeFilter === "all" || asset.type === currentTypeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeFilterCount = (type: AssetTypeFilter) => {
    if (type === "all") {
      return assets.length;
    }
    return assets.filter((asset) => asset.type === type).length;
  };

  const getAssetTypeIcon = (type: MediaAsset["type"]) => {
    switch (type) {
      case "image":
        return "🖼️";
      case "video":
        return "🎥";
      case "audio":
        return "🎵";
      default:
        return "📄";
    }
  };

  const GridView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {filteredAssets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          variant="grid"
          isSelected={selectedAssets.includes(asset.id)}
          onClick={handleAssetClick}
          onDelete={onAssetDelete ? handleAssetDelete : undefined}
        />
      ))}
    </div>
  );

  const ListView = () => (
    <div className="space-y-2">
      {filteredAssets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          variant="list"
          isSelected={selectedAssets.includes(asset.id)}
          onClick={handleAssetClick}
          onDelete={onAssetDelete ? handleAssetDelete : undefined}
        />
      ))}
    </div>
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Search and Filters */}
      <div className="mb-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search assets by name or path..."
            value={currentSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {currentSearchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg
                className="h-4 w-4 text-gray-400 hover:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTypeFilterChange("all")}
            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
              currentTypeFilter === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({getTypeFilterCount("all")})
          </button>
          <button
            onClick={() => handleTypeFilterChange("image")}
            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors inline-flex items-center space-x-1 ${
              currentTypeFilter === "image"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span>{getAssetTypeIcon("image")}</span>
            <span>Images ({getTypeFilterCount("image")})</span>
          </button>
          <button
            onClick={() => handleTypeFilterChange("video")}
            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors inline-flex items-center space-x-1 ${
              currentTypeFilter === "video"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span>{getAssetTypeIcon("video")}</span>
            <span>Videos ({getTypeFilterCount("video")})</span>
          </button>
          <button
            onClick={() => handleTypeFilterChange("audio")}
            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors inline-flex items-center space-x-1 ${
              currentTypeFilter === "audio"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span>{getAssetTypeIcon("audio")}</span>
            <span>Audio ({getTypeFilterCount("audio")})</span>
          </button>
        </div>
      </div>

      {/* View Mode Toggle and Results Count */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {filteredAssets.length}{" "}
          {filteredAssets.length === 1 ? "asset" : "assets"}
          {(currentSearchQuery || currentTypeFilter !== "all") && (
            <span className="text-gray-400">
              {" "}
              (filtered from {assets.length} total)
            </span>
          )}
        </div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => handleViewModeToggle("grid")}
            className={`
              px-3 py-1 text-sm font-medium transition-colors
              ${
                currentViewMode === "grid"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }
            `}
          >
            Grid
          </button>
          <button
            onClick={() => handleViewModeToggle("list")}
            className={`
              px-3 py-1 text-sm font-medium transition-colors border-l border-gray-300
              ${
                currentViewMode === "list"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }
            `}
          >
            List
          </button>
        </div>
      </div>

      {/* Asset Display */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">
            {currentSearchQuery || currentTypeFilter !== "all" ? "🔍" : "📁"}
          </div>
          <div className="text-lg font-medium mb-2">
            {currentSearchQuery || currentTypeFilter !== "all"
              ? "No assets match your search"
              : "No assets found"}
          </div>
          <div className="text-sm">
            {currentSearchQuery || currentTypeFilter !== "all"
              ? "Try adjusting your search terms or filters"
              : "Add your first media asset to get started"}
          </div>
          {(currentSearchQuery || currentTypeFilter !== "all") && (
            <button
              onClick={() => {
                handleSearchChange("");
                handleTypeFilterChange("all");
              }}
              className="mt-3 text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div>{currentViewMode === "grid" ? <GridView /> : <ListView />}</div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={assetToDelete !== null}
        title="Delete Asset"
        message={`Are you sure you want to delete "${assetToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
