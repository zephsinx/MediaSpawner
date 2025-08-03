import React from "react";
import type { Spawn } from "../../types/spawn";

/**
 * Props for the spawn list item component
 */
export interface SpawnListItemProps {
  /** The spawn to display */
  spawn: Spawn;
  /** Whether this spawn is currently selected */
  isSelected?: boolean;
  /** Callback when spawn is clicked */
  onClick?: (spawn: Spawn) => void;
  /** Callback when spawn toggle is clicked */
  onToggle?: (spawn: Spawn, enabled: boolean) => void;
  /** Whether the toggle is currently processing */
  isToggleProcessing?: boolean;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Individual spawn item component for the spawn list
 */
const SpawnListItem: React.FC<SpawnListItemProps> = ({
  spawn,
  isSelected = false,
  onClick,
  onToggle,
  isToggleProcessing = false,
  className = "",
}) => {
  const handleClick = () => {
    onClick?.(spawn);
  };

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!isToggleProcessing) {
      onToggle?.(spawn, !spawn.enabled);
    }
  };

  const handleToggleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle(e);
    }
  };

  return (
    <div
      className={`p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
        isSelected ? "bg-blue-50 border-blue-200" : ""
      } ${!spawn.enabled ? "opacity-60" : ""} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Spawn Name and Toggle */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-medium text-gray-900 truncate flex-1">
          {spawn.name}
        </h3>
        <div className="flex items-center ml-2">
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              spawn.enabled ? "bg-blue-600" : "bg-gray-200"
            } ${
              isToggleProcessing
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            onClick={handleToggle}
            onKeyDown={handleToggleKeyDown}
            disabled={isToggleProcessing}
            aria-label={`${spawn.enabled ? "Disable" : "Enable"} ${spawn.name}`}
            title={`${spawn.enabled ? "Disable" : "Enable"} ${spawn.name}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                spawn.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
            {isToggleProcessing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Spawn Description */}
      {spawn.description && (
        <p className="text-sm text-gray-600 truncate mb-2">
          {spawn.description}
        </p>
      )}

      {/* Spawn Stats */}
      <div className="flex items-center text-xs text-gray-500">
        <span className="mr-3">
          {spawn.assets.length} asset{spawn.assets.length !== 1 ? "s" : ""}
        </span>
        <span>{spawn.enabled ? "Active" : "Inactive"}</span>
      </div>
    </div>
  );
};

export default SpawnListItem;
