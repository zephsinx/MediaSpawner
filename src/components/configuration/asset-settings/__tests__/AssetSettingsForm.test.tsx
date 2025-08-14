import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
// Mock usePanelState BEFORE importing the component under test
vi.mock("../../../../hooks/useLayout", () => ({
  usePanelState: () => ({ setUnsavedChanges: vi.fn() }),
}));
import AssetSettingsForm from "../AssetSettingsForm";
import { SpawnService } from "../../../../services/spawnService";
import { AssetService } from "../../../../services/assetService";
import type { MediaAsset, MediaAssetProperties } from "../../../../types/media";
import type { Spawn, SpawnAsset } from "../../../../types/spawn";

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
    defaultProperties: {
      volume: 0.4,
      dimensions:
        asset.type !== "audio" ? { width: 80, height: 80 } : undefined,
    },
    lastModified: Date.now(),
    order: 0,
  };
  return { spawn, spawnAsset };
};

describe("AssetSettingsForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders visual fields for image and not playback", async () => {
    const asset = buildBaseAsset("image");
    const { spawn, spawnAsset } = buildSpawn(asset);
    (SpawnService.getSpawn as unknown as Mock).mockResolvedValue(spawn);
    (AssetService.getAssetById as unknown as Mock).mockReturnValue(asset);

    await act(async () => {
      render(
        <AssetSettingsForm
          spawnId={spawn.id}
          spawnAssetId={spawnAsset.id}
          onBack={() => {}}
        />
      );
    });

    expect(screen.getByText("Visual Properties")).toBeInTheDocument();
    expect(screen.queryByText("Playback Properties")).not.toBeInTheDocument();
  });

  it("renders visual + playback fields for video", async () => {
    const asset = buildBaseAsset("video");
    const { spawn, spawnAsset } = buildSpawn(asset);
    (SpawnService.getSpawn as unknown as Mock).mockResolvedValue(spawn);
    (AssetService.getAssetById as unknown as Mock).mockReturnValue(asset);

    await act(async () => {
      render(
        <AssetSettingsForm
          spawnId={spawn.id}
          spawnAssetId={spawnAsset.id}
          onBack={() => {}}
        />
      );
    });

    expect(screen.getByText("Visual Properties")).toBeInTheDocument();
    expect(screen.getByText("Playback Properties")).toBeInTheDocument();
  });

  it("enables override toggle to edit and disables to revert to inherited", async () => {
    const asset = buildBaseAsset("image", {
      dimensions: { width: 100, height: 50 },
    });
    const { spawn, spawnAsset } = buildSpawn(asset);
    (SpawnService.getSpawn as unknown as Mock).mockResolvedValue(spawn);
    (AssetService.getAssetById as unknown as Mock).mockReturnValue(asset);

    await act(async () => {
      render(
        <AssetSettingsForm
          spawnId={spawn.id}
          spawnAssetId={spawnAsset.id}
          onBack={() => {}}
        />
      );
    });

    const widthLabel = screen.getByText("Width (px)");
    const container = widthLabel.parentElement as HTMLElement;
    const widthInput = container.querySelector(
      'input[type="number"]'
    ) as HTMLInputElement;
    expect(widthInput).toBeDisabled();

    const widthToggle = container.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.click(widthToggle);
    });
    expect(widthInput).not.toBeDisabled();

    await act(async () => {
      fireEvent.change(widthInput, { target: { value: "120" } });
    });
    expect(widthInput.value).toBe("120");

    await act(async () => {
      fireEvent.click(widthToggle);
    });
    expect(widthInput).toBeDisabled();
    expect(widthInput.value).toBe("80"); // inherited from spawn default
  });

  it("saves only toggled overrides and dispatches spawn-updated", async () => {
    const asset = buildBaseAsset("video");
    const { spawn, spawnAsset } = buildSpawn(asset);
    (SpawnService.getSpawn as unknown as Mock).mockResolvedValue(spawn);
    (AssetService.getAssetById as unknown as Mock).mockReturnValue(asset);
    (SpawnService.updateSpawn as unknown as Mock).mockResolvedValue({
      success: true,
      spawn,
    });

    const updatedEventSpy = vi.fn();
    window.addEventListener(
      "mediaspawner:spawn-updated" as unknown as keyof WindowEventMap,
      updatedEventSpy as EventListener
    );

    await act(async () => {
      render(
        <AssetSettingsForm
          spawnId={spawn.id}
          spawnAssetId={spawnAsset.id}
          onBack={() => {}}
        />
      );
    });

    const volumeLabel = screen.getByText("Volume (%)");
    const vContainer = volumeLabel.parentElement as HTMLElement;
    const volumeToggle = screen.getByLabelText(
      "Override volume"
    ) as HTMLInputElement;
    const volumeNumber = vContainer.querySelector(
      'input[type="number"]'
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.click(volumeToggle);
      fireEvent.change(volumeNumber, { target: { value: "70" } });
    });

    const saveBtn = screen.getByRole("button", { name: "Save asset settings" });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    const args = (SpawnService.updateSpawn as unknown as Mock).mock.calls[0][1];
    const updatedAssets = args.assets as SpawnAsset[];
    const savedSa = updatedAssets.find((a) => a.id === spawnAsset.id)!;
    expect(savedSa.overrides.properties).toHaveProperty("volume", 0.7);
    expect(updatedEventSpy).toHaveBeenCalled();
  });
});
