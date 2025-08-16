import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AssetSettingsForm from "../AssetSettingsForm";
import { SpawnService } from "../../../../services/spawnService";
import { AssetService } from "../../../../services/assetService";
import type { MediaAsset, MediaAssetProperties } from "../../../../types/media";
import type { Spawn, SpawnAsset } from "../../../../types/spawn";

vi.mock("../../../../hooks/useLayout", () => ({
  usePanelState: () => ({ setUnsavedChanges: vi.fn() }),
}));
vi.mock("../../../../services/spawnService");
vi.mock("../../../../services/assetService");

const buildBaseAsset = (
  type: MediaAsset["type"],
  props: Partial<MediaAssetProperties> = {}
): MediaAsset => ({
  id: "asset-A",
  type,
  name: `${type}-asset`,
  path: `${type}.ext`,
  isUrl: false,
  properties: {
    dimensions: type !== "audio" ? { width: 100, height: 100 } : undefined,
    position: type !== "audio" ? { x: 0, y: 0 } : undefined,
    scale: type !== "audio" ? 1 : undefined,
    positionMode: type !== "audio" ? "absolute" : undefined,
    volume: type !== "image" ? 0.5 : undefined,
    loop: type !== "image" ? false : undefined,
    autoplay: type !== "image" ? false : undefined,
    muted: type !== "image" ? false : undefined,
    ...props,
  },
});

const buildSpawn = (
  asset: MediaAsset,
  overrides?: Partial<MediaAssetProperties>
): { spawn: Spawn; spawnAsset: SpawnAsset } => {
  const spawnAsset: SpawnAsset = {
    id: "sa-1",
    assetId: asset.id,
    overrides: { properties: overrides || {} },
    enabled: true,
    order: 0,
  };
  const spawn: Spawn = {
    id: "sp-1",
    name: "spawn",
    description: "",
    enabled: true,
    trigger: { enabled: true, type: "manual", config: { type: "manual" } },
    duration: 5000,
    assets: [spawnAsset],
    defaultProperties: {},
    lastModified: Date.now(),
    order: 0,
  };
  return { spawn, spawnAsset };
};

describe("AssetSettingsForm (MS-48 Validation)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("disables Save and shows error when volume percent is invalid; enables after fix", async () => {
    const asset = buildBaseAsset("video");
    const { spawn, spawnAsset } = buildSpawn(asset);
    (SpawnService.getSpawn as unknown as vi.Mock).mockResolvedValue(spawn);
    (AssetService.getAssetById as unknown as vi.Mock).mockReturnValue(asset);

    await act(async () => {
      render(
        <AssetSettingsForm
          spawnId={spawn.id}
          spawnAssetId={spawnAsset.id}
          onBack={() => {}}
        />
      );
    });

    const volToggle = screen.getByLabelText(
      "Override volume"
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.click(volToggle);
    });

    const volNumber = screen
      .getAllByRole("spinbutton")
      .find((el) => (el as HTMLInputElement).max === "100") as HTMLInputElement;
    // invalid 120
    await act(async () => {
      fireEvent.change(volNumber, { target: { value: "120" } });
    });
    expect(
      screen.getByRole("button", { name: "Save asset settings" })
    ).toBeDisabled();
    expect(screen.getByText("Enter 0–100")).toBeInTheDocument();

    // fix to 40
    await act(async () => {
      fireEvent.change(volNumber, { target: { value: "40" } });
    });
    expect(
      screen.getByRole("button", { name: "Save asset settings" })
    ).not.toBeDisabled();
  });
});
