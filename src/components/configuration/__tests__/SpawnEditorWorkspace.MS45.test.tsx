import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import SpawnEditorWorkspace from "../SpawnEditorWorkspace";
import { LayoutProvider } from "../../layout/LayoutContext";

vi.mock("../../../hooks/useLayout", () => ({
  usePanelState: () => ({
    selectedSpawnId: "sp1",
    selectedSpawnAssetId: "sa1",
    centerPanelMode: "asset-settings",
    setUnsavedChanges: vi.fn(),
    selectSpawn: vi.fn(),
    setCenterPanelMode: vi.fn(),
    selectSpawnAsset: vi.fn(),
  }),
}));

describe("SpawnEditorWorkspace MS-45 mode routing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders AssetSettingsForm when in asset-settings mode", async () => {
    await act(async () => {
      render(
        <LayoutProvider>
          <SpawnEditorWorkspace />
        </LayoutProvider>,
      );
    });
    expect(screen.getByText("Asset Settings")).toBeInTheDocument();
  });
});
