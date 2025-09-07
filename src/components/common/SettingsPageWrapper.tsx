import React from "react";
import { LayoutProvider } from "../layout";
import SettingsPage from "./SettingsPage";

const SettingsPageWrapper: React.FC = () => {
  return (
    <LayoutProvider>
      <SettingsPage />
    </LayoutProvider>
  );
};

export default SettingsPageWrapper;
