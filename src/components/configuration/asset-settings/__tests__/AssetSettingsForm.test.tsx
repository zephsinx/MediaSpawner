import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import AssetSettingsForm from "../AssetSettingsForm";
import type { Spawn, SpawnAsset } from "../../../../types/spawn";
import type { MediaAsset, MediaAssetProperties } from "../../../../types/media";
import { createSpawn, createSpawnAsset } from "../../../../types/spawn";

// Mock services
vi.mock("../../../../services/spawnService", () => ({
  SpawnService: {
    getSpawn: vi.fn(),
    updateSpawn: vi.fn(),
  },
}));
vi.mock("../../../../services/assetService", () => ({
  AssetService: {
    getAssetById: vi.fn(),
  },
}));

// Mock usePanelState hook
vi.mock("../../../../hooks/useLayout", () => ({
  usePanelState: vi.fn(),
}));

// Mock utility functions
vi.mock("../../../../utils/assetSettingsResolver", () => ({
  resolveEffectiveProperties: vi.fn(),
  buildOverridesDiff: vi.fn(),
}));
vi.mock("../../../../utils/assetValidation", () => ({
  validateVolumePercent: vi.fn(),
  validateDimensionsValues: vi.fn(),
  validatePositionValues: vi.fn(),
  validateScaleValue: vi.fn(),
}));

// Imports after mocks
import { SpawnService } from "../../../../services/spawnService";
import { AssetService } from "../../../../services/assetService";
import { usePanelState } from "../../../../hooks/useLayout";
import {
  resolveEffectiveProperties,
  buildOverridesDiff,
} from "../../../../utils/assetSettingsResolver";
import {
  validateVolumePercent,
  validateDimensionsValues,
  validatePositionValues,
  validateScaleValue,
} from "../../../../utils/assetValidation";

function makeSpawn(
  id: string,
  assets: SpawnAsset[],
  defaultProperties?: Partial<MediaAssetProperties>
): Spawn {
  const spawn = createSpawn(id, undefined, assets, id);
  if (defaultProperties) {
    spawn.defaultProperties = defaultProperties;
  }
  return spawn;
}

function makeSpawnAsset(
  assetId: string,
  order: number,
  overrides?: Partial<MediaAssetProperties>
): SpawnAsset {
  return createSpawnAsset(
    assetId,
    order,
    {
      properties: overrides,
    },
    assetId
  ); // Pass assetId as the id parameter
}

const makeAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
  id: overrides.id || Math.random().toString(36).slice(2),
  type: overrides.type || "image",
  name: overrides.name || "Sample Asset",
  path: overrides.path || "https://example.com/sample.png",
  isUrl: overrides.isUrl ?? true,
});

const makeProperties = (
  overrides: Partial<MediaAssetProperties> = {}
): MediaAssetProperties => ({
  dimensions: overrides.dimensions || { width: 100, height: 100 },
  position: overrides.position || { x: 0, y: 0 },
  scale: overrides.scale ?? 1.0,
  positionMode: overrides.positionMode || "absolute",
  volume: overrides.volume ?? 0.5,
  loop: overrides.loop ?? false,
  autoplay: overrides.autoplay ?? false,
  muted: overrides.muted ?? false,
});

