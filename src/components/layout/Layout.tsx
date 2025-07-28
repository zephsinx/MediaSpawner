import React from "react";
import ThreePanelLayout from "./ThreePanelLayout";
import {
  SpawnNavigationPlaceholder,
  ConfigurationWorkspacePlaceholder,
  AssetManagementPlaceholder,
} from "./PanelPlaceholder";

const Layout: React.FC = () => {
  return (
    <ThreePanelLayout
      leftPanel={<SpawnNavigationPlaceholder />}
      centerPanel={<ConfigurationWorkspacePlaceholder />}
      rightPanel={<AssetManagementPlaceholder />}
    />
  );
};

export default Layout;
