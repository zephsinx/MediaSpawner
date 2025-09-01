import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import SpawnEditorWorkspace from "../SpawnEditorWorkspace";
import { usePanelState } from "../../../hooks/useLayout";
import { SpawnService } from "../../../services/spawnService";
import { getDefaultTrigger } from "../../../types/spawn";
import type { Spawn } from "../../../types/spawn";

// Mock dependencies
vi.mock("../../../hooks/useLayout");
vi.mock("../../../services/spawnService");

const mockUsePanelState = vi.mocked(usePanelState);
const mockSpawnService = vi.mocked(SpawnService);

// Test data
const mockSpawn: Spawn = {
  id: "spawn-1",
  name: "Test Spawn",
  description: "Test Description",
  enabled: true,
  trigger: getDefaultTrigger("manual"),
  duration: 0,
  assets: [],
  lastModified: Date.now(),
  order: 0,
};

const mockChannelPointSpawn: Spawn = {
  ...mockSpawn,
  trigger: getDefaultTrigger("twitch.channelPointReward"),
};

describe("SpawnEditorWorkspace - MS-53 Channel Point Reward Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUsePanelState.mockReturnValue({
      activeProfileId: "profile-1",
      selectedSpawnId: "spawn-1",
      selectedSpawnAssetId: undefined,
      centerPanelMode: "spawn-settings",
      setUnsavedChanges: vi.fn(),
      hasUnsavedChanges: false,
      profileSpawnSelections: {},
      setActiveProfile: vi.fn(),
      selectSpawn: vi.fn(),
      setCenterPanelMode: vi.fn(),
      selectSpawnAsset: vi.fn(),
      clearContext: vi.fn(),
    });

    mockSpawnService.getAllSpawns.mockResolvedValue([mockSpawn]);
  });

  describe("1. Channel Point Reward Configuration Section Visibility", () => {
    it("shows channel point reward configuration section when trigger type is twitch.channelPointReward", async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockChannelPointSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Channel Point Reward Configuration")
        ).toBeInTheDocument();
      });
    });

    it("hides channel point reward configuration section for manual trigger type", async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Channel Point Reward Configuration")
        ).not.toBeInTheDocument();
      });
    });

    it("hides channel point reward configuration section for other trigger types", async () => {
      const commandSpawn = {
        ...mockSpawn,
        trigger: getDefaultTrigger("streamerbot.command"),
      };
      mockSpawnService.getAllSpawns.mockResolvedValue([commandSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Channel Point Reward Configuration")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("2. Default Values & Initial State", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockChannelPointSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Channel Point Reward Configuration")
        ).toBeInTheDocument();
      });
    });

    it("starts with empty reward identifier field", () => {
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );
      expect(rewardInput).toHaveValue("");
    });

    it("has useViewerInput defaulting to false", () => {
      const useViewerInputCheckbox = screen.getByRole("checkbox", {
        name: /use viewer input in spawn configuration/i,
      });
      expect(useViewerInputCheckbox).not.toBeChecked();
    });

    it("has fulfilled status selected by default", () => {
      const fulfilledCheckbox = screen.getByRole("checkbox", {
        name: /fulfilled/i,
      });
      expect(fulfilledCheckbox).toBeChecked();
    });

    it("has pending and cancelled statuses unchecked by default", () => {
      const pendingCheckbox = screen.getByRole("checkbox", {
        name: /pending/i,
      });
      const cancelledCheckbox = screen.getByRole("checkbox", {
        name: /cancelled/i,
      });

      expect(pendingCheckbox).not.toBeChecked();
      expect(cancelledCheckbox).not.toBeChecked();
    });
  });

  describe("3. Reward Identifier Configuration", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockChannelPointSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Channel Point Reward Configuration")
        ).toBeInTheDocument();
      });
    });

    it("can enter reward identifier and updates input value", () => {
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );

      act(() => {
        fireEvent.change(rewardInput, { target: { value: "Alert" } });
      });

      expect(rewardInput).toHaveValue("Alert");
    });

    it("shows error when reward identifier is empty", () => {
      // Default state should show error since field is empty
      expect(
        screen.getByText("Reward identifier is required")
      ).toBeInTheDocument();
    });

    it("hides error when reward identifier has content", () => {
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );

      act(() => {
        fireEvent.change(rewardInput, { target: { value: "Alert" } });
      });

      expect(
        screen.queryByText("Reward identifier is required")
      ).not.toBeInTheDocument();
    });

    it("displays help text explaining reward identification requirements", () => {
      expect(
        screen.getByText(
          "Enter the name or ID of the channel point reward from your Twitch channel"
        )
      ).toBeInTheDocument();
    });
  });

  describe("4. Viewer Input Configuration", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockChannelPointSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Channel Point Reward Configuration")
        ).toBeInTheDocument();
      });
    });

    it("can toggle useViewerInput checkbox", () => {
      const useViewerInputCheckbox = screen.getByRole("checkbox", {
        name: /use viewer input in spawn configuration/i,
      });

      act(() => {
        fireEvent.click(useViewerInputCheckbox);
      });

      expect(useViewerInputCheckbox).toBeChecked();
    });

    it("displays help text explaining viewer input functionality", () => {
      expect(
        screen.getByText(
          "When enabled, the viewer's message will be available for use in spawn settings"
        )
      ).toBeInTheDocument();
    });
  });

  describe("5. Redemption Status Configuration", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockChannelPointSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Channel Point Reward Configuration")
        ).toBeInTheDocument();
      });
    });

    it("can select multiple redemption statuses", () => {
      const pendingCheckbox = screen.getByRole("checkbox", {
        name: /pending/i,
      });
      const fulfilledCheckbox = screen.getByRole("checkbox", {
        name: /fulfilled/i,
      });
      const cancelledCheckbox = screen.getByRole("checkbox", {
        name: /cancelled/i,
      });

      // Start with only fulfilled selected
      expect(fulfilledCheckbox).toBeChecked();
      expect(pendingCheckbox).not.toBeChecked();
      expect(cancelledCheckbox).not.toBeChecked();

      // Select pending
      act(() => {
        fireEvent.click(pendingCheckbox);
      });

      expect(pendingCheckbox).toBeChecked();
      expect(fulfilledCheckbox).toBeChecked();
      expect(cancelledCheckbox).not.toBeChecked();
    });

    it("can deselect redemption statuses", () => {
      const fulfilledCheckbox = screen.getByRole("checkbox", {
        name: /fulfilled/i,
      });

      // Start with fulfilled selected
      expect(fulfilledCheckbox).toBeChecked();

      // Deselect fulfilled
      act(() => {
        fireEvent.click(fulfilledCheckbox);
      });

      expect(fulfilledCheckbox).not.toBeChecked();
    });

    it("shows error when no redemption statuses are selected", () => {
      const fulfilledCheckbox = screen.getByRole("checkbox", {
        name: /fulfilled/i,
      });

      // Deselect the only selected status
      act(() => {
        fireEvent.click(fulfilledCheckbox);
      });

      expect(
        screen.getByText("At least one redemption status must be selected")
      ).toBeInTheDocument();
    });

    it("hides error when at least one status is selected", () => {
      const fulfilledCheckbox = screen.getByRole("checkbox", {
        name: /fulfilled/i,
      });
      const pendingCheckbox = screen.getByRole("checkbox", {
        name: /pending/i,
      });

      // Deselect fulfilled and select pending
      act(() => {
        fireEvent.click(fulfilledCheckbox);
        fireEvent.click(pendingCheckbox);
      });

      expect(
        screen.queryByText("At least one redemption status must be selected")
      ).not.toBeInTheDocument();
    });

    it("displays help text explaining redemption status selection", () => {
      expect(
        screen.getByText(
          "Select which redemption statuses should trigger this spawn"
        )
      ).toBeInTheDocument();
    });
  });

  describe("6. Help Text and Information", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockChannelPointSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Channel Point Reward Configuration")
        ).toBeInTheDocument();
      });
    });

    it("displays note about Twitch handling reward logic", () => {
      expect(
        screen.getByText(
          "Twitch handles all reward logic including cooldowns, usage limits, and point costs. MediaSpawner only configures when spawns trigger based on redemption events."
        )
      ).toBeInTheDocument();
    });

    it("help text is styled appropriately in blue info box", () => {
      const helpBox = screen
        .getByText(
          "Twitch handles all reward logic including cooldowns, usage limits, and point costs. MediaSpawner only configures when spawns trigger based on redemption events."
        )
        .closest("div");

      expect(helpBox).toHaveClass("bg-blue-50", "border-blue-200");
    });
  });

  describe("7. Validation & Save Behavior", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockChannelPointSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Channel Point Reward Configuration")
        ).toBeInTheDocument();
      });
    });

    it("keeps Save disabled while reward identifier is invalid", () => {
      // Default state: empty reward identifier -> error visible
      expect(
        screen.getByText("Reward identifier is required")
      ).toBeInTheDocument();

      const saveButton = screen.getByRole("button", { name: "Save spawn" });
      expect(saveButton).toBeDisabled();
    });

    it("enables Save when reward identifier becomes valid and form is dirty", () => {
      // Enter a valid reward identifier
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );
      act(() => {
        fireEvent.change(rewardInput, { target: { value: "Alert" } });
      });

      // Make form dirty via description change
      const descriptionInput = screen.getByLabelText("Description");
      act(() => {
        fireEvent.change(descriptionInput, { target: { value: "Changed" } });
      });

      const saveButton = screen.getByRole("button", { name: "Save spawn" });
      expect(saveButton).not.toBeDisabled();
    });

    it("re-disables Save when reward identifier is cleared back to invalid while dirty", () => {
      // Start with valid reward identifier and dirty form
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );
      act(() => {
        fireEvent.change(rewardInput, { target: { value: "Alert" } });
      });

      const descriptionInput = screen.getByLabelText("Description");
      act(() => {
        fireEvent.change(descriptionInput, { target: { value: "Changed" } });
      });

      const saveButton = screen.getByRole("button", { name: "Save spawn" });
      expect(saveButton).not.toBeDisabled();

      // Clear reward identifier back to empty -> should re-disable Save
      act(() => {
        fireEvent.change(rewardInput, { target: { value: "" } });
      });

      expect(
        screen.getByText("Reward identifier is required")
      ).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it("keeps Save disabled while no redemption statuses are selected", () => {
      // Ensure at least one status is selected initially
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );
      act(() => {
        fireEvent.change(rewardInput, { target: { value: "Alert" } });
      });

      // Deselect all statuses
      const fulfilledCheckbox = screen.getByRole("checkbox", {
        name: /fulfilled/i,
      });
      act(() => {
        fireEvent.click(fulfilledCheckbox);
      });

      expect(
        screen.getByText("At least one redemption status must be selected")
      ).toBeInTheDocument();

      const saveButton = screen.getByRole("button", { name: "Save spawn" });
      expect(saveButton).toBeDisabled();
    });
  });

  describe("8. Configuration Persistence", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockChannelPointSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Channel Point Reward Configuration")
        ).toBeInTheDocument();
      });
    });

    it("saves channel point reward configuration correctly", async () => {
      mockSpawnService.updateSpawn.mockResolvedValue({
        success: true,
        spawn: mockChannelPointSpawn,
      });

      // Configure the trigger
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );
      const useViewerInputCheckbox = screen.getByRole("checkbox", {
        name: /use viewer input in spawn configuration/i,
      });
      const pendingCheckbox = screen.getByRole("checkbox", {
        name: /pending/i,
      });

      act(() => {
        fireEvent.change(rewardInput, { target: { value: "Alert" } });
        fireEvent.click(useViewerInputCheckbox);
        fireEvent.click(pendingCheckbox);
      });

      // Save the configuration
      const saveButton = screen.getByRole("button", { name: "Save spawn" });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(mockSpawnService.updateSpawn).toHaveBeenCalledWith(
        "spawn-1",
        expect.objectContaining({
          name: "Test Spawn",
          description: "Test Description",
          trigger: expect.objectContaining({
            type: "twitch.channelPointReward",
            enabled: true,
            config: {
              rewardIdentifier: "Alert",
              useViewerInput: true,
              statuses: ["fulfilled", "pending"],
            },
          }),
          defaultProperties: {},
        })
      );
    });
  });

  describe("9. Edge Cases and Error Handling", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockChannelPointSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Channel Point Reward Configuration")
        ).toBeInTheDocument();
      });
    });

    it("handles very long reward identifiers", () => {
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );
      const longIdentifier = "a".repeat(1000);

      act(() => {
        fireEvent.change(rewardInput, { target: { value: longIdentifier } });
      });

      expect(rewardInput).toHaveValue(longIdentifier);
      expect(
        screen.queryByText("Reward identifier is required")
      ).not.toBeInTheDocument();
    });

    it("handles special characters in reward identifiers", () => {
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );
      const specialIdentifier = "Alert!@#$%^&*()_+-=[]{}|;':\",./<>?";

      act(() => {
        fireEvent.change(rewardInput, { target: { value: specialIdentifier } });
      });

      expect(rewardInput).toHaveValue(specialIdentifier);
      expect(
        screen.queryByText("Reward identifier is required")
      ).not.toBeInTheDocument();
    });

    it("handles whitespace-only reward identifiers as invalid", () => {
      const rewardInput = screen.getByPlaceholderText(
        "Enter reward name or ID (e.g., Alert, Scene1, 12345)"
      );

      act(() => {
        fireEvent.change(rewardInput, { target: { value: "   " } });
      });

      expect(
        screen.getByText("Reward identifier is required")
      ).toBeInTheDocument();
    });
  });
});