describe("AssetSettingsForm", () => {
  const mockSetUnsavedChanges = vi.fn();
  const mockOnBack = vi.fn();
  const mockGetCachedDraft = vi.fn();
  const mockSetCachedDraft = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePanelState).mockReturnValue({
      selectedSpawnId: undefined,
      activeProfileId: undefined,
      selectedSpawnAssetId: undefined,
      centerPanelMode: "spawn-settings",
      hasUnsavedChanges: false,
      profileSpawnSelections: {},
      setActiveProfile: vi.fn(),
      selectSpawn: vi.fn(),
      selectSpawnAsset: vi.fn(),
      setCenterPanelMode: vi.fn(),
      setUnsavedChanges: mockSetUnsavedChanges,
      clearContext: vi.fn(),
    });

    // Default validation mocks
    vi.mocked(validateVolumePercent).mockReturnValue({ isValid: true });
    vi.mocked(validateDimensionsValues).mockReturnValue({ isValid: true });
    vi.mocked(validatePositionValues).mockReturnValue({ isValid: true });
    vi.mocked(validateScaleValue).mockReturnValue({ isValid: true });
  });

  describe("Loading States", () => {
    it("shows loading state when data is not yet loaded", () => {
      vi.mocked(SpawnService.getSpawn).mockResolvedValue(null);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText("Loading asset settings…")).toBeInTheDocument();
    });
  });

  describe("Basic Rendering", () => {
    beforeEach(() => {
      const asset = makeAsset({
        id: "asset1",
        type: "video",
        name: "Test Video",
      });
      const spawnAsset = makeSpawnAsset("asset1", 0);
      const spawn = makeSpawn("spawn1", [spawnAsset], makeProperties());

      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(resolveEffectiveProperties).mockReturnValue({
        effective: makeProperties(),
        sourceMap: {
          dimensions: "spawn-default",
          position: "spawn-default",
          scale: "spawn-default",
          positionMode: "spawn-default",
          volume: "spawn-default",
          loop: "spawn-default",
          autoplay: "spawn-default",
          muted: "spawn-default",
        },
      });
    });

    it("renders header with asset name and type", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      // Wait for the component to finish loading by looking for content that only appears after loading
      await screen.findByText("Test Video · video");

      expect(screen.getByText("Asset Settings")).toBeInTheDocument();
      expect(screen.getByText("Test Video · video")).toBeInTheDocument();
    });

    it("renders action buttons", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      expect(
        await screen.findByRole("button", { name: "Back to spawn settings" })
      ).toBeInTheDocument();
      expect(
        await screen.findByRole("button", { name: "Cancel edits" })
      ).toBeInTheDocument();
      expect(
        await screen.findByRole("button", {
          name: "Reset all fields to spawn defaults",
        })
      ).toBeInTheDocument();
      expect(
        await screen.findByRole("button", { name: "Save asset settings" })
      ).toBeInTheDocument();
    });

    it("shows visual properties section for video assets", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      expect(await screen.findByText("Visual Properties")).toBeInTheDocument();
      expect(await screen.findByText("Width (px)")).toBeInTheDocument();
      expect(await screen.findByText("Height (px)")).toBeInTheDocument();
      expect(await screen.findByText("X Position (px)")).toBeInTheDocument();
      expect(await screen.findByText("Y Position (px)")).toBeInTheDocument();
      expect(await screen.findByText("Scale")).toBeInTheDocument();
      expect(await screen.findByText("Position Mode")).toBeInTheDocument();
    });

    it("shows playback properties section for video assets", async () => {
      const asset = makeAsset({
        id: "asset1",
        type: "video",
        name: "Test Video",
      });
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      expect(
        await screen.findByText("Playback Properties")
      ).toBeInTheDocument();
      expect(await screen.findByText("Volume (%)")).toBeInTheDocument();
      expect(await screen.findByText("Loop")).toBeInTheDocument();
      expect(await screen.findByText("Autoplay")).toBeInTheDocument();
      expect(await screen.findByText("Muted")).toBeInTheDocument();
    });

    it("shows playback properties section for audio assets", async () => {
      const asset = makeAsset({
        id: "asset1",
        type: "audio",
        name: "Test Audio",
      });
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      expect(
        await screen.findByText("Playback Properties")
      ).toBeInTheDocument();
      expect(await screen.findByText("Volume (%)")).toBeInTheDocument();
      expect(await screen.findByText("Loop")).toBeInTheDocument();
      expect(await screen.findByText("Autoplay")).toBeInTheDocument();
      expect(await screen.findByText("Muted")).toBeInTheDocument();
    });
  });

  describe("Property Override Toggles", () => {
    beforeEach(() => {
      const asset = makeAsset({
        id: "asset1",
        type: "video",
        name: "Test Video",
      });
      const spawnAsset = makeSpawnAsset("asset1", 0);
      const spawn = makeSpawn("spawn1", [spawnAsset], makeProperties());

      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(resolveEffectiveProperties).mockReturnValue({
        effective: makeProperties(),
        sourceMap: {
          dimensions: "spawn-default",
          position: "spawn-default",
          scale: "spawn-default",
          positionMode: "spawn-default",
          volume: "spawn-default",
          loop: "spawn-default",
          autoplay: "spawn-default",
          muted: "spawn-default",
        },
      });
    });

    it("enables property editing when override toggle is checked", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      // Wait for the component to finish loading
      await screen.findByText("Test Video · video");

      // Find width input specifically by its aria-describedby attribute
      const widthInputs = screen.getAllByDisplayValue("100");
      const widthInput = widthInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error")
      );
      if (!widthInput) throw new Error("Width input not found");
      expect(widthInput).toBeDisabled();

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      await act(async () => {
        fireEvent.click(dimensionsToggle);
      });

      expect(widthInput).not.toBeDisabled();
    });

    it("shows inheritance source when override is disabled", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      // Wait for the component to finish loading
      await screen.findByText("Test Video · video");

      // Check that at least one "Inherited from Spawn Defaults" text exists
      const inheritanceTexts = screen.getAllByText(
        "Inherited from Spawn Defaults"
      );
      expect(inheritanceTexts.length).toBeGreaterThan(0);
    });

    it("shows 'Overridden' when override is enabled", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      await act(async () => {
        fireEvent.click(dimensionsToggle);
      });

      expect(await screen.findByText("Overridden")).toBeInTheDocument();
    });

    it("sets unsaved changes when override toggle is changed", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      await act(async () => {
        fireEvent.click(dimensionsToggle);
      });

      expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true);
    });
  });

  describe("Property Value Editing", () => {
    beforeEach(() => {
      const asset = makeAsset({
        id: "asset1",
        type: "video",
        name: "Test Video",
      });
      const spawnAsset = makeSpawnAsset("asset1", 0);
      const spawn = makeSpawn("spawn1", [spawnAsset], makeProperties());

      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(resolveEffectiveProperties).mockReturnValue({
        effective: makeProperties(),
        sourceMap: {
          dimensions: "spawn-default",
          position: "spawn-default",
          scale: "spawn-default",
          positionMode: "spawn-default",
          volume: "spawn-default",
          loop: "spawn-default",
          autoplay: "spawn-default",
          muted: "spawn-default",
        },
      });
    });

    it("updates width value when dimensions override is enabled", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      await act(async () => {
        fireEvent.click(dimensionsToggle);
      });

      // Find width input specifically by its aria-describedby attribute
      const widthInputs = screen.getAllByDisplayValue("100");
      const widthInput = widthInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error")
      );
      if (!widthInput) throw new Error("Width input not found");
      await act(async () => {
        fireEvent.change(widthInput, { target: { value: "200" } });
      });

      expect(widthInput).toHaveValue(200);
      expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true);
    });

    it("updates scale value when scale override is enabled", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const scaleToggle = await screen.findByLabelText("Override scale");
      await act(async () => {
        fireEvent.click(scaleToggle);
      });

      const scaleInput = await screen.findByDisplayValue("1");
      await act(async () => {
        fireEvent.change(scaleInput, { target: { value: "2.5" } });
      });

      expect(scaleInput).toHaveValue(2.5);
    });

    it("updates position mode when positionMode override is enabled", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const positionModeToggle = await screen.findByLabelText(
        "Override position mode"
      );
      await act(async () => {
        fireEvent.click(positionModeToggle);
      });

      const positionModeSelect = await screen.findByDisplayValue(
        "Absolute (px)"
      );
      await act(async () => {
        fireEvent.change(positionModeSelect, { target: { value: "centered" } });
      });

      expect(positionModeSelect).toHaveValue("centered");
    });

    it("updates volume when volume override is enabled", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const volumeToggle = await screen.findByLabelText("Override volume");
      await act(async () => {
        fireEvent.click(volumeToggle);
      });

      const volumeSlider = await screen.findByRole("slider");
      await act(async () => {
        fireEvent.change(volumeSlider, { target: { value: "75" } });
      });

      expect(volumeSlider).toHaveValue("75");
    });

    it("updates boolean properties when their overrides are enabled", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const loopCheckbox = await screen.findByRole("checkbox", {
        name: "Loop",
      });
      await act(async () => {
        fireEvent.click(loopCheckbox);
      });

      expect(loopCheckbox).toBeChecked();
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      const asset = makeAsset({
        id: "asset1",
        type: "video",
        name: "Test Video",
      });
      const spawnAsset = makeSpawnAsset("asset1", 0);
      const spawn = makeSpawn("spawn1", [spawnAsset], makeProperties());

      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(resolveEffectiveProperties).mockReturnValue({
        effective: makeProperties(),
        sourceMap: {
          dimensions: "spawn-default",
          position: "spawn-default",
          scale: "spawn-default",
          positionMode: "spawn-default",
          volume: "spawn-default",
          loop: "spawn-default",
          autoplay: "spawn-default",
          muted: "spawn-default",
        },
      });
    });

    it("shows validation error for invalid dimensions", async () => {
      vi.mocked(validateDimensionsValues).mockReturnValue({
        isValid: false,
        error: "Width/Height must be > 0",
      });

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      await act(async () => {
        fireEvent.click(dimensionsToggle);
      });

      // Find width input specifically by its aria-describedby attribute
      const widthInputs = screen.getAllByDisplayValue("100");
      const widthInput = widthInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error")
      );
      if (!widthInput) throw new Error("Width input not found");
      await act(async () => {
        fireEvent.change(widthInput, { target: { value: "0" } });
      });

      expect(
        await screen.findByText("Width/Height must be > 0")
      ).toBeInTheDocument();
    });

    it("shows validation error for invalid volume", async () => {
      vi.mocked(validateVolumePercent).mockReturnValue({
        isValid: false,
        error: "Enter 0–100",
      });

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const volumeToggle = await screen.findByLabelText("Override volume");
      await act(async () => {
        fireEvent.click(volumeToggle);
      });

      const volumeSlider = await screen.findByRole("slider");
      await act(async () => {
        fireEvent.change(volumeSlider, { target: { value: "150" } });
      });

      expect(await screen.findByText("Enter 0–100")).toBeInTheDocument();
    });

    it("disables save button when validation errors exist", async () => {
      vi.mocked(validateDimensionsValues).mockReturnValue({
        isValid: false,
        error: "Width/Height must be > 0",
      });

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      await act(async () => {
        fireEvent.click(dimensionsToggle);
      });

      // Find width input specifically by its aria-describedby attribute
      const widthInputs = screen.getAllByDisplayValue("100");
      const widthInput = widthInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error")
      );
      if (!widthInput) throw new Error("Width input not found");
      await act(async () => {
        fireEvent.change(widthInput, { target: { value: "0" } });
      });

      const saveButton = await screen.findByRole("button", {
        name: "Save asset settings",
      });
      expect(saveButton).toBeDisabled();
    });
  });

  describe("Save Functionality", () => {
    beforeEach(() => {
      const asset = makeAsset({
        id: "asset1",
        type: "video",
        name: "Test Video",
      });
      const spawnAsset = makeSpawnAsset("asset1", 0);
      const spawn = makeSpawn("spawn1", [spawnAsset], makeProperties());

      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(resolveEffectiveProperties).mockReturnValue({
        effective: makeProperties(),
        sourceMap: {
          dimensions: "spawn-default",
          position: "spawn-default",
          scale: "spawn-default",
          positionMode: "spawn-default",
          volume: "spawn-default",
          loop: "spawn-default",
          autoplay: "spawn-default",
          muted: "spawn-default",
        },
      });
      vi.mocked(buildOverridesDiff).mockReturnValue({
        dimensions: { width: 200, height: 150 },
      });
    });

    it("saves overridden properties and shows success message", async () => {
      vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
        success: true,
        spawn: makeSpawn("spawn1", [makeSpawnAsset("asset1", 0)]),
      });

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      await act(async () => {
        fireEvent.click(dimensionsToggle);
      });

      // Find width input specifically by its aria-describedby attribute
      const widthInputs = screen.getAllByDisplayValue("100");
      const widthInput = widthInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error")
      );
      if (!widthInput) throw new Error("Width input not found");
      await act(async () => {
        fireEvent.change(widthInput, { target: { value: "200" } });
      });

      const saveButton = await screen.findByRole("button", {
        name: "Save asset settings",
      });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(await screen.findByText("Changes saved")).toBeInTheDocument();
      expect(SpawnService.updateSpawn).toHaveBeenCalled();
    });

    it("shows error message when save fails", async () => {
      vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
        success: false,
        error: "Failed to save",
      });

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const saveButton = await screen.findByRole("button", {
        name: "Save asset settings",
      });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(await screen.findByText("Failed to save")).toBeInTheDocument();
    });

    it("dispatches spawn-updated event after successful save", async () => {
      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
      vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
        success: true,
        spawn: makeSpawn("spawn1", [makeSpawnAsset("asset1", 0)]),
      });

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const saveButton = await screen.findByRole("button", {
        name: "Save asset settings",
      });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "mediaspawner:spawn-updated",
          detail: { spawnId: "spawn1" },
        })
      );
    });
  });

  describe("Cancel and Reset", () => {
    beforeEach(() => {
      const asset = makeAsset({
        id: "asset1",
        type: "video",
        name: "Test Video",
      });
      const spawnAsset = makeSpawnAsset("asset1", 0);
      const spawn = makeSpawn("spawn1", [spawnAsset], makeProperties());

      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(resolveEffectiveProperties).mockReturnValue({
        effective: makeProperties(),
        sourceMap: {
          dimensions: "spawn-default",
          position: "spawn-default",
          scale: "spawn-default",
          positionMode: "spawn-default",
          volume: "spawn-default",
          loop: "spawn-default",
          autoplay: "spawn-default",
          muted: "spawn-default",
        },
      });
    });

    it("resets form to original values when cancel is clicked", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      await act(async () => {
        fireEvent.click(dimensionsToggle);
      });

      // Find width input specifically by its aria-describedby attribute
      const widthInputs = screen.getAllByDisplayValue("100");
      const widthInput = widthInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error")
      );
      if (!widthInput) throw new Error("Width input not found");
      await act(async () => {
        fireEvent.change(widthInput, { target: { value: "200" } });
      });

      const cancelButton = await screen.findByRole("button", {
        name: "Cancel edits",
      });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(widthInput).toHaveValue(100);
      expect(dimensionsToggle).not.toBeChecked();
      expect(mockSetUnsavedChanges).toHaveBeenCalledWith(false);
    });

    it("resets all overrides to disabled when reset all is clicked", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />
      );

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      const scaleToggle = await screen.findByLabelText("Override scale");

      await act(async () => {
        fireEvent.click(dimensionsToggle);
        fireEvent.click(scaleToggle);
      });

      const resetButton = await screen.findByRole("button", {
        name: "Reset all fields to spawn defaults",
      });
      await act(async () => {
        fireEvent.click(resetButton);
      });

      expect(dimensionsToggle).not.toBeChecked();
      expect(scaleToggle).not.toBeChecked();
      expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true);
    });
  });

  describe("Cached Draft", () => {
    it("restores cached draft when available", async () => {
      const asset = makeAsset({
        id: "asset1",
        type: "video",
        name: "Test Video",
      });
      const spawnAsset = makeSpawnAsset("asset1", 0);
      const spawn = makeSpawn("spawn1", [spawnAsset], makeProperties());

      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(resolveEffectiveProperties).mockReturnValue({
        effective: makeProperties(),
        sourceMap: {
          dimensions: "spawn-default",
          position: "spawn-default",
          scale: "spawn-default",
          positionMode: "spawn-default",
          volume: "spawn-default",
          loop: "spawn-default",
          autoplay: "spawn-default",
          muted: "spawn-default",
        },
      });

      const cachedDraft = {
        overrideEnabled: { dimensions: true, scale: true },
        draftValues: { dimensions: { width: 200, height: 150 }, scale: 2.0 },
      };
      mockGetCachedDraft.mockReturnValue(cachedDraft);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
          getCachedDraft={mockGetCachedDraft}
          setCachedDraft={mockSetCachedDraft}
        />
      );

      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      const scaleToggle = await screen.findByLabelText("Override scale");

      expect(dimensionsToggle).toBeChecked();
      expect(scaleToggle).toBeChecked();

      const widthInput = await screen.findByDisplayValue("200");
      const scaleInput = await screen.findByDisplayValue("2");

      expect(widthInput).toHaveValue(200);
      expect(scaleInput).toHaveValue(2);
    });

    it("saves draft when component unmounts", async () => {
      const asset = makeAsset({
        id: "asset1",
        type: "video",
        name: "Test Video",
      });
      const spawnAsset = makeSpawnAsset("asset1", 0);
      const spawn = makeSpawn("spawn1", [spawnAsset], makeProperties());

      vi.mocked(SpawnService.getSpawn).mockResolvedValue(spawn);
      vi.mocked(AssetService.getAssetById).mockReturnValue(asset);
      vi.mocked(resolveEffectiveProperties).mockReturnValue({
        effective: makeProperties(),
        sourceMap: {
          dimensions: "spawn-default",
          position: "spawn-default",
          scale: "spawn-default",
          positionMode: "spawn-default",
          volume: "spawn-default",
          loop: "spawn-default",
          autoplay: "spawn-default",
          muted: "spawn-default",
        },
      });

      const { unmount } = render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
          setCachedDraft={mockSetCachedDraft}
        />
      );

      await act(async () => {
        unmount();
      });

      expect(mockSetCachedDraft).toHaveBeenCalledWith({
        overrideEnabled: {},
        draftValues: expect.any(Object),
      });
    });
  });
});
