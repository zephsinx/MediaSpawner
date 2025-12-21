import React from "react";
import { HUICombobox } from "../../common";

interface AddAssetControlsProps {
  searchQuery: string;
  searchOptions: { value: string }[];
  isAddingUrl: boolean;
  urlInput: string;
  addError: string | null;
  filesError: string | null;
  isSubmitting: boolean;
  supportedAccept: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onSearchSelect: (value: string) => void;
  onAddFilesClick: () => void;
  onOpenUrlForm: () => void;
  onUrlChange: (value: string) => void;
  onAddUrl: () => void;
  onCancelUrl: () => void;
  onFilesSelected: React.ChangeEventHandler<HTMLInputElement>;
}

/**
 * Controls for adding assets to the library (file picker, URL input, search).
 */
export function AddAssetControls({
  searchQuery,
  searchOptions,
  isAddingUrl,
  urlInput,
  addError,
  filesError,
  isSubmitting,
  supportedAccept,
  fileInputRef,
  onSearchChange,
  onSearchSelect,
  onAddFilesClick,
  onOpenUrlForm,
  onUrlChange,
  onAddUrl,
  onCancelUrl,
  onFilesSelected,
}: AddAssetControlsProps) {
  return (
    <>
      {/* Main controls bar */}
      <div className="flex-shrink-0 px-3 py-2 lg:px-4 lg:py-3 bg-[rgb(var(--color-muted))]/5 border-b border-[rgb(var(--color-border))]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5"
              onClick={onAddFilesClick}
              aria-label="Add local assets"
            >
              Add Asset
            </button>
            {!isAddingUrl && (
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5"
                onClick={onOpenUrlForm}
                aria-label="Add URL Asset"
              >
                Add URL
              </button>
            )}
          </div>
          <div className="flex-1" />
        </div>
        <div className="mt-2">
          <HUICombobox
            value={searchQuery}
            onChange={onSearchChange}
            onSelect={onSearchSelect}
            options={searchOptions}
            placeholder="Search assets..."
          />
        </div>
        {addError && (
          <div
            className="mt-2 text-xs text-[rgb(var(--color-error))]"
            role="alert"
          >
            {addError}
          </div>
        )}
        {filesError && (
          <div
            className="mt-2 text-xs text-[rgb(var(--color-warning))]"
            role="alert"
          >
            {filesError}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={supportedAccept}
          onChange={onFilesSelected}
          className="hidden"
          aria-hidden
        />
      </div>

      {/* URL input form */}
      {isAddingUrl && (
        <div className="flex-shrink-0 px-3 lg:px-4 py-2 bg-[rgb(var(--color-muted))]/5 border-b border-[rgb(var(--color-border))]">
          <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://example.com/media.png"
              className="flex-1 min-w-0 sm:w-96 max-w-full px-2 py-1 border border-[rgb(var(--color-border))] rounded text-sm"
              aria-label="Asset URL"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`text-xs px-2 py-1 rounded text-[rgb(var(--color-accent-foreground))] ${
                  isSubmitting
                    ? "bg-[rgb(var(--color-accent))]/50 cursor-not-allowed"
                    : "bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent-hover))]"
                }`}
                onClick={onAddUrl}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-muted))]/5"
                onClick={onCancelUrl}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
