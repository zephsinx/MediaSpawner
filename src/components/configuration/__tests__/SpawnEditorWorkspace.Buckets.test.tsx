import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import SpawnEditorWorkspace from "../SpawnEditorWorkspace";
import { usePanelState } from "../../../hooks/useLayout";
import { SpawnService } from "../../../services/spawnService";
import { AssetService } from "../../../services/assetService";
import { getDefaultTrigger, createSpawnAsset } from "../../../types/spawn";
import type { Spawn } from "../../../types/spawn";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { MediaAsset } from "../../../types/media";

vi.mock("../../../hooks/useLayout");
vi.mock("../../../services/spawnService");
vi.mock("../../../services/assetService");

const mockUsePanelState = vi.mocked(usePanelState);
const mockSpawnService = vi.mocked(SpawnService);
const mockAssetService = vi.mocked(AssetService);

const makeSpawn = (): Spawn => {
  const sa1 = createSpawnAsset("asset-1", 0, undefined, "sa1");
  const sa2 = createSpawnAsset("asset-2", 1, undefined, "sa2");
  return {
    id: "spawn-1",
    name: "Test Spawn",
    description: "",
    enabled: true,
    trigger: getDefaultTrigger("manual"),
    duration: 0,
    assets: [sa1, sa2],
    lastModified: Date.now(),
    order: 0,
  };
};

describe("SpawnEditorWorkspace - Randomization Buckets UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUsePanelState.mockReturnValue({
      activeProfileId: "profile-1",
      liveProfileId: undefined,
      selectedSpawnId: "spawn-1",
      selectedSpawnAssetId: undefined,
      centerPanelMode: "spawn-settings",
      setUnsavedChanges: vi.fn(),
      hasUnsavedChanges: false,
      profileSpawnSelections: {},
      setActiveProfile: vi.fn(),
      setLiveProfile: vi.fn(),
      selectSpawn: vi.fn(),
      setCenterPanelMode: vi.fn(),
      selectSpawnAsset: vi.fn(),
      clearContext: vi.fn(),
    } as ReturnType<typeof usePanelState>);

    mockSpawnService.getAllSpawns.mockResolvedValue([makeSpawn()]);
    mockAssetService.getAssetById = vi.fn(
      (id: string): MediaAsset | undefined => {
        if (id === "asset-1")
          return {
            id,
            type: "audio",
            name: "woo",
            path: "woo.mp3",
            isUrl: false,
          };
        if (id === "asset-2")
          return {
            id,
            type: "image",
            name: "woo",
            path: "woo.png",
            isUrl: false,
          };
        return undefined;
      },
    );
  });

  const renderWithProviders = (ui: React.ReactNode) =>
    render(
      <Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
        {ui}
      </Tooltip.Provider>,
    );

  it("disables Save when bucket N exceeds enabled member count", async () => {
    await act(async () => {
      renderWithProviders(<SpawnEditorWorkspace />);
    });

    // Create a bucket with Pick N and N=3
    fireEvent.click(screen.getByRole("button", { name: "Add Bucket" }));
    const modal = await screen.findByRole("dialog", { name: "Create Bucket" });
    fireEvent.change(within(modal).getByLabelText("Name"), {
      target: { value: "Audio bucket" },
    });
    fireEvent.change(within(modal).getByLabelText("Selection"), {
      target: { value: "n" },
    });
    fireEvent.change(within(modal).getByLabelText("N"), {
      target: { value: "3" },
    });
    fireEvent.click(within(modal).getByRole("button", { name: "Create" }));

    // Open Edit Members and select the two assets
    const editButtons = await screen.findAllByRole("button", {
      name: /Edit Members/i,
    });
    fireEvent.click(editButtons[0]);
    const membersModal = await screen.findByRole("dialog", {
      name: "Edit Bucket Members",
    });
    const checkboxes = within(membersModal).getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(within(membersModal).getByRole("button", { name: "Done" }));

    // Save should be disabled due to invalid N
    const saveBtn = screen.getByRole("button", { name: "Save spawn" });
    expect(saveBtn).toBeDisabled();
  });

  it("shows move confirmation when toggling a member already in another bucket", async () => {
    await act(async () => {
      renderWithProviders(<SpawnEditorWorkspace />);
    });

    // Create first bucket and add first asset
    fireEvent.click(screen.getByRole("button", { name: "Add Bucket" }));
    const modalA = await screen.findByRole("dialog", { name: "Create Bucket" });
    fireEvent.change(within(modalA).getByLabelText("Name"), {
      target: { value: "Bucket A" },
    });
    fireEvent.click(within(modalA).getByRole("button", { name: "Create" }));

    const bucketACardTitle = await screen.findByText("Bucket A");
    expect(bucketACardTitle).toBeInTheDocument();
    const firstEditBtn = screen.getAllByRole("button", {
      name: /Edit Members/i,
    })[0];
    fireEvent.click(firstEditBtn);
    const membersModalA = await screen.findByRole("dialog", {
      name: "Edit Bucket Members",
    });
    const cbsA = within(membersModalA).getAllByRole("checkbox");
    fireEvent.click(cbsA[0]);
    fireEvent.click(
      within(membersModalA).getByRole("button", { name: "Done" }),
    );

    // Create second bucket and toggle same asset -> expect move confirmation
    fireEvent.click(screen.getByRole("button", { name: "Add Bucket" }));
    const modalB = await screen.findByRole("dialog", { name: "Create Bucket" });
    fireEvent.change(within(modalB).getByLabelText("Name"), {
      target: { value: "Bucket B" },
    });
    fireEvent.click(within(modalB).getByRole("button", { name: "Create" }));

    const bucketBCardTitle = await screen.findByText("Bucket B");
    expect(bucketBCardTitle).toBeInTheDocument();
    const editBtns = screen.getAllByRole("button", { name: /Edit Members/i });
    const secondEditBtn = editBtns[editBtns.length - 1];
    fireEvent.click(secondEditBtn);
    const membersModalB = await screen.findByRole("dialog", {
      name: "Edit Bucket Members",
    });
    const cbsB = within(membersModalB).getAllByRole("checkbox");
    fireEvent.click(cbsB[0]);

    expect(
      await screen.findByText("Move asset to this bucket?"),
    ).toBeInTheDocument();
  });

  it("shows unsaved-changes guard on mode switch request when dirty", async () => {
    // Reconfigure layout state to show hasUnsavedChanges
    mockUsePanelState.mockReturnValue({
      activeProfileId: "profile-1",
      liveProfileId: undefined,
      selectedSpawnId: "spawn-1",
      selectedSpawnAssetId: undefined,
      centerPanelMode: "spawn-settings",
      setUnsavedChanges: vi.fn(),
      hasUnsavedChanges: true,
      profileSpawnSelections: {},
      setActiveProfile: vi.fn(),
      setLiveProfile: vi.fn(),
      selectSpawn: vi.fn(),
      setCenterPanelMode: vi.fn(),
      selectSpawnAsset: vi.fn(),
      clearContext: vi.fn(),
    } as ReturnType<typeof usePanelState>);
    mockSpawnService.getAllSpawns.mockResolvedValue([makeSpawn()]);

    await act(async () => {
      render(<SpawnEditorWorkspace />);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent(
          "mediaspawner:request-center-switch" as unknown as keyof WindowEventMap,
          {
            detail: { mode: "asset-settings", spawnAssetId: "sa1" },
          } as CustomEventInit,
        ),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
    });
  });
});
