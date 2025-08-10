import React from "react";

/**
 * AssetManagementPanel renders the right-panel structure for Epic 4 (MS-32):
 * two vertically-stacked sections with clear separation that adapt to height.
 * Data wiring and interactivity are intentionally deferred to later stories.
 */
const AssetManagementPanel: React.FC = () => {
  const topHeaderId = "assets-in-current-spawn-header";
  const bottomHeaderId = "asset-library-header";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top Section: Assets in Current Spawn */}
      <section
        aria-labelledby={topHeaderId}
        className="flex flex-col overflow-hidden flex-[3] min-h-[80px] border-b border-gray-200"
      >
        <div
          id={topHeaderId}
          className="px-3 py-2 lg:px-4 lg:py-3 bg-gray-50 border-b border-gray-200"
        >
          <h2 className="text-sm lg:text-base font-semibold text-gray-800">
            Assets in Current Spawn
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-3 lg:p-4">
          {/* Content intentionally empty for MS-32; populated in MS-33 */}
        </div>
      </section>

      {/* Bottom Section: Asset Library */}
      <section
        aria-labelledby={bottomHeaderId}
        className="flex flex-col overflow-hidden flex-[7] min-h-[200px]"
      >
        <div
          id={bottomHeaderId}
          className="px-3 py-2 lg:px-4 lg:py-3 bg-gray-50 border-b border-gray-200"
        >
          <h2 className="text-sm lg:text-base font-semibold text-gray-800">
            Asset Library
          </h2>
        </div>
        <div className="flex-1 overflow-auto p-3 lg:p-4">
          {/* Content intentionally empty for MS-32; populated in MS-34 */}
        </div>
      </section>
    </div>
  );
};

export default AssetManagementPanel;
