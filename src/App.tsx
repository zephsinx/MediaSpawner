import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import DashboardPage from "./components/dashboard/DashboardPage";
import AssetLibraryPage from "./components/asset-library/AssetLibraryPage";
import ConfigEditorPage from "./components/config-editor/ConfigEditorPage";
import SettingsPage from "./components/common/SettingsPage";
import { useAppInitialization } from "./hooks";

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="assets" element={<AssetLibraryPage />} />
          <Route path="config" element={<ConfigEditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
