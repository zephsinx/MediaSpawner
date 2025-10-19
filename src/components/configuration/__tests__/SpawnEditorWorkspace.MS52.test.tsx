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
  duration: 5000,
  assets: [],
  lastModified: Date.now(),
  order: 0,
};

const mockCommandSpawn: Spawn = {
  ...mockSpawn,
  trigger: getDefaultTrigger("streamerbot.command"),
};

describe("SpawnEditorWorkspace - MS-52 Command Trigger Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUsePanelState.mockReturnValue({
      activeProfileId: "profile-1",
      liveProfileId: undefined,
      selectedSpawnId: "spawn-1",
      selectedSpawnAssetId: undefined,
      centerPanelMode: "spawn-settings",
      setUnsavedChanges: vi.fn(),
      hasUnsavedChanges: false,
      changeType: "none",
      profileSpawnSelections: {},
      setActiveProfile: vi.fn(),
      setLiveProfile: vi.fn(),
      selectSpawn: vi.fn(),
      setCenterPanelMode: vi.fn(),
      selectSpawnAsset: vi.fn(),
      clearContext: vi.fn(),
    });

    mockSpawnService.getAllSpawns.mockResolvedValue([mockSpawn]);
  });

  describe("1. Command Configuration Section Visibility", () => {
    it("shows command configuration section when trigger type is streamerbot.command", async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockCommandSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(screen.getByText("Command Configuration")).toBeInTheDocument();
      });
    });

    it("hides command configuration section for manual trigger type", async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Command Configuration"),
        ).not.toBeInTheDocument();
      });
    });

    it("hides command configuration section for other trigger types", async () => {
      const twitchSpawn = {
        ...mockSpawn,
        trigger: getDefaultTrigger("twitch.follow"),
      };
      mockSpawnService.getAllSpawns.mockResolvedValue([twitchSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Command Configuration"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("2. Default Values & Initial State", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockCommandSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(screen.getByText("Command Configuration")).toBeInTheDocument();
      });
    });

    it("starts with one empty alias input field", () => {
      const aliasInputs = screen.getAllByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)",
      );
      expect(aliasInputs).toHaveLength(1);
      expect(aliasInputs[0]).toHaveValue("");
    });

    it("has case sensitivity defaulting to false", () => {
      const caseSensitiveCheckbox = screen.getByRole("switch", {
        name: /case sensitive/i,
      });
      expect(caseSensitiveCheckbox).not.toHaveAttribute("aria-checked", "true");
    });

    // Platform sources removed (Twitch-only support); no checkbox expected

    it("has filtering options with correct defaults", () => {
      const ignoreInternalCheckbox = screen.getByRole("switch", {
        name: /Ignore internal messages/i,
      });
      const ignoreBotAccountCheckbox = screen.getByRole("switch", {
        name: /Ignore bot account messages/i,
      });

      expect(ignoreInternalCheckbox).toHaveAttribute("aria-checked", "false");
      expect(ignoreBotAccountCheckbox).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("3. Basic Alias Management", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockCommandSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(screen.getByText("Command Configuration")).toBeInTheDocument();
      });
    });

    it("can add new alias with + Add Alias button", () => {
      const addButton = screen.getByRole("button", { name: "+ Add Alias" });

      act(() => {
        fireEvent.click(addButton);
      });

      const aliasInputs = screen.getAllByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)",
      );
      expect(aliasInputs).toHaveLength(2);
    });

    it("can remove alias but maintains minimum of 1", () => {
      // First add an alias
      const addButton = screen.getByRole("button", { name: "+ Add Alias" });
      act(() => {
        fireEvent.click(addButton);
      });

      // Fill in the first alias so remove button appears
      const firstInput = screen.getAllByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)",
      )[0];
      act(() => {
        fireEvent.change(firstInput, { target: { value: "test" } });
        // Close the Headless UI combobox so sibling buttons are accessible
        fireEvent.keyDown(firstInput, { key: "Escape" });
        fireEvent.blur(firstInput);
        fireEvent.click(document.body);
      });

      // Now remove button should appear for the second alias
      const removeButtons = screen.getAllByRole("button", {
        name: "Remove command alias",
      });
      expect(removeButtons).toHaveLength(2); // Should have 2 remove buttons for 2 aliases

      // Click the second remove button (for the second alias)
      act(() => {
        fireEvent.click(removeButtons[1]);
      });

      // Should be back to 1 input
      const aliasInputs = screen.getAllByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)",
      );
      expect(aliasInputs).toHaveLength(1);
    });

    it("updates input values when typing", () => {
      const aliasInput = screen.getByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)",
      );

      act(() => {
        fireEvent.change(aliasInput, { target: { value: "testcommand" } });
      });

      expect(aliasInput).toHaveValue("testcommand");
    });
  });

  describe("4. Validation & Save Behavior", () => {
    beforeEach(async () => {
      mockSpawnService.getAllSpawns.mockResolvedValue([mockCommandSpawn]);

      await act(async () => {
        render(<SpawnEditorWorkspace />);
      });

      await waitFor(() => {
        expect(screen.getByText("Command Configuration")).toBeInTheDocument();
      });
    });

    it("shows alias error when no non-empty aliases exist, hides when valid alias entered", () => {
      // Default state: one empty alias present -> error visible
      expect(
        screen.getByText("At least one command alias is required"),
      ).toBeInTheDocument();

      const aliasInput = screen.getByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)",
      );

      act(() => {
        fireEvent.change(aliasInput, { target: { value: "command1" } });
      });

      expect(
        screen.queryByText("At least one command alias is required"),
      ).not.toBeInTheDocument();
    });

    it("keeps Save disabled while alias invalid even when form is dirty (expected behavior)", () => {
      // Ensure alias is invalid (empty)
      const aliasInput = screen.getByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)",
      );
      expect((aliasInput as HTMLInputElement).value).toBe("");
      expect(
        screen.getByText("At least one command alias is required"),
      ).toBeInTheDocument();

      // Make form dirty via description change (name remains valid)
      const descriptionInput = screen.getByLabelText("Description");
      act(() => {
        fireEvent.change(descriptionInput, { target: { value: "Changed" } });
      });

      const saveButton = screen.getByRole("button", { name: "Save spawn" });
      // Expectation: Save should be disabled while alias invalid
      expect(saveButton).toBeDisabled();
    });

    it("enables Save when alias becomes valid and form is dirty", () => {
      // Enter a valid alias
      const aliasInput = screen.getByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)",
      );
      act(() => {
        fireEvent.change(aliasInput, { target: { value: "command1" } });
        // Close combobox before querying other controls
        fireEvent.keyDown(aliasInput, { key: "Escape" });
        fireEvent.blur(aliasInput);
        fireEvent.click(document.body);
      });

      // Make form dirty via description change
      const descriptionInput = screen.getByLabelText("Description");
      act(() => {
        fireEvent.change(descriptionInput, { target: { value: "Changed" } });
      });

      const saveButton = screen.getByRole("button", { name: "Save spawn" });
      expect(saveButton).not.toBeDisabled();
    });

    it("re-disables Save when alias is cleared back to invalid while dirty", () => {
      // Start with valid alias and dirty form
      const aliasInput = screen.getByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)",
      );
      act(() => {
        fireEvent.change(aliasInput, { target: { value: "command1" } });
        fireEvent.keyDown(aliasInput, { key: "Escape" });
        fireEvent.blur(aliasInput);
        fireEvent.click(document.body);
      });
      const descriptionInput = screen.getByLabelText("Description");
      act(() => {
        fireEvent.change(descriptionInput, { target: { value: "Changed" } });
      });
      const saveButton = screen.getByRole("button", { name: "Save spawn" });
      expect(saveButton).not.toBeDisabled();

      // Clear alias back to empty -> should re-disable Save
      act(() => {
        fireEvent.change(aliasInput, { target: { value: "" } });
        fireEvent.keyDown(aliasInput, { key: "Escape" });
        fireEvent.blur(aliasInput);
        fireEvent.click(document.body);
      });
      expect(
        screen.getByText("At least one command alias is required"),
      ).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });
});
