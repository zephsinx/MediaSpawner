import React from "react";
import ThreePanelLayout from "./ThreePanelLayout";
import {
  SpawnNavigationPlaceholder,
  ConfigurationWorkspacePlaceholder,
  AssetManagementPlaceholder,
} from "./PanelPlaceholder";
import { LayoutProvider } from "./LayoutContext";

const Layout: React.FC = () => {
  return (
    <LayoutProvider>
      <ThreePanelLayout
        leftPanel={<SpawnNavigationPlaceholder />}
        centerPanel={<ConfigurationWorkspacePlaceholder />}
        rightPanel={<AssetManagementPlaceholder />}
      />
    </LayoutProvider>
  );
};

export default Layout;
