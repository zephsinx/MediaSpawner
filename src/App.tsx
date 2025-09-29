import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
const Layout = lazy(() => import("./components/layout/Layout"));
const AssetLibraryPage = lazy(
  () => import("./components/asset-library/AssetLibraryPage")
);
const SettingsPageWrapper = lazy(
  () => import("./components/common/SettingsPageWrapper")
);
import { useAppInitialization } from "./hooks";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";

function App() {
  const { isInitializing, error } = useAppInitialization();

  if (isInitializing) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "16px",
          color: "#666",
        }}
      >
        Initializing MediaSpawner...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "16px",
          color: "#d32f2f",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <div>
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            Initialization Error
          </div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={100}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<div>Loading…</div>}>
          <Routes>
            <Route path="/" element={<Layout />} />
            <Route path="/assets" element={<AssetLibraryPage />} />
            <Route path="/settings" element={<SettingsPageWrapper />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster richColors position="bottom-center" closeButton={true} />
    </Tooltip.Provider>
  );
}

export default App;
