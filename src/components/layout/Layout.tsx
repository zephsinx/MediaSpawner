import React from "react";
import ThreePanelLayout from "./ThreePanelLayout";
import { AssetManagementPlaceholder } from "./PanelPlaceholder";
import { LayoutProvider } from "./LayoutContext";
import { SpawnList } from "../spawn-list";
import { usePanelState } from "../../hooks/useLayout";
import { SpawnEditorWorkspace } from "../configuration";

const LayoutContent: React.FC = () => {
  const { selectedSpawnId, selectSpawn } = usePanelState();

  return (
    <ThreePanelLayout
      leftPanel={
        <SpawnList
          selectedSpawnId={selectedSpawnId}
          onSpawnClick={(spawn) => selectSpawn(spawn.id)}
        />
      }
      centerPanel={<SpawnEditorWorkspace />}
      rightPanel={<AssetManagementPlaceholder />}
    />
  );
};

const Layout: React.FC = () => {
  return (
    <LayoutProvider>
      <LayoutContent />
    </LayoutProvider>
  );
};

export default Layout;
