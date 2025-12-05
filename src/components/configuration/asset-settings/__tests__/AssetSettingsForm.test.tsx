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
import {
  keyboardUtils,
  tabOrderUtils,
} from "../../../../test-utils/accessibilityTestUtils";

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

// Mock Radix UI Tooltip
vi.mock("@radix-ui/react-tooltip", () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => (asChild ? <>{children}</> : <div>{children}</div>),
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Arrow: () => <div />,
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

function makeSpawn(id: string, assets: SpawnAsset[]): Spawn {
  const spawn = createSpawn(id, undefined, assets, id);
  return spawn;
}

function makeSpawnAsset(
  assetId: string,
  order: number,
  overrides?: Partial<MediaAssetProperties>,
): SpawnAsset {
  return createSpawnAsset(
    assetId,
    order,
    {
      properties: overrides,
    },
    assetId,
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
  overrides: Partial<MediaAssetProperties> = {},
): MediaAssetProperties => ({
  dimensions: overrides.dimensions || { width: 100, height: 100 },
  position: overrides.position || { x: 0, y: 0 },
  scale: overrides.scale ?? 1.0,
  positionMode: overrides.positionMode || "absolute",
  volume: overrides.volume ?? 0.5,
  loop: overrides.loop ?? false,
  muted: overrides.muted ?? false,
  rotation: overrides.rotation ?? 0,
  crop: overrides.crop,
  boundsType: overrides.boundsType,
  boundsAlignment: overrides.boundsAlignment,
  alignment: overrides.alignment,
  monitorType: overrides.monitorType,
});

describe("AssetSettingsForm", () => {
  const mockSetUnsavedChanges = vi.fn();
  const mockOnBack = vi.fn();
  const mockGetCachedDraft = vi.fn();
  const mockSetCachedDraft = vi.fn();
  const mockClearCachedDraft = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePanelState).mockReturnValue({
      selectedSpawnId: undefined,
      activeProfileId: undefined,
      liveProfileId: undefined,
      selectedSpawnAssetId: undefined,
      centerPanelMode: "spawn-settings",
      hasUnsavedChanges: false,
      changeType: "none",
      profileSpawnSelections: {},
      setActiveProfile: vi.fn(),
      setLiveProfile: vi.fn(),
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

    // Essential mocks for component rendering
    const defaultAsset = makeAsset({
      id: "asset1",
      type: "video",
      name: "Test Video",
    });
    const defaultSpawnAsset = makeSpawnAsset("asset1", 0);
    const defaultSpawn = makeSpawn("spawn1", [defaultSpawnAsset]);

    vi.mocked(SpawnService.getSpawn).mockResolvedValue(defaultSpawn);
    vi.mocked(AssetService.getAssetById).mockReturnValue(defaultAsset);
    vi.mocked(resolveEffectiveProperties).mockReturnValue({
      effective: makeProperties(),
      sourceMap: {
        dimensions: "none",
        position: "none",
        scale: "none",
        positionMode: "none",
        volume: "none",
        loop: "none",
        muted: "none",
        rotation: "none",
        crop: "none",
        boundsType: "none",
        boundsAlignment: "none",
        alignment: "none",
      },
    });
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
          />,
        );
      });

      expect(
        await screen.findByText("Loading asset settings…"),
      ).toBeInTheDocument();
    });
  });

  describe("Basic Rendering", () => {
    it("renders header with asset name and type", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
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
        />,
      );

      expect(
        await screen.findByRole("button", { name: "Close asset settings" }),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole("button", { name: "Save asset settings" }),
      ).toBeInTheDocument();
    });

    it("shows visual properties section for video assets", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
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
        />,
      );

      expect(
        await screen.findByText("Playback Properties"),
      ).toBeInTheDocument();
      expect(await screen.findByText("Volume (%)")).toBeInTheDocument();
      expect(await screen.findByText("Loop")).toBeInTheDocument();
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
        />,
      );

      expect(
        await screen.findByText("Playback Properties"),
      ).toBeInTheDocument();
      expect(await screen.findByText("Volume (%)")).toBeInTheDocument();
      expect(await screen.findByText("Loop")).toBeInTheDocument();
      expect(await screen.findByText("Muted")).toBeInTheDocument();
    });
  });

  describe("Property Value Editing", () => {
    it("updates width value with direct editing", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Find width input by role and aria-describedby marker
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error"),
      );
      if (!widthInput) throw new Error("Width input not found");

      // Input should be enabled for direct editing
      expect(widthInput).not.toBeDisabled();

      await act(async () => {
        fireEvent.change(widthInput, { target: { value: "200" } });
      });

      expect(widthInput).toHaveValue(200);
      expect(mockSetUnsavedChanges).toHaveBeenCalledWith(true, "asset");
    });

    it("updates scale value with direct editing", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      const scaleInput = await screen.findByDisplayValue("1");
      // Input should be enabled for direct editing
      expect(scaleInput).not.toBeDisabled();

      await act(async () => {
        fireEvent.change(scaleInput, { target: { value: "2.5" } });
      });

      expect(scaleInput).toHaveValue(2.5);
    });

    it("updates position mode with direct editing", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      const positionModeSelect =
        await screen.findByDisplayValue("Absolute (px)");
      // Select should be enabled for direct editing
      expect(positionModeSelect).not.toBeDisabled();

      await act(async () => {
        fireEvent.change(positionModeSelect, { target: { value: "centered" } });
      });

      expect(positionModeSelect).toHaveValue("centered");
    });

    it("updates volume with direct editing", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      const volumeSlider = await screen.findByLabelText("Volume slider");
      // Slider should be enabled for direct editing
      expect(volumeSlider).not.toBeDisabled();

      await act(async () => {
        fireEvent.change(volumeSlider, { target: { value: "75" } });
      });

      expect(volumeSlider).toHaveValue("75");
    });

    it("updates boolean properties with direct editing", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      const loopCheckbox = await screen.findByRole("checkbox", {
        name: "Loop",
      });
      // Checkbox should be enabled for direct editing
      expect(loopCheckbox).not.toBeDisabled();

      await act(async () => {
        fireEvent.click(loopCheckbox);
      });

      expect(loopCheckbox).toBeChecked();
    });
  });

  describe("Validation", () => {
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
        />,
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Find width input by role and aria-describedby marker
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error"),
      );
      if (!widthInput) throw new Error("Width input not found");

      // Input should be enabled for direct editing
      expect(widthInput).not.toBeDisabled();

      await act(async () => {
        fireEvent.change(widthInput, { target: { value: "0" } });
        fireEvent.blur(widthInput);
      });

      expect(
        await screen.findByText("Width/Height must be > 0"),
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
        />,
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      const volumeSlider = await screen.findByLabelText("Volume slider");
      // Slider should be enabled for direct editing
      expect(volumeSlider).not.toBeDisabled();

      await act(async () => {
        fireEvent.change(volumeSlider, { target: { value: "150" } });
        fireEvent.blur(volumeSlider);
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
        />,
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Find width input by role and aria-describedby marker
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error"),
      );
      if (!widthInput) throw new Error("Width input not found");

      // Input should be enabled for direct editing
      expect(widthInput).not.toBeDisabled();

      await act(async () => {
        fireEvent.change(widthInput, { target: { value: "0" } });
        fireEvent.blur(widthInput);
      });

      const saveButton = await screen.findByRole("button", {
        name: "Save asset settings",
      });
      expect(saveButton).toBeDisabled();
    });
  });

  describe("Save Functionality", () => {
    beforeEach(() => {
      vi.mocked(buildOverridesDiff).mockReturnValue({
        dimensions: { width: 200, height: 150 },
      });
    });

    it("saves properties and shows success message", async () => {
      vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
        success: true,
        spawn: makeSpawn("spawn1", [makeSpawnAsset("asset1", 0)]),
      });

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Find width input by role and aria-describedby marker
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error"),
      );
      if (!widthInput) throw new Error("Width input not found");

      // Input should be enabled for direct editing
      expect(widthInput).not.toBeDisabled();

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
        />,
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
        />,
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
        }),
      );
    });
  });

  describe("Close Behavior", () => {
    it("navigates immediately when no unsaved changes", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: undefined,
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        setCenterPanelMode: vi.fn(),
        selectSpawnAsset: vi.fn(),
        clearContext: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
      } as ReturnType<typeof usePanelState>);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      const closeButton = await screen.findByRole("button", {
        name: "Close asset settings",
      });

      await act(async () => {
        fireEvent.click(closeButton);
      });

      // Should navigate immediately without showing dialog
      expect(mockOnBack).toHaveBeenCalled();
      expect(screen.queryByText("Discard Changes?")).not.toBeInTheDocument();
    });

    it("shows confirmation dialog when there are unsaved changes", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: undefined,
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: true,
        changeType: "asset",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        setCenterPanelMode: vi.fn(),
        selectSpawnAsset: vi.fn(),
        clearContext: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
      } as ReturnType<typeof usePanelState>);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      const closeButton = await screen.findByRole("button", {
        name: "Close asset settings",
      });

      await act(async () => {
        fireEvent.click(closeButton);
      });

      // Should show confirmation dialog
      expect(await screen.findByText("Discard Changes?")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Your unsaved changes will be lost. This cannot be undone.",
        ),
      ).toBeInTheDocument();
      expect(mockOnBack).not.toHaveBeenCalled();
    });

    it("resets values and navigates when discard is confirmed", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: undefined,
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: true,
        changeType: "asset",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        setCenterPanelMode: vi.fn(),
        selectSpawnAsset: vi.fn(),
        clearContext: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
      } as ReturnType<typeof usePanelState>);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
          clearCachedDraft={mockClearCachedDraft}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      const closeButton = await screen.findByRole("button", {
        name: "Close asset settings",
      });

      await act(async () => {
        fireEvent.click(closeButton);
      });

      // Confirm discard
      const discardButton = await screen.findByRole("button", {
        name: "Discard",
      });
      await act(async () => {
        fireEvent.click(discardButton);
      });

      // Should clear cached draft, reset unsaved changes, and navigate
      expect(mockClearCachedDraft).toHaveBeenCalledWith("asset1");
      expect(mockSetUnsavedChanges).toHaveBeenCalledWith(false, "none");
      expect(mockOnBack).toHaveBeenCalled();
    });

    it("stays on form when discard is cancelled", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: undefined,
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: true,
        changeType: "asset",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        setCenterPanelMode: vi.fn(),
        selectSpawnAsset: vi.fn(),
        clearContext: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
      } as ReturnType<typeof usePanelState>);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      const closeButton = await screen.findByRole("button", {
        name: "Close asset settings",
      });

      await act(async () => {
        fireEvent.click(closeButton);
      });

      // Cancel discard
      const cancelButton = await screen.findByRole("button", {
        name: "Keep Editing",
      });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Should not navigate
      expect(mockOnBack).not.toHaveBeenCalled();
      expect(screen.queryByText("Discard Changes?")).not.toBeInTheDocument();
    });
  });

  describe("Unsaved Changes Indicator", () => {
    it("shows unsaved changes indicator when form is dirty", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: undefined,
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: true,
        changeType: "asset",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        setCenterPanelMode: vi.fn(),
        selectSpawnAsset: vi.fn(),
        clearContext: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
      } as ReturnType<typeof usePanelState>);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Should show unsaved changes indicator
      expect(screen.getByText("• Unsaved changes")).toBeInTheDocument();
    });

    it("does not show unsaved changes indicator when form is clean", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: undefined,
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: false,
        changeType: "none",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        setCenterPanelMode: vi.fn(),
        selectSpawnAsset: vi.fn(),
        clearContext: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
      } as ReturnType<typeof usePanelState>);

      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Should not show unsaved changes indicator
      expect(screen.queryByText("• Unsaved changes")).not.toBeInTheDocument();
    });
  });

  describe("Cached Draft", () => {
    it("restores cached draft when available", async () => {
      const cachedDraft = {
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
        />,
      );
      // Ensure base content loaded before asserting values
      await screen.findByText("Test Video · video");

      const widthInput = await screen.findByDisplayValue("200");
      const scaleInput = await screen.findByDisplayValue("2");

      expect(widthInput).toHaveValue(200);
      expect(scaleInput).toHaveValue(2);
    });

    it("saves draft when component unmounts with unsaved changes", async () => {
      vi.mocked(usePanelState).mockReturnValue({
        selectedSpawnId: undefined,
        activeProfileId: undefined,
        liveProfileId: undefined,
        selectedSpawnAssetId: undefined,
        centerPanelMode: "spawn-settings",
        hasUnsavedChanges: true,
        changeType: "asset",
        profileSpawnSelections: {},
        setActiveProfile: vi.fn(),
        setLiveProfile: vi.fn(),
        selectSpawn: vi.fn(),
        selectSpawnAsset: vi.fn(),
        switchCenterPanelMode: vi.fn(),
        setCenterPanelMode: vi.fn(),
        clearContext: vi.fn(),
        setUnsavedChanges: mockSetUnsavedChanges,
      } as ReturnType<typeof usePanelState>);

      const { unmount } = render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
          setCachedDraft={mockSetCachedDraft}
        />,
      );

      // Wait for component to load
      await screen.findByText("Test Video · video");

      await act(async () => {
        unmount();
      });

      expect(mockSetCachedDraft).toHaveBeenCalledWith({
        draftValues: expect.any(Object),
      });
    });

    it("does not save draft when unmounting without changes", async () => {
      const { unmount } = render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
          setCachedDraft={mockSetCachedDraft}
        />,
      );

      // Wait for component to load
      await screen.findByText("Test Video · video");

      await act(async () => {
        unmount();
      });

      expect(mockSetCachedDraft).not.toHaveBeenCalled();
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
          />,
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
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const rotationSlider = screen.getByLabelText("Rotation slider");
        // Slider should be enabled for direct editing
        expect(rotationSlider).not.toBeDisabled();

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
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const rotationInput = screen.getByLabelText("Rotation input");
        // Input should be enabled for direct editing
        expect(rotationInput).not.toBeDisabled();

        await act(async () => {
          fireEvent.change(rotationInput, { target: { value: "180" } });
        });

        expect(rotationInput).toHaveValue(180);
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
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const rotationSlider = screen.getByLabelText("Rotation slider");
        // Slider should be enabled for direct editing
        expect(rotationSlider).not.toBeDisabled();

        await act(async () => {
          fireEvent.change(rotationSlider, { target: { value: "400" } });
          fireEvent.blur(rotationSlider);
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
          />,
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
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const cropInputs = screen.getAllByDisplayValue("0");
        const leftInput = cropInputs[0]; // First crop input is "Left"
        // Input should be enabled for direct editing
        expect(leftInput).not.toBeDisabled();

        await act(async () => {
          fireEvent.change(leftInput, { target: { value: "10" } });
        });

        expect(leftInput).toHaveValue(10);
      });
    });

    describe("non-uniform scale controls", () => {
      it("renders scale controls", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        await waitFor(() => {
          expect(screen.getByText("Scale")).toBeInTheDocument();
        });

        // Scale controls should be directly editable
        const scaleInputs = screen.getAllByDisplayValue("1");
        expect(scaleInputs.length).toBeGreaterThan(0);
        scaleInputs.forEach((input) => {
          expect(input).not.toBeDisabled();
        });
      });

      it("shows separate X and Y inputs when unlinked", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        // First, find the scale input by role and aria-describedby attribute
        const numberInputs = screen.getAllByRole("spinbutton");
        const scaleInput = numberInputs.find((input) =>
          input.getAttribute("aria-describedby")?.includes("scale-error"),
        );
        if (!scaleInput) throw new Error("Scale input not found");

        // Input should be enabled for direct editing
        expect(scaleInput).not.toBeDisabled();

        await act(async () => {
          fireEvent.change(scaleInput, { target: { value: "1.5" } });
        });

        // Now look for the linked/unlinked toggle
        const unlinkToggle = screen.getByRole("checkbox", {
          name: /unlinked/i,
        });
        await act(async () => {
          fireEvent.click(unlinkToggle);
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
          />,
        );

        await waitFor(() => {
          expect(screen.getByText("Bounds Type")).toBeInTheDocument();
        });

        const boundsTypeSelect = screen.getByDisplayValue(
          "Select bounds type...",
        );
        expect(boundsTypeSelect).toBeInTheDocument();
      });

      it("updates bounds type when selection changes", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const boundsTypeSelect = screen.getByDisplayValue(
          "Select bounds type...",
        );
        // Select should be enabled for direct editing
        expect(boundsTypeSelect).not.toBeDisabled();

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
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const boundsTypeSelect = screen.getByDisplayValue(
          "Select bounds type...",
        );
        // Select should be enabled for direct editing
        expect(boundsTypeSelect).not.toBeDisabled();

        await act(async () => {
          fireEvent.change(boundsTypeSelect, {
            target: { value: "INVALID_TYPE" },
          });
          fireEvent.blur(boundsTypeSelect);
        });

        expect(
          await screen.findByText("Invalid bounds type"),
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
          />,
        );

        await waitFor(() => {
          expect(screen.getByText("Alignment")).toBeInTheDocument();
        });

        const alignmentSelect = screen.getByDisplayValue("Select alignment...");
        expect(alignmentSelect).toBeInTheDocument();
      });

      it("updates alignment when selection changes", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
            setCachedDraft={mockSetCachedDraft}
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const alignmentSelect = screen.getByDisplayValue("Select alignment...");
        // Select should be enabled for direct editing
        expect(alignmentSelect).not.toBeDisabled();

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
          />,
        );

        // Wait for the component to finish loading
        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const alignmentSelect = screen.getByDisplayValue("Select alignment...");
        // Select should be enabled for direct editing
        expect(alignmentSelect).not.toBeDisabled();

        await act(async () => {
          fireEvent.change(alignmentSelect, { target: { value: "99" } });
          fireEvent.blur(alignmentSelect);
        });

        expect(
          await screen.findByText("Invalid alignment value"),
        ).toBeInTheDocument();
      });
    });

    describe("monitor type selection", () => {
      it("renders monitor type dropdown for audio assets", async () => {
        const asset = makeAsset({ type: "audio", name: "Test Audio" });
        vi.mocked(AssetService.getAssetById).mockReturnValue(asset);

        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
          />,
        );

        await waitFor(() => {
          expect(screen.getByText("Monitor Type")).toBeInTheDocument();
        });

        const select = screen.getByDisplayValue("Not set (OBS default)");
        expect(select).toBeInTheDocument();
      });

      it("renders monitor type dropdown for video assets", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
          />,
        );

        await waitFor(() => {
          expect(screen.getByText("Monitor Type")).toBeInTheDocument();
        });
      });

      it("updates monitor type when selection changes", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
          />,
        );

        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const select = screen.getByDisplayValue("Not set (OBS default)");
        expect(select).not.toBeDisabled();

        await act(async () => {
          fireEvent.change(select, { target: { value: "monitor-only" } });
        });

        expect(select).toHaveValue("monitor-only");
      });

      it("does not render monitor type for image assets", async () => {
        const asset = makeAsset({ type: "image", name: "Test Image" });
        vi.mocked(AssetService.getAssetById).mockReturnValue(asset);

        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
          />,
        );

        await waitFor(() => {
          expect(screen.getByText("Test Image · image")).toBeInTheDocument();
        });

        expect(screen.queryByText("Monitor Type")).not.toBeInTheDocument();
      });

      it("preserves other properties when changing monitor type", async () => {
        render(
          <AssetSettingsForm
            spawnId="spawn1"
            spawnAssetId="asset1"
            onBack={mockOnBack}
          />,
        );

        await waitFor(() => {
          expect(screen.getByText("Test Video · video")).toBeInTheDocument();
        });

        const volumeSlider = screen.getByRole("slider", { name: /volume/i });
        const loopCheckbox = screen.getByRole("checkbox", {
          name: "Loop",
        }) as HTMLInputElement;
        const initialVolume = volumeSlider.getAttribute("value");
        const initialLoop = loopCheckbox.checked;

        const select = screen.getByDisplayValue("Not set (OBS default)");
        await act(async () => {
          fireEvent.change(select, { target: { value: "monitor-only" } });
        });

        expect(volumeSlider.getAttribute("value")).toBe(initialVolume);
        expect(
          (screen.getByRole("checkbox", { name: "Loop" }) as HTMLInputElement)
            .checked,
        ).toBe(initialLoop);
      });
    });
  });

  describe("Tooltip Tab Order Accessibility", () => {
    it("tooltip triggers are not focusable via Tab key", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Get all focusable elements in the form (excluding tabIndex={-1})
      const form =
        screen.getByText("Asset Settings").closest("form") || document.body;
      const allFocusableElements = tabOrderUtils.getFocusableElements(
        form as HTMLElement,
      );

      // Filter out elements with tabIndex={-1} since the utility doesn't exclude them for buttons
      const focusableElements = allFocusableElements.filter((element) => {
        const tabIndex = element.getAttribute("tabIndex");
        return tabIndex !== "-1";
      });

      // Find all tooltip trigger buttons
      const tooltipButtons = Array.from(
        document.querySelectorAll('button[aria-label="More information"]'),
      ) as HTMLElement[];

      // Verify tooltip buttons have tabIndex=-1
      tooltipButtons.forEach((tooltipButton) => {
        expect(tooltipButton).toHaveAttribute("tabIndex", "-1");
      });

      // Verify tooltip buttons are not in the focusable elements list (after filtering)
      tooltipButtons.forEach((tooltipButton) => {
        expect(focusableElements).not.toContain(tooltipButton);
      });
    });

    it("keyboard navigation flows directly between form fields", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Find form inputs
      const numberInputs = screen.getAllByRole("spinbutton");
      const widthInput = numberInputs.find((input) =>
        input.getAttribute("aria-describedby")?.includes("dimensions-error"),
      );
      if (!widthInput) throw new Error("Width input not found");

      // Focus first input
      await act(async () => {
        widthInput.focus();
      });

      expect(document.activeElement).toBe(widthInput);

      // Tab to next focusable element
      await act(async () => {
        keyboardUtils.tab();
      });

      // Find height input (should be the next input)
      const heightInput = numberInputs.find(
        (input) =>
          input
            .getAttribute("aria-describedby")
            ?.includes("dimensions-error") && input !== widthInput,
      );

      // Verify focus moved to next input, not to a tooltip button
      const activeElement = document.activeElement;
      expect(activeElement).not.toBeNull();

      // Verify we did not focus a tooltip button
      if (activeElement) {
        const isTooltipButton =
          activeElement.getAttribute("aria-label") === "More information";
        expect(isTooltipButton).toBe(false);
      }

      // If height input exists, verify focus is on it or another input
      if (heightInput && activeElement) {
        const isFormInput =
          activeElement.tagName.toLowerCase() === "input" ||
          activeElement.tagName.toLowerCase() === "select" ||
          activeElement.tagName.toLowerCase() === "textarea";
        expect(isFormInput).toBe(true);
      }
    });

    it("tooltips still appear on hover", async () => {
      // Since Radix Tooltip is mocked, we can't test actual tooltip display
      // But we can verify the tooltip structure is present and accessible
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Find tooltip trigger buttons
      const tooltipButtons = screen.getAllByLabelText("More information");

      // Verify tooltip buttons are present
      expect(tooltipButtons.length).toBeGreaterThan(0);

      // Verify tooltip buttons are clickable (not disabled)
      tooltipButtons.forEach((button) => {
        expect(button).not.toBeDisabled();
        expect(button).toBeInTheDocument();
      });

      // Simulate hover/click on tooltip button
      const firstTooltipButton = tooltipButtons[0];
      await act(async () => {
        fireEvent.mouseEnter(firstTooltipButton);
        fireEvent.click(firstTooltipButton);
      });

      // Verify button still exists and is interactive
      expect(firstTooltipButton).toBeInTheDocument();
      expect(firstTooltipButton).not.toBeDisabled();
    });

    it("focus order skips tooltip triggers when tabbing through form", async () => {
      render(
        <AssetSettingsForm
          spawnId="spawn1"
          spawnAssetId="asset1"
          onBack={mockOnBack}
        />,
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText("Test Video · video")).toBeInTheDocument();
      });

      // Get all focusable elements in tab order
      const form =
        screen.getByText("Asset Settings").closest("form") || document.body;
      const allFocusableElements = tabOrderUtils.getFocusableElements(
        form as HTMLElement,
      );

      // Filter out elements with tabIndex={-1} since the utility doesn't exclude them for buttons
      const focusableElements = allFocusableElements.filter((element) => {
        const tabIndex = element.getAttribute("tabIndex");
        return tabIndex !== "-1";
      });

      // Get all tooltip buttons
      const tooltipButtons = Array.from(
        document.querySelectorAll('button[aria-label="More information"]'),
      ) as HTMLElement[];

      // Verify tooltip buttons have tabIndex=-1
      tooltipButtons.forEach((tooltipButton) => {
        expect(tooltipButton).toHaveAttribute("tabIndex", "-1");
      });

      // Verify no tooltip buttons are in the focusable elements list (after filtering)
      const tooltipButtonsInTabOrder = focusableElements.filter((element) =>
        tooltipButtons.includes(element),
      );

      expect(tooltipButtonsInTabOrder.length).toBe(0);
    });
  });
});
