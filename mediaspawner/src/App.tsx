import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './components/dashboard/DashboardPage';
import AssetLibraryPage from './components/asset-library/AssetLibraryPage';
import ConfigEditorPage from './components/config-editor/ConfigEditorPage';
import SettingsPage from './components/common/SettingsPage';

function App() {
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
