import React from "react";
import { Button } from "../ui/Button";
import type { Spawn } from "../../types/spawn";

interface SpawnSettingsHeaderProps {
  selectedSpawn: Spawn | null;
  hasUnsavedChanges: boolean;
  isTesting: boolean;
  isSaving: boolean;
  isSaveDisabled: boolean;
  isCancelDisabled: boolean;
  onTest: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export const SpawnSettingsHeader: React.FC<SpawnSettingsHeaderProps> = ({
  selectedSpawn,
  hasUnsavedChanges,
  isTesting,
  isSaving,
  isSaveDisabled,
  isCancelDisabled,
  onTest,
  onDelete,
  onCancel,
  onSave,
}) => {
  return (
    <div className="p-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/5">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-[rgb(var(--color-fg))]">
          Spawn Editor
        </h2>
        {hasUnsavedChanges && (
          <span className="text-[rgb(var(--color-warning))] text-sm font-medium">
            • Unsaved changes
          </span>
        )}
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-1">
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
          {selectedSpawn
            ? `Editing: ${selectedSpawn.name}`
            : "Loading spawn..."}
        </p>
        <div className="flex items-center gap-2">
          {selectedSpawn && (
            <>
              <Button
                type="button"
                onClick={onTest}
                variant="outline"
                size="sm"
                disabled={isTesting}
                loading={isTesting}
                aria-label="Test spawn"
              >
                Test
              </Button>
              <Button
                type="button"
                onClick={onDelete}
                variant="destructive"
                size="sm"
                aria-label="Delete spawn"
              >
                Delete
              </Button>
            </>
          )}
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            size="sm"
            disabled={isCancelDisabled}
            aria-label="Cancel edits"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaveDisabled}
            variant="primary"
            size="sm"
            loading={isSaving}
            aria-label="Save spawn"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};
