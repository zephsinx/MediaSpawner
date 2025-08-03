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
  className = "",
}) => {
  const handleClick = () => {
    onClick?.(spawn);
  };

  return (
    <div
      className={`p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
        isSelected ? "bg-blue-50 border-blue-200" : ""
      } ${className}`}
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
      {/* Spawn Name and Status */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-medium text-gray-900 truncate flex-1">
          {spawn.name}
        </h3>
        <div className="flex items-center ml-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              spawn.enabled ? "bg-green-500" : "bg-gray-400"
            }`}
            title={spawn.enabled ? "Enabled" : "Disabled"}
          />
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
