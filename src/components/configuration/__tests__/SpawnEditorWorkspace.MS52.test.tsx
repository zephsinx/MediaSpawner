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
          screen.queryByText("Command Configuration")
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
          screen.queryByText("Command Configuration")
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
        "Enter command alias (e.g., scene1, alert)"
      );
      expect(aliasInputs).toHaveLength(1);
      expect(aliasInputs[0]).toHaveValue("");
    });

    it("has case sensitivity defaulting to false", () => {
      const caseSensitiveCheckbox = screen.getByRole("checkbox", {
        name: /case sensitive/i,
      });
      expect(caseSensitiveCheckbox).not.toBeChecked();
    });

    it("has Twitch selected as default platform source", () => {
      const twitchCheckbox = screen.getByRole("checkbox", { name: /Twitch/i });
      expect(twitchCheckbox).toBeChecked();
    });

    it("has filtering options defaulting to true", () => {
      const ignoreInternalCheckbox = screen.getByRole("checkbox", {
        name: /Ignore internal messages/i,
      });
      const ignoreBotAccountCheckbox = screen.getByRole("checkbox", {
        name: /Ignore bot account messages/i,
      });

      expect(ignoreInternalCheckbox).toBeChecked();
      expect(ignoreBotAccountCheckbox).toBeChecked();
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
        "Enter command alias (e.g., scene1, alert)"
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
        "Enter command alias (e.g., scene1, alert)"
      )[0];
      act(() => {
        fireEvent.change(firstInput, { target: { value: "test" } });
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
        "Enter command alias (e.g., scene1, alert)"
      );
      expect(aliasInputs).toHaveLength(1);
    });

    it("updates input values when typing", () => {
      const aliasInput = screen.getByPlaceholderText(
        "Enter command alias (e.g., scene1, alert)"
      );

      act(() => {
        fireEvent.change(aliasInput, { target: { value: "testcommand" } });
      });

      expect(aliasInput).toHaveValue("testcommand");
    });
  });
});
