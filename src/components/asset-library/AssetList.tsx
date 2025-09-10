import { useState, useMemo } from "react";
import {
  Search,
  X,
  Grid3X3,
  List,
  FolderOpen,
  Search as SearchIcon,
} from "lucide-react";
import type { MediaAsset } from "../../types/media";
import { AssetCard } from "./AssetCard";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { TypeFilterDropdown } from "./TypeFilterDropdown";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cn } from "../../utils/cn";

export type ViewMode = "grid" | "list" | "condensed";
export type AssetTypeFilter = "all" | "image" | "video" | "audio";

export interface AssetListProps {
  assets: MediaAsset[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onAssetSelect?: (asset: MediaAsset) => void;
  onAssetDelete?: (asset: MediaAsset) => void;
  onPreview?: (asset: MediaAsset) => void;
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
  onPreview,
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

  // Optimized search query preprocessing
  const normalizedSearchQuery = useMemo(() => {
    return currentSearchQuery.toLowerCase().trim();
  }, [currentSearchQuery]);

  // Optimized filtering with useMemo to prevent recalculation on every render
  const filteredAssets = useMemo(() => {
    if (!normalizedSearchQuery && currentTypeFilter === "all") {
      return assets; // Early return for no filtering
    }

    return assets.filter((asset) => {
      const matchesSearch =
        !normalizedSearchQuery ||
        asset.name.toLowerCase().includes(normalizedSearchQuery) ||
        asset.path.toLowerCase().includes(normalizedSearchQuery);
      const matchesType =
        currentTypeFilter === "all" || asset.type === currentTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [assets, normalizedSearchQuery, currentTypeFilter]);

  // Optimized type counts with useMemo to prevent recalculation
  const typeCounts = useMemo(() => {
    const counts = {
      all: assets.length,
      image: 0,
      video: 0,
      audio: 0,
    };

    assets.forEach((asset) => {
      counts[asset.type]++;
    });

    return counts;
  }, [assets]);

  const GridView = () => (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
      role="grid"
      aria-label="Asset grid view"
      aria-rowcount={Math.ceil(filteredAssets.length / 6)}
      aria-colcount={6}
    >
      {filteredAssets.map((asset, index) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          variant="grid"
          isSelected={selectedAssets.includes(asset.id)}
          onClick={handleAssetClick}
          onPreview={onPreview}
          onDelete={onAssetDelete ? handleAssetDelete : undefined}
          aria-rowindex={Math.floor(index / 6) + 1}
          aria-colindex={(index % 6) + 1}
        />
      ))}
    </div>
  );

  const ListView = () => (
    <div className="space-y-2" role="list" aria-label="Asset list view">
      {filteredAssets.map((asset, index) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          variant="list"
          isSelected={selectedAssets.includes(asset.id)}
          onClick={handleAssetClick}
          onPreview={onPreview}
          onDelete={onAssetDelete ? handleAssetDelete : undefined}
          aria-posinset={index + 1}
          aria-setsize={filteredAssets.length}
        />
      ))}
    </div>
  );

  const CondensedView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-1" role="list" aria-label="Asset condensed view">
        {filteredAssets.map((asset, index) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            variant="condensed"
            isSelected={selectedAssets.includes(asset.id)}
            onClick={handleAssetClick}
            onPreview={onPreview}
            onDelete={onAssetDelete ? handleAssetDelete : undefined}
            aria-posinset={index + 1}
            aria-setsize={filteredAssets.length}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div
      className={`w-full ${className}`}
      role="region"
      aria-label="Asset management interface"
    >
      {/* Search and Filters */}
      <div
        className="mb-6 space-y-4"
        role="search"
        aria-label="Search and filter assets"
      >
        {/* Search Input */}
        <div className="relative">
          <label htmlFor="asset-search" className="sr-only">
            Search assets by name or path
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search
              className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]"
              aria-hidden="true"
            />
          </div>
          <Input
            id="asset-search"
            type="text"
            placeholder="Search assets by name or path..."
            value={currentSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
            aria-label="Search assets by name or path"
            aria-describedby="search-help"
          />
          {currentSearchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 h-full w-8 p-0 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div id="search-help" className="sr-only">
          Type to search through your assets by name or file path
        </div>

        {/* Type Filter Dropdown */}
        <div
          className="flex items-center space-x-4"
          role="group"
          aria-label="Asset type filters"
        >
          <TypeFilterDropdown
            currentFilter={currentTypeFilter}
            onFilterChange={handleTypeFilterChange}
            typeCounts={typeCounts}
          />
        </div>
      </div>

      {/* View Mode Toggle and Results Count */}
      <div
        className="flex justify-between items-center mb-6"
        role="toolbar"
        aria-label="Asset view controls"
      >
        <div
          className="text-sm text-[rgb(var(--color-muted-foreground))]"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium text-[rgb(var(--color-fg))]">
            {filteredAssets.length}
          </span>{" "}
          {filteredAssets.length === 1 ? "asset" : "assets"}
          {(currentSearchQuery || currentTypeFilter !== "all") && (
            <span className="text-[rgb(var(--color-muted-foreground))]">
              {" "}
              (filtered from {assets.length} total)
            </span>
          )}
        </div>
        <div
          className="flex rounded-lg border border-[rgb(var(--color-border))] overflow-hidden bg-[rgb(var(--color-bg))]"
          role="group"
          aria-label="View mode selection"
        >
          <Button
            variant={currentViewMode === "grid" ? "primary" : "ghost"}
            size="sm"
            onClick={() => handleViewModeToggle("grid")}
            className={cn(
              "rounded-none border-0 font-medium transition-all",
              currentViewMode === "grid"
                ? "bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-foreground))] shadow-sm"
                : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/10"
            )}
            aria-label="Grid view"
            aria-pressed={currentViewMode === "grid"}
            title="Switch to grid view"
          >
            <Grid3X3 className="h-4 w-4 mr-1" aria-hidden="true" />
            Grid
          </Button>
          <Button
            variant={currentViewMode === "list" ? "primary" : "ghost"}
            size="sm"
            onClick={() => handleViewModeToggle("list")}
            className={cn(
              "rounded-none border-0 border-l border-[rgb(var(--color-border))] font-medium transition-all",
              currentViewMode === "list"
                ? "bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-foreground))] shadow-sm"
                : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/10"
            )}
            aria-label="List view"
            aria-pressed={currentViewMode === "list"}
            title="Switch to list view"
          >
            <List className="h-4 w-4 mr-1" aria-hidden="true" />
            List
          </Button>
          <Button
            variant={currentViewMode === "condensed" ? "primary" : "ghost"}
            size="sm"
            onClick={() => handleViewModeToggle("condensed")}
            className={cn(
              "rounded-none border-0 border-l border-[rgb(var(--color-border))] font-medium transition-all",
              currentViewMode === "condensed"
                ? "bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-foreground))] shadow-sm"
                : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/10"
            )}
            aria-label="Condensed view"
            aria-pressed={currentViewMode === "condensed"}
            title="Switch to condensed view"
          >
            <List className="h-3 w-3 mr-1" aria-hidden="true" />
            Condensed
          </Button>
        </div>
      </div>

      {/* Asset Display */}
      {filteredAssets.length === 0 ? (
        <div
          className="text-center py-16 text-[rgb(var(--color-muted-foreground))]"
          role="status"
          aria-live="polite"
        >
          <div className="mb-6">
            {currentSearchQuery || currentTypeFilter !== "all" ? (
              <SearchIcon
                className="h-16 w-16 mx-auto text-[rgb(var(--color-muted))]/50"
                aria-hidden="true"
              />
            ) : (
              <FolderOpen
                className="h-16 w-16 mx-auto text-[rgb(var(--color-muted))]/50"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="text-xl font-medium mb-3 text-[rgb(var(--color-fg))]">
            {currentSearchQuery || currentTypeFilter !== "all"
              ? "No assets match your search"
              : "No assets found"}
          </div>
          <div className="text-sm max-w-md mx-auto">
            {currentSearchQuery || currentTypeFilter !== "all"
              ? "Try adjusting your search terms or filters to find what you're looking for"
              : "Add your first media asset to get started with MediaSpawner"}
          </div>
          {(currentSearchQuery || currentTypeFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleSearchChange("");
                handleTypeFilterChange("all");
              }}
              className="mt-6"
              aria-label="Clear all search and filter criteria"
            >
              <X className="h-4 w-4 mr-2" aria-hidden="true" />
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div role="region" aria-label={`Asset ${currentViewMode} view`}>
          {currentViewMode === "grid" ? (
            <GridView />
          ) : currentViewMode === "list" ? (
            <ListView />
          ) : (
            <CondensedView />
          )}
        </div>
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
