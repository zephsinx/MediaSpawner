import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, AlertCircle } from "lucide-react";
import { AssetList, type AssetTypeFilter } from "./AssetList";
import { AssetPreview } from "./AssetPreview";
import { FileReferenceInput } from "../common/FileReferenceInput";
import { AssetService } from "../../services/assetService";
import { detectAssetTypeFromPath } from "../../utils/assetTypeDetection";
import type { MediaAsset } from "../../types/media";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card } from "../ui/Card";

const AssetLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAssetPath, setNewAssetPath] = useState("");
  const [newAssetName, setNewAssetName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    path?: string;
  }>({});

  // Load assets on component mount
  useEffect(() => {
    setAssets(AssetService.getAssets());
    const handler = () => setAssets(AssetService.getAssets());
    window.addEventListener(
      "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
      handler as EventListener
    );
    return () => {
      window.removeEventListener(
        "mediaspawner:assets-updated" as unknown as keyof WindowEventMap,
        handler as EventListener
      );
    };
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

  const validateForm = () => {
    const errors: { name?: string; path?: string } = {};

    if (!newAssetName.trim()) {
      errors.name = "Asset name is required";
    } else if (newAssetName.trim().length > 120) {
      errors.name = "Asset name must be 120 characters or fewer";
    }

    if (!newAssetPath.trim()) {
      errors.path = "File path or URL is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddAsset = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the new asset type detection utility
      const type = detectAssetTypeFromPath(newAssetPath.trim());
      const success = AssetService.addAsset(
        type,
        newAssetName.trim(),
        newAssetPath.trim()
      );

      if (success) {
        setAssets(AssetService.getAssets());
        setNewAssetPath("");
        setNewAssetName("");
        setShowAddForm(false);
        setFormErrors({});
      } else {
        setError("Failed to add asset. Please try again.");
      }
    } catch {
      setError("An error occurred while adding the asset. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAdd = () => {
    setNewAssetPath("");
    setNewAssetName("");
    setShowAddForm(false);
    setFormErrors({});
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg))] p-6">
      {/* Skip Links */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-foreground))] px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      <a
        href="#asset-list"
        className="sr-only focus:not-sr-only focus:absolute focus:top-16 focus:left-4 bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-foreground))] px-4 py-2 rounded-md z-50"
      >
        Skip to asset list
      </a>

      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[rgb(var(--color-fg))] mb-2">
              Asset Library
            </h1>
            <p className="text-[rgb(var(--color-muted-foreground))] text-lg">
              Manage your media files (images, videos, audio) here.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
              aria-label="Return to main editor"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Editor
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2"
              aria-label={
                showAddForm ? "Hide add asset form" : "Show add asset form"
              }
            >
              <Plus className="h-4 w-4" />
              {showAddForm ? "Cancel" : "Add Asset"}
            </Button>
          </div>
        </header>

        {/* Add Asset Form */}
        {showAddForm && (
          <Card
            className="mb-8"
            role="region"
            aria-labelledby="add-asset-title"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2
                  id="add-asset-title"
                  className="text-xl font-semibold text-[rgb(var(--color-fg))]"
                >
                  Add New Asset
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelAdd}
                  className="h-8 w-8 p-0"
                  aria-label="Close add asset form"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  className="mb-4 p-3 bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error-border))] rounded-md flex items-center gap-2 text-[rgb(var(--color-error))]"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle
                    className="h-4 w-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddAsset();
                }}
                aria-label="Add new asset form"
              >
                <div>
                  <label
                    htmlFor="asset-name"
                    className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-2"
                  >
                    Asset Name
                  </label>
                  <Input
                    id="asset-name"
                    type="text"
                    value={newAssetName}
                    onChange={(e) => {
                      setNewAssetName(e.target.value);
                      if (formErrors.name) {
                        setFormErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    placeholder="Enter asset name"
                    variant={formErrors.name ? "error" : "default"}
                    aria-describedby={
                      formErrors.name ? "asset-name-error" : undefined
                    }
                    aria-invalid={!!formErrors.name}
                  />
                  {formErrors.name && (
                    <p
                      id="asset-name-error"
                      className="mt-1 text-sm text-[rgb(var(--color-error))]"
                    >
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="asset-path"
                    className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-2"
                  >
                    File Path or URL
                  </label>
                  <FileReferenceInput
                    value={newAssetPath}
                    onChange={(value) => {
                      setNewAssetPath(value);
                      if (formErrors.path) {
                        setFormErrors((prev) => ({ ...prev, path: undefined }));
                      }
                    }}
                    placeholder="Enter file path or URL"
                  />
                  {formErrors.path && (
                    <p className="mt-1 text-sm text-[rgb(var(--color-error))]">
                      {formErrors.path}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={handleAddAsset}
                    disabled={
                      isLoading || !newAssetPath.trim() || !newAssetName.trim()
                    }
                    className="flex items-center gap-2"
                    aria-label="Add new asset to library"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add Asset
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelAdd}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                    aria-label="Cancel adding asset"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        {/* Asset List */}
        <main id="main-content" role="main" aria-label="Asset library content">
          <section
            id="asset-list"
            aria-label="Asset list"
            aria-live="polite"
            aria-atomic="false"
          >
            <AssetList
              assets={assets}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              onAssetDelete={handleAssetDelete}
              onAssetSelect={handleAssetPreview}
              onPreview={handleAssetPreview}
            />
          </section>
        </main>

        {/* Asset Preview Modal */}
        {previewAsset && (
          <AssetPreview
            asset={previewAsset}
            isOpen={true}
            onClose={handleClosePreview}
          />
        )}
      </div>
    </div>
  );
};

export default AssetLibraryPage;
