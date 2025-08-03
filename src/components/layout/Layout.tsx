import React from "react";
import ThreePanelLayout from "./ThreePanelLayout";
import {
  ConfigurationWorkspacePlaceholder,
  AssetManagementPlaceholder,
} from "./PanelPlaceholder";
import { LayoutProvider } from "./LayoutContext";
import { SpawnList } from "../spawn-list";

const Layout: React.FC = () => {
  return (
    <LayoutProvider>
      <ThreePanelLayout
        leftPanel={<SpawnList />}
        centerPanel={<ConfigurationWorkspacePlaceholder />}
        rightPanel={<AssetManagementPlaceholder />}
      />
    </LayoutProvider>
  );
};

export default Layout;
