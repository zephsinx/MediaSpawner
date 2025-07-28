import React from "react";

/**
 * Props for panel placeholder components
 */
export interface PanelPlaceholderProps {
  /** Title to display in the placeholder */
  title: string;
  /** Description of what this panel will contain */
  description: string;
  /** Optional icon to display */
  icon?: string;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Placeholder component for panel areas during development
 */
const PanelPlaceholder: React.FC<PanelPlaceholderProps> = ({
  title,
  description,
  icon = "🔧",
  className = "",
}) => {
  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </div>

      {/* Panel Content Placeholder */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-20">{icon}</div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">
            {title} Coming Soon
          </h3>
          <p className="text-gray-500 max-w-md">
            This panel will contain {description.toLowerCase()}. The
            functionality is currently under development.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Left panel placeholder for spawn navigation
 */
export const SpawnNavigationPlaceholder: React.FC = () => (
  <PanelPlaceholder
    title="Spawn List"
    description="spawn navigation and management"
    icon="📋"
  />
);

/**
 * Center panel placeholder for unified configuration workspace
 */
export const ConfigurationWorkspacePlaceholder: React.FC = () => (
  <PanelPlaceholder
    title="Unified Configuration Workspace"
    description="spawn configuration and settings management"
    icon="⚙️"
  />
);

/**
 * Right panel placeholder for dynamic asset management
 */
export const AssetManagementPlaceholder: React.FC = () => (
  <PanelPlaceholder
    title="Dynamic Asset Management"
    description="asset library and management tools"
    icon="📁"
  />
);

export default PanelPlaceholder;
