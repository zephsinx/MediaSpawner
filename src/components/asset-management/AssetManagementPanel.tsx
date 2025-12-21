import { useEffect, useState } from "react";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { SpawnAssetsCount, AssetLibraryCount } from "./shared";
import { SpawnAssetsSection } from "./SpawnAssetsSection";
import { AssetLibrarySection } from "./AssetLibrarySection";

/**
 * AssetManagementPanel renders the right-panel structure for Epic 4 (MS-32):
 * two vertically-stacked sections with clear separation that adapt to height.
 */
const AssetManagementPanel: React.FC = () => {
  const bottomHeaderId = "asset-library-header";

  const [spawnOpen, setSpawnOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("ms_disclosure_spawn_assets");
      return v ? v === "1" : true;
    } catch {
      return true;
    }
  });
  const [libraryOpen, setLibraryOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("ms_disclosure_asset_library");
      return v ? v === "1" : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ms_disclosure_spawn_assets", spawnOpen ? "1" : "0");
    } catch (e) {
      void e;
    }
  }, [spawnOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "ms_disclosure_asset_library",
        libraryOpen ? "1" : "0",
      );
    } catch (e) {
      void e;
    }
  }, [libraryOpen]);

  return (
    <div className="h-full flex flex-col">
      <Disclosure as="section" defaultOpen={spawnOpen}>
        {({ open }) => (
          <div className="flex-shrink-0 flex flex-col overflow-hidden border-b border-[rgb(var(--color-border))]">
            <DisclosureButton
              onClick={() => setSpawnOpen(!open)}
              className="flex items-center justify-between w-full px-3 py-2 lg:px-4 lg:py-3 bg-[rgb(var(--color-muted))]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))]"
              aria-label="Toggle Assets in Current Spawn"
            >
              <div className="text-sm lg:text-base font-semibold text-[rgb(var(--color-fg))] flex items-center">
                <span>Assets in Current Spawn</span>
                <SpawnAssetsCount />
              </div>
              <span
                className="text-[rgb(var(--color-muted-foreground))]"
                aria-hidden
              >
                {open ? "−" : "+"}
              </span>
            </DisclosureButton>
            <DisclosurePanel unmount={false} className="min-h-[80px]">
              <div className="min-h-0">
                <SpawnAssetsSection />
              </div>
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>

      <Disclosure as="section" defaultOpen={libraryOpen}>
        {({ open }) => (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <DisclosureButton
              onClick={() => setLibraryOpen(!open)}
              className="flex items-center justify-between w-full px-3 py-2 lg:px-4 lg:py-3 bg-[rgb(var(--color-muted))]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))]"
              aria-label="Toggle Asset Library"
            >
              <div className="text-sm lg:text-base font-semibold text-[rgb(var(--color-fg))] flex items-center">
                <span id={bottomHeaderId}>Asset Library</span>
                <AssetLibraryCount />
              </div>
              <span
                className="text-[rgb(var(--color-muted-foreground))]"
                aria-hidden
              >
                {open ? "−" : "+"}
              </span>
            </DisclosureButton>
            <DisclosurePanel className="flex-1 min-h-0">
              <div className="h-full">
                <AssetLibrarySection />
              </div>
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>
    </div>
  );
};

export default AssetManagementPanel;
