import { Button } from "../../ui/Button";
import { CheckCircle, AlertCircle } from "lucide-react";

interface AssetSettingsHeaderProps {
  assetName: string;
  assetType: string;
  hasUnsavedChanges: boolean;
  hasValidationErrors: boolean;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  onClose: () => void;
  onSave: () => void;
}

export function AssetSettingsHeader({
  assetName,
  assetType,
  hasUnsavedChanges,
  hasValidationErrors,
  isSaving,
  error,
  success,
  onClose,
  onSave,
}: AssetSettingsHeaderProps) {
  return (
    <div className="p-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-fg))]">
              Asset Settings
            </h2>
            {hasUnsavedChanges && (
              <span className="text-[rgb(var(--color-warning))] text-sm font-medium">
                • Unsaved changes
              </span>
            )}
          </div>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            {assetName} · {assetType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            aria-label="Close asset settings"
          >
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={hasValidationErrors}
            loading={isSaving}
            aria-label="Save asset settings"
          >
            Save
          </Button>
        </div>
      </div>
      {error && (
        <div
          className="mt-3 p-3 bg-[rgb(var(--color-error-bg))] border border-[rgb(var(--color-error-border))] text-sm text-[rgb(var(--color-error))] rounded flex items-center gap-2"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          className="mt-3 p-3 bg-[rgb(var(--color-success-bg))] border border-[rgb(var(--color-success-border))] text-sm text-[rgb(var(--color-success))] rounded flex items-center gap-2"
          role="status"
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
