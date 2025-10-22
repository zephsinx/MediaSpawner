import React, { Suspense, lazy, useState } from "react";
import ThreePanelLayout from "./ThreePanelLayout";
import { LayoutProvider } from "./LayoutContext";
import { usePanelState } from "../../hooks/useLayout";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";
import { ConfirmDialog } from "../common/ConfirmDialog";

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
  const {
    selectedSpawnId,
    selectSpawn,
    hasUnsavedChanges,
    changeType,
    setUnsavedChanges,
  } = usePanelState();

  const [pendingSpawnId, setPendingSpawnId] = useState<string | null>(null);
  const [showSpawnSwitchDialog, setShowSpawnSwitchDialog] = useState(false);

  const getDialogContent = () => {
    switch (changeType) {
      case "spawn":
        return {
          title: "Unsaved Spawn Changes",
          message:
            "You have unsaved spawn changes. Switching will discard them. Continue?",
        };
      case "asset":
        return {
          title: "Unsaved Asset Settings",
          message:
            "You have unsaved asset changes. Switching will discard them. Continue?",
        };
      default:
        return {
          title: "Unsaved Changes",
          message:
            "You have unsaved changes. Switching will discard them. Continue?",
        };
    }
  };

  const handleSpawnClick = (spawnId: string) => {
    if (hasUnsavedChanges && changeType !== "none") {
      setPendingSpawnId(spawnId);
      setShowSpawnSwitchDialog(true);
    } else {
      selectSpawn(spawnId);
    }
  };

  return (
    <>
      <ConfirmDialog
        isOpen={showSpawnSwitchDialog}
        title={getDialogContent().title}
        message={getDialogContent().message}
        confirmText="Switch"
        cancelText="Stay"
        variant="warning"
        onConfirm={() => {
          if (pendingSpawnId) {
            setUnsavedChanges(false, "none");
            selectSpawn(pendingSpawnId);
          }
          setShowSpawnSwitchDialog(false);
          setPendingSpawnId(null);
        }}
        onCancel={() => {
          setShowSpawnSwitchDialog(false);
          setPendingSpawnId(null);
        }}
      />
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
              onSpawnClick={(spawn) => handleSpawnClick(spawn.id)}
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
    </>
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
