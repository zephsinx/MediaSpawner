import React from "react";
import Header from "./Header";

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
  return (
    <div className={`min-h-screen bg-[rgb(var(--color-bg))] ${className}`}>
      {/* Header */}
      <Header />

      {/* Three-Panel Layout Container with ultrawide constraints */}
      <div className="w-full max-w-[2560px] mx-auto">
        <div className="grid grid-cols-12 h-[calc(100vh-80px)] min-w-[1280px] px-0 lg:px-2 xl:px-4 2xl:px-6">
          {/* Left Panel - Spawn Navigation (25%) */}
          <div className="col-span-3 bg-[rgb(var(--color-surface-1))] border-r border-[rgb(var(--color-border))] min-w-[320px] lg:min-w-[360px] xl:min-w-[400px] overflow-hidden">
            <div className="h-full min-h-0 overflow-y-auto p-3 lg:p-4 xl:p-5">
              {leftPanel}
            </div>
          </div>

          {/* Center Panel - Configuration Workspace (50%) */}
          <div className="col-span-6 bg-[rgb(var(--color-surface-1))] border-r border-[rgb(var(--color-border))] min-w-[640px] lg:min-w-[720px] xl:min-w-[800px] overflow-hidden">
            <div className="h-full min-h-0 overflow-y-auto p-3 lg:p-4 xl:p-5">
              {centerPanel}
            </div>
          </div>

          {/* Right Panel - Asset Management (25%) */}
          <div className="col-span-3 bg-[rgb(var(--color-surface-1))] min-w-[320px] lg:min-w-[360px] xl:min-w-[400px] overflow-hidden">
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
