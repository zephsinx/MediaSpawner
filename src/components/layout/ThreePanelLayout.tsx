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
 * Targets desktop resolutions with minimum panel widths to ensure usability.
 */
const ThreePanelLayout: React.FC<ThreePanelLayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  className = "",
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <Header />

      {/* Three-Panel Layout */}
      <div className="grid grid-cols-12 h-[calc(100vh-80px)] min-w-[1280px]">
        {/* Left Panel - Spawn Navigation (25%) */}
        <div className="col-span-3 bg-white border-r border-gray-200 min-w-[320px] overflow-hidden">
          <div className="h-full">{leftPanel}</div>
        </div>

        {/* Center Panel - Configuration Workspace (50%) */}
        <div className="col-span-6 bg-white border-r border-gray-200 min-w-[640px] overflow-hidden">
          <div className="h-full">{centerPanel}</div>
        </div>

        {/* Right Panel - Asset Management (25%) */}
        <div className="col-span-3 bg-white min-w-[320px] overflow-hidden">
          <div className="h-full">{rightPanel}</div>
        </div>
      </div>
    </div>
  );
};

export default ThreePanelLayout;
