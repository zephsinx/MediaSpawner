import React from "react";
import Header from "./Header";
import { useSkipNavigation } from "../../hooks/useFocusManagement";

/**
 * Props for the three-panel layout component
 */
export interface ThreePanelLayoutProps {
  /** Content for the left panel (spawn navigation) */
  leftPanel: React.ReactNode;
  /** Content for the center panel (configuration workspace) */
  centerPanel: React.ReactNode;
  /** Content for the right panel (asset management) */
  rightPanel: React.ReactNode;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Three-panel layout component with header and 25%/50%/25% width distribution
 *
 * Uses CSS Grid for precise panel control and responsive design.
 * Optimized for desktop resolutions (1280px-ultrawide) with proper scaling.
 */
const ThreePanelLayout: React.FC<ThreePanelLayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  className = "",
}) => {
  const { skipToElement } = useSkipNavigation();

  const handleSkipToMain = () => {
    skipToElement("main-content");
  };

  const handleSkipToSpawnList = () => {
    skipToElement("spawn-list");
  };

  const handleSkipToAssetManagement = () => {
    skipToElement("asset-management");
  };

  return (
    <div
      className={`h-screen flex flex-col bg-[rgb(var(--color-bg))] ${className}`}
    >
      {/* Skip Navigation Links */}
      <div className="sr-only focus-within:not-sr-only">
        <div className="absolute top-0 left-0 z-50 bg-[rgb(var(--color-surface-1))] border border-[rgb(var(--color-border))] rounded-b-md shadow-lg p-2 space-y-1">
          <button
            onClick={handleSkipToMain}
            className="block w-full px-3 py-2 text-sm text-[rgb(var(--color-fg))] bg-[rgb(var(--color-surface-1))] hover:bg-[rgb(var(--color-surface-2))] border border-[rgb(var(--color-border))] rounded focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-ring))] focus:ring-offset-2"
          >
            Skip to main content
          </button>
          <button
            onClick={handleSkipToSpawnList}
            className="block w-full px-3 py-2 text-sm text-[rgb(var(--color-fg))] bg-[rgb(var(--color-surface-1))] hover:bg-[rgb(var(--color-surface-2))] border border-[rgb(var(--color-border))] rounded focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-ring))] focus:ring-offset-2"
          >
            Skip to spawn list
          </button>
          <button
            onClick={handleSkipToAssetManagement}
            className="block w-full px-3 py-2 text-sm text-[rgb(var(--color-fg))] bg-[rgb(var(--color-surface-1))] hover:bg-[rgb(var(--color-surface-2))] border border-[rgb(var(--color-border))] rounded focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-ring))] focus:ring-offset-2"
          >
            Skip to asset management
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex-shrink-0">
        <Header />
      </div>

      {/* Three-Panel Layout Container with ultrawide constraints */}
      <div className="flex-1 w-full max-w-[2560px] mx-auto min-h-0">
        <div className="grid grid-cols-12 h-full min-w-[1280px] px-0 lg:px-2 xl:px-4 2xl:px-6">
          {/* Left Panel - Spawn Navigation (25%) */}
          <div
            id="spawn-list"
            className="col-span-3 bg-[rgb(var(--color-surface-1))] border-r border-[rgb(var(--color-border))] min-w-[320px] lg:min-w-[360px] xl:min-w-[400px] overflow-hidden"
            tabIndex={-1}
          >
            <div className="h-full min-h-0 overflow-y-auto p-3 lg:p-4 xl:p-5">
              {leftPanel}
            </div>
          </div>

          {/* Center Panel - Configuration Workspace (50%) */}
          <div
            id="main-content"
            className="col-span-6 bg-[rgb(var(--color-surface-1))] border-r border-[rgb(var(--color-border))] min-w-[640px] lg:min-w-[720px] xl:min-w-[800px] overflow-hidden"
            tabIndex={-1}
          >
            <div className="h-full min-h-0 overflow-y-auto p-3 lg:p-4 xl:p-5">
              {centerPanel}
            </div>
          </div>

          {/* Right Panel - Asset Management (25%) */}
          <div
            id="asset-management"
            className="col-span-3 bg-[rgb(var(--color-surface-1))] min-w-[320px] lg:min-w-[360px] xl:min-w-[400px] overflow-hidden"
            tabIndex={-1}
          >
            <div className="h-full min-h-0 overflow-y-auto p-3 lg:p-4 xl:p-5">
              {rightPanel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreePanelLayout;
