import React, { Suspense, lazy } from "react";
import ThreePanelLayout from "./ThreePanelLayout";
import { LayoutProvider } from "./LayoutContext";
import { usePanelState } from "../../hooks/useLayout";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";

// Lazy load heavy components
const SpawnList = lazy(() =>
  import("../spawn-list").then((module) => ({ default: module.SpawnList })),
);
const SpawnEditorWorkspace = lazy(() =>
  import("../configuration").then((module) => ({
    default: module.SpawnEditorWorkspace,
  })),
);
const AssetManagementPanel = lazy(
  () => import("../asset-management/AssetManagementPanel"),
);

const LayoutContent: React.FC = () => {
  const { selectedSpawnId, selectSpawn } = usePanelState();

  return (
    <ThreePanelLayout
      leftPanel={
        <Suspense
          fallback={
            <div className="p-4 text-center text-[rgb(var(--color-muted-foreground))]">
              Loading spawns...
            </div>
          }
        >
          <SpawnList
            selectedSpawnId={selectedSpawnId}
            onSpawnClick={(spawn) => selectSpawn(spawn.id)}
          />
        </Suspense>
      }
      centerPanel={
        <Suspense
          fallback={
            <div className="p-4 text-center text-[rgb(var(--color-muted-foreground))]">
              Loading editor...
            </div>
          }
        >
          <SpawnEditorWorkspace />
        </Suspense>
      }
      rightPanel={
        <Suspense
          fallback={
            <div className="p-4 text-center text-[rgb(var(--color-muted-foreground))]">
              Loading assets...
            </div>
          }
        >
          <AssetManagementPanel />
        </Suspense>
      }
    />
  );
};

const Layout: React.FC = () => {
  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={100}>
      <LayoutProvider>
        <LayoutContent />
      </LayoutProvider>
      <Toaster richColors position="bottom-center" closeButton={true} />
    </Tooltip.Provider>
  );
};

export default Layout;
