import React from "react";
import { LayoutProvider } from "../layout";
import SettingsPage from "./SettingsPage";
import * as Tooltip from "@radix-ui/react-tooltip";

const SettingsPageWrapper: React.FC = () => {
  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={100}>
      <LayoutProvider>
        <SettingsPage />
      </LayoutProvider>
    </Tooltip.Provider>
  );
};

export default SettingsPageWrapper;
