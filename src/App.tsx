import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
const Layout = lazy(() => import("./components/layout/Layout"));
const AssetLibraryPage = lazy(
  () => import("./components/asset-library/AssetLibraryPage"),
);
const SettingsPageWrapper = lazy(
  () => import("./components/common/SettingsPageWrapper"),
);
const OAuthCallback = lazy(() =>
  import("./components/common/OAuthCallback").then((module) => ({
    default: module.OAuthCallback,
  })),
);
import { useAppInitialization } from "./hooks";

function App() {
  const { error } = useAppInitialization();

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-base text-[rgb(var(--color-error))] text-center p-5 bg-[rgb(var(--color-bg))]">
        <div>
          <div className="mb-2.5 font-bold">Initialization Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-screen bg-[rgb(var(--color-bg))] text-[rgb(var(--color-muted-foreground))]">
            Loading…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Layout />} />
          <Route path="/assets" element={<AssetLibraryPage />} />
          <Route path="/settings" element={<SettingsPageWrapper />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
