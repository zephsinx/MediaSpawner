import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from "@testing-library/react";
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
  validateRotation: vi.fn(),
  validateCropSettings: vi.fn(),
  validateAlignment: vi.fn(),
  validateBoundsType: vi.fn(),
  validateBoundsAlignment: vi.fn(),
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
  validateRotation,
  validateCropSettings,
  validateAlignment,
  validateBoundsType,
  validateBoundsAlignment,
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
    vi.mocked(validateRotation).mockReturnValue({ isValid: true });
    vi.mocked(validateCropSettings).mockReturnValue({ isValid: true });
    vi.mocked(validateAlignment).mockReturnValue({ isValid: true });
    vi.mocked(validateBoundsType).mockReturnValue({ isValid: true });
    vi.mocked(validateBoundsAlignment).mockReturnValue({ isValid: true });
  });

  describe("Loading States", () => {
    it("shows loading state when data is not yet loaded", async () => {
      vi.mocked(SpawnService.getSpawn).mockResolvedValue(null);

      await act(async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
          />
        );
      });

      expect(
        await screen.findByText("Loading asset settings…")
      ).toBeInTheDocument();
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

      // Find width input by role and aria-describedby marker
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
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
      await waitFor(() => expect(dimensionsToggle).toBeChecked());

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

      // Check that at least one "Inherited from Spawn" text exists
      const inheritanceTexts = screen.getAllByText("Inherited from Spawn");
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

      // Ensure initialization effect has completed by waiting for draft values
      // to populate and the input to be initially disabled
      await screen.findByText("Test Video · video");
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
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

      // Find width input by role and aria-describedby marker
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
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

      const volumeSlider = await screen.findByLabelText("Volume slider");
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

      // Find width input by role and aria-describedby marker
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
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

      const volumeSlider = await screen.findByLabelText("Volume slider");
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

      // Find width input by role and aria-describedby marker
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
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

      // Find width input by role and aria-describedby marker
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
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
      // Ensure base content loaded before asserting toggles
      await screen.findByText("Test Video · video");
      const dimensionsToggle = await screen.findByLabelText(
        "Override dimensions"
      );
      const scaleToggle = await screen.findByLabelText("Override scale");

      await waitFor(() => expect(dimensionsToggle).toBeChecked());
      await waitFor(() => expect(scaleToggle).toBeChecked());

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

  describe("new transform controls", () => {
    describe("rotation control", () => {
      it("renders rotation control for video assets", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        await waitFor(() => {
          expect(screen.getByText("Rotation (°)")).toBeInTheDocument();
        });

        const rotationSlider = screen.getByLabelText("Rotation slider");
        const rotationInput = screen.getByLabelText("Rotation slider");

        expect(rotationSlider).toBeInTheDocument();
        expect(rotationInput).toBeInTheDocument();
        expect(rotationSlider).toHaveAttribute("min", "0");
        expect(rotationSlider).toHaveAttribute("max", "360");
        expect(rotationSlider).toHaveAttribute("step", "1");
      });

      it("updates rotation value when slider is changed", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const rotationToggle = await screen.findByLabelText(
          "Override rotation"
        );
        await act(async () => {
          fireEvent.click(rotationToggle);
        });

        const rotationSlider = screen.getByLabelText("Rotation slider");
        await act(async () => {
          fireEvent.change(rotationSlider, { target: { value: "90" } });
        });

        expect(rotationSlider).toHaveValue("90");
      });

      it("updates rotation value when numeric input is changed", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const rotationToggle = await screen.findByLabelText(
          "Override rotation"
        );
        await act(async () => {
          fireEvent.click(rotationToggle);
        });

        const rotationInput = screen.getByLabelText("Rotation slider");
        await act(async () => {
          fireEvent.change(rotationInput, { target: { value: "180" } });
        });

        expect(rotationInput).toHaveValue("180");
      });

      it("shows validation error for invalid rotation", async () => {
        vi.mocked(validateRotation).mockReturnValue({
          isValid: false,
          error: "Enter 0–360°",
        });

        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const rotationToggle = await screen.findByLabelText(
          "Override rotation"
        );
        await act(async () => {
          fireEvent.click(rotationToggle);
        });

        const rotationSlider = screen.getByLabelText("Rotation slider");
        await act(async () => {
          fireEvent.change(rotationSlider, { target: { value: "400" } });
        });

        expect(await screen.findByText("Enter 0–360°")).toBeInTheDocument();
      });
    });

    describe("crop controls", () => {
      it("renders crop controls for video assets", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        await waitFor(() => {
          expect(screen.getByText("Crop (px)")).toBeInTheDocument();
        });

        expect(screen.getByText("Left")).toBeInTheDocument();
        expect(screen.getByText("Top")).toBeInTheDocument();
        expect(screen.getByText("Right")).toBeInTheDocument();
        expect(screen.getByText("Bottom")).toBeInTheDocument();
      });

      it("updates crop values when inputs are changed", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const cropToggle = await screen.findByLabelText("Override crop");
        await act(async () => {
          fireEvent.click(cropToggle);
        });

        const cropInputs = screen.getAllByDisplayValue("0");
        const leftInput = cropInputs[0]; // First crop input is "Left"
        await act(async () => {
          fireEvent.change(leftInput, { target: { value: "10" } });
        });

        expect(leftInput).toHaveValue(10);
      });

      it("shows validation error for invalid crop values", async () => {
        vi.mocked(validateCropSettings).mockReturnValue({
          isValid: false,
          error: "Crop left must be ≥ 0",
        });

        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const cropToggle = await screen.findByLabelText("Override crop");
        await act(async () => {
          fireEvent.click(cropToggle);
        });

        const cropInputs = screen.getAllByDisplayValue("0");
        const leftInput = cropInputs[0]; // First crop input is "Left"
        await act(async () => {
          fireEvent.change(leftInput, { target: { value: "-1" } });
        });

        expect(
          await screen.findByText("Crop left must be ≥ 0")
        ).toBeInTheDocument();
      });
    });

    describe("non-uniform scale controls", () => {
      it("renders scale controls with linked/unlinked toggle", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        await waitFor(() => {
          expect(screen.getByText("Scale")).toBeInTheDocument();
        });

        const scaleToggle = screen.getByLabelText("Override scale");
        expect(scaleToggle).toBeInTheDocument();
      });

      it("shows single scale input when linked", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const scaleToggle = await screen.findByLabelText("Override scale");
        await act(async () => {
          fireEvent.click(scaleToggle);
        });

        // Should show single scale input when linked
        const scaleInputs = screen.getAllByDisplayValue("1");
        expect(scaleInputs).toHaveLength(1);
      });

      it("shows separate X and Y inputs when unlinked", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const scaleToggle = await screen.findByLabelText("Override scale");
        await act(async () => {
          fireEvent.click(scaleToggle);
        });

        // First, set a scale value to ensure the scale controls are rendered
        const scaleInput = screen.getByDisplayValue("1");
        await act(async () => {
          fireEvent.change(scaleInput, { target: { value: "1.5" } });
        });

        // Now look for the linked/unlinked toggle
        const linkToggle = screen.getByRole("checkbox", { name: /linked/i });
        await act(async () => {
          fireEvent.click(linkToggle);
        });

        // Wait for the X and Y inputs to appear
        await waitFor(() => {
          expect(screen.getByText("X")).toBeInTheDocument();
          expect(screen.getByText("Y")).toBeInTheDocument();
        });
      });
    });

    describe("bounds type selection", () => {
      it("renders bounds type dropdown", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        await waitFor(() => {
          expect(screen.getByText("Bounds Type")).toBeInTheDocument();
        });

        const boundsTypeSelect = screen.getByLabelText("Override bounds type");
        expect(boundsTypeSelect).toBeInTheDocument();
      });

      it("updates bounds type when selection changes", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const boundsTypeToggle = await screen.findByLabelText(
          "Override bounds type"
        );
        await act(async () => {
          fireEvent.click(boundsTypeToggle);
        });

        const boundsTypeSelect = screen.getByDisplayValue(
          "Select bounds type..."
        );
        await act(async () => {
          fireEvent.change(boundsTypeSelect, {
            target: { value: "OBS_BOUNDS_STRETCH" },
          });
        });

        expect(boundsTypeSelect).toHaveValue("OBS_BOUNDS_STRETCH");
      });

      it("shows validation error for invalid bounds type", async () => {
        vi.mocked(validateBoundsType).mockReturnValue({
          isValid: false,
          error: "Invalid bounds type",
        });

        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const boundsTypeToggle = await screen.findByLabelText(
          "Override bounds type"
        );
        await act(async () => {
          fireEvent.click(boundsTypeToggle);
        });

        const boundsTypeSelect = screen.getByLabelText("Override bounds type");
        await act(async () => {
          fireEvent.change(boundsTypeSelect, {
            target: { value: "INVALID_TYPE" },
          });
        });

        expect(
          await screen.findByText("Invalid bounds type")
        ).toBeInTheDocument();
      });
    });

    describe("alignment selection", () => {
      it("renders alignment dropdown", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        await waitFor(() => {
          expect(screen.getByText("Alignment")).toBeInTheDocument();
        });

        const alignmentSelect = screen.getByLabelText("Override alignment");
        expect(alignmentSelect).toBeInTheDocument();
      });

      it("updates alignment when selection changes", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const alignmentToggle = await screen.findByLabelText(
          "Override alignment"
        );
        await act(async () => {
          fireEvent.click(alignmentToggle);
        });

        const alignmentSelect = screen.getByDisplayValue("Select alignment...");
        await act(async () => {
          fireEvent.change(alignmentSelect, { target: { value: "5" } });
        });

        expect(alignmentSelect).toHaveValue("5");
      });

      it("shows validation error for invalid alignment", async () => {
        vi.mocked(validateAlignment).mockReturnValue({
          isValid: false,
          error: "Invalid alignment value",
        });

        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />
        );

        const alignmentToggle = await screen.findByLabelText(
          "Override alignment"
        );
        await act(async () => {
          fireEvent.click(alignmentToggle);
        });

        const alignmentSelect = screen.getByLabelText("Override alignment");
        await act(async () => {
          fireEvent.change(alignmentSelect, { target: { value: "99" } });
        });

        expect(
          await screen.findByText("Invalid alignment value")
        ).toBeInTheDocument();
      });
    });
  });
});
