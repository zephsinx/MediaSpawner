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
      <div className="flex justify-center items-center h-screen text-base bg-[rgb(var(--color-bg))] text-[rgb(var(--color-muted-foreground))]">
        Initializing MediaSpawner...
      </div>
    );
  }

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
    <Tooltip.Provider delayDuration={300} skipDelayDuration={100}>
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
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster richColors position="bottom-center" closeButton={true} />
    </Tooltip.Provider>
  );
}

export default App;
