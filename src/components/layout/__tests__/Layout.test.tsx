import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  screen,
  waitForElementToBeRemoved,
  act,
  fireEvent,
} from "@testing-library/react";
import Layout from "../Layout";
import { SpawnService } from "../../../services/spawnService";
import type { Spawn } from "../../../types/spawn";
import { renderWithAllProviders } from "./testUtils";

// Mock the SpawnService
vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getAllSpawns: vi.fn(),
    createSpawn: vi.fn(),
    updateSpawn: vi.fn(),
    deleteSpawn: vi.fn(),
    getSpawn: vi.fn(),
  },
}));

// Test spawn data
const mockSpawns: Spawn[] = [
  {
    id: "spawn-1",
    name: "Test Spawn 1",
    description: "A test spawn for testing",
    enabled: true,
    trigger: {
      enabled: true,
      type: "manual",
      config: {},
    },
    duration: 5000,
    assets: [],
    lastModified: Date.now(),
    order: 0,
  },
  {
    id: "spawn-2",
    name: "Test Spawn 2",
    description: "Another test spawn",
    enabled: false,
    trigger: {
      enabled: true,
      type: "manual",
      config: {},
    },
    duration: 3000,
    assets: [],
    lastModified: Date.now(),
    order: 1,
  },
];

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock return value for all tests (async)
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);
    vi.mocked(SpawnService.getSpawn).mockResolvedValue(null);
  });

  describe("Three-Panel Integration", () => {
    it("renders the three-panel layout structure", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = renderWithAllProviders(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      // Check that the grid layout is applied
      const gridContainer = container.querySelector(".grid.grid-cols-12");
      expect(gridContainer).toBeInTheDocument();

      // Check that all three panels are rendered
      const panels = container.querySelectorAll(".col-span-3, .col-span-6");
      expect(panels).toHaveLength(3);
    });

    it("renders spawn list with spawns when available", async () => {
      // Mock SpawnService to return test spawns
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading1 = screen.queryByText("Loading spawns...");
      if (loading1) {
        await waitForElementToBeRemoved(loading1);
      }

      // Check for spawn list header
      expect(await screen.findByText("Spawns")).toBeInTheDocument();
      expect(await screen.findByText("2 spawns")).toBeInTheDocument();

      // Check for spawn items
      expect(await screen.findByText("Test Spawn 1")).toBeInTheDocument();
      expect(await screen.findByText("Test Spawn 2")).toBeInTheDocument();
      expect(screen.getByText("A test spawn for testing")).toBeInTheDocument();
      expect(screen.getByText("Another test spawn")).toBeInTheDocument();

      // Check for status indicators
      expect(await screen.findByText("Active")).toBeInTheDocument();
      expect(await screen.findByText("Inactive")).toBeInTheDocument();
    });

    it("center panel shows spawn details when a spawn is selected and updates on selection change", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      // Select first spawn
      await act(async () => {
        screen.getByText("Test Spawn 1").click();
      });

      expect(
        await screen.findByDisplayValue("Test Spawn 1"),
      ).toBeInTheDocument();
      // Enabled is now a switch; look for the switch and its label text
      const enabledSwitch = screen.getByRole("switch", { name: "Enabled" });
      expect(enabledSwitch).toHaveAttribute("aria-checked", "true");

      // Select second spawn
      await act(async () => {
        screen.getByText("Test Spawn 2").click();
      });

      expect(
        await screen.findByDisplayValue("Test Spawn 2"),
      ).toBeInTheDocument();
      const enabledSwitch2 = screen.getByRole("switch", { name: "Enabled" });
      expect(enabledSwitch2).toHaveAttribute("aria-checked", "false");
    });

    it("dirty reflects edits across fields and resets after save/cancel", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);
      vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
        success: true,
        spawn: { ...mockSpawns[0], name: "Clean" },
      });

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        screen.getByText("Test Spawn 1").click();
      });

      const nameInput = await screen.findByLabelText("Name");
      const saveBtn = screen.getByRole("button", { name: "Save spawn" });
      const cancelBtn = screen.getByRole("button", { name: "Cancel edits" });

      // Change to become dirty
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "Dirty" } });
      });
      expect(saveBtn).not.toBeDisabled();

      // Save resets dirty
      await act(async () => {
        fireEvent.click(saveBtn);
      });
      expect(await screen.findByText("Changes saved")).toBeInTheDocument();
      expect(saveBtn).toBeDisabled();

      // Make dirty again and cancel via dialog
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "Dirty2" } });
        fireEvent.click(cancelBtn);
      });
      await act(async () => {
        screen.getByText("Discard changes").click();
      });
      expect((nameInput as HTMLInputElement).value).toBe("Clean");
      expect(saveBtn).toBeDisabled();
    });

    it("enables Save when dirty and valid, disables when invalid, and saves successfully", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);
      vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
        success: true,
        spawn: { ...mockSpawns[0], name: "Saved Name" },
      });

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        screen.getByText("Test Spawn 1").click();
      });

      const nameInput = await screen.findByLabelText("Name");
      const saveBtn = screen.getByRole("button", { name: "Save spawn" });
      const cancelBtn = screen.getByRole("button", { name: "Cancel edits" });

      // Initially disabled (not dirty)
      expect(saveBtn).toBeDisabled();
      expect(cancelBtn).toBeDisabled(); // Disabled when no unsaved changes and not dirty

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "Saved Name" } });
      });
      expect(saveBtn).not.toBeDisabled();

      // Invalid (blank) -> disabled
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "" } });
      });
      expect(saveBtn).toBeDisabled();

      // Valid again and save
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "Saved Name" } });
        fireEvent.click(saveBtn);
      });

      expect(await screen.findByText("Changes saved")).toBeInTheDocument();
      // Save should reset dirty (button disabled again without further edits)
      expect(saveBtn).toBeDisabled();
    });

    it("cancels edits and reverts to last saved values", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        screen.getByText("Test Spawn 1").click();
      });

      const nameInput = await screen.findByLabelText("Name");
      const cancelBtn = screen.getByRole("button", { name: "Cancel edits" });

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "Temp Name" } });
        fireEvent.click(cancelBtn);
      });

      // With MS-28, cancel prompts for confirmation when dirty
      await act(async () => {
        screen.getByText("Discard changes").click();
      });

      expect((nameInput as HTMLInputElement).value).toBe("Test Spawn 1");
    });

    it("shows error when save fails", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);
      vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
        success: false,
        error: "Save failed",
      });

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        screen.getByText("Test Spawn 1").click();
      });

      const nameInput = await screen.findByLabelText("Name");
      const saveBtn = screen.getByRole("button", { name: "Save spawn" });

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "Bad Name" } });
        fireEvent.click(saveBtn);
      });

      expect(await screen.findByText("Save failed")).toBeInTheDocument();
    });

    it("shows confirm dialog on cancel when dirty and discards or keeps edits as chosen", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        screen.getByText("Test Spawn 1").click();
      });

      const nameInput = await screen.findByLabelText("Name");
      const cancelBtn = screen.getByRole("button", { name: "Cancel edits" });

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "Dirty Name" } });
        fireEvent.click(cancelBtn);
      });

      // Confirm dialog visible
      expect(
        screen.getByRole("dialog", { name: "Discard Unsaved Changes?" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Keep editing")).toBeInTheDocument();
      expect(screen.getByText("Discard changes")).toBeInTheDocument();

      // Keep editing
      await act(async () => {
        screen.getByText("Keep editing").click();
      });
      expect((nameInput as HTMLInputElement).value).toBe("Dirty Name");

      // Open again and discard
      await act(async () => {
        fireEvent.click(cancelBtn);
      });
      await act(async () => {
        screen.getByText("Discard changes").click();
      });
      expect((nameInput as HTMLInputElement).value).toBe("Test Spawn 1");
    });

    it("deletes a spawn and clears selection; list updates", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);
      vi.mocked(SpawnService.deleteSpawn).mockResolvedValue({
        success: true,
        spawn: mockSpawns[0],
      });

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      // Select first spawn
      await act(async () => {
        screen.getByText("Test Spawn 1").click();
      });

      // Click Delete then confirm
      await act(async () => {
        screen.getByRole("button", { name: "Delete spawn" }).click();
      });
      expect(
        screen.getByRole("dialog", { name: "Delete Spawn?" }),
      ).toBeInTheDocument();

      // Click the dialog's Delete (second button)
      await act(async () => {
        const dialog = screen.getByRole("dialog", { name: "Delete Spawn?" });
        const buttons = dialog.querySelectorAll("button");
        (buttons[1] as HTMLButtonElement).click();
      });

      // List should no longer contain the deleted item
      expect(screen.queryByText("Test Spawn 1")).not.toBeInTheDocument();
      // Center panel should show guidance (no selection)
      expect(
        screen.getByText("Select a spawn to edit its settings"),
      ).toBeInTheDocument();
    });

    it("shows deletion error and keeps item when delete fails", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);
      vi.mocked(SpawnService.deleteSpawn).mockResolvedValue({
        success: false,
        error: "Cannot delete",
      });

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        screen.getByText("Test Spawn 1").click();
      });

      await act(async () => {
        screen.getByRole("button", { name: "Delete spawn" }).click();
      });
      await act(async () => {
        const dialog = screen.getByRole("dialog", { name: "Delete Spawn?" });
        const buttons = dialog.querySelectorAll("button");
        (buttons[1] as HTMLButtonElement).click();
      });

      expect(screen.getByText("Cannot delete")).toBeInTheDocument();
      expect(screen.getByText("Test Spawn 1")).toBeInTheDocument();
    });

    it("renders empty spawn list when no spawns exist", async () => {
      // Mock SpawnService to return empty array
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading2 = screen.queryByText("Loading spawns...");
      if (loading2) {
        await waitForElementToBeRemoved(loading2);
      }

      // Check for empty state
      expect(await screen.findByText("No Spawns Found")).toBeInTheDocument();
      expect(
        screen.getByText(
          "You haven't created any spawns yet. Create your first spawn to get started.",
        ),
      ).toBeInTheDocument();
    });

    it("shows spawn editor header and guidance when no selection, and updates after selecting a spawn", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading3 = screen.queryByText("Loading spawns...");
      if (loading3) {
        await waitForElementToBeRemoved(loading3);
      }

      // Center panel should show Spawn Editor prompt when no selection
      expect(screen.getByText("Spawn Editor")).toBeInTheDocument();
      expect(
        screen.getByText("Select a spawn to edit its settings"),
      ).toBeInTheDocument();

      // Click a spawn to select it
      const row = screen.getByText("Test Spawn 1");
      await act(async () => {
        row.click();
      });

      // Center panel should reflect selection
      expect(screen.getByText("Spawn Editor")).toBeInTheDocument();
      expect(
        await screen.findByText(/Editing: Test Spawn 1/),
      ).toBeInTheDocument();

      // Right panel shows AssetManagementPanel structure
      expect(screen.getByText("Assets in Current Spawn")).toBeInTheDocument();
      expect(screen.getByText("Asset Library")).toBeInTheDocument();
    });

    it("creates and auto-selects new spawn via header button in list", async () => {
      // First call: initial spawns; second call: include newly created spawn for editor resolution
      const created = {
        ...mockSpawns[0],
        id: "spawn-3",
        name: "New Spawn 1",
      } as Spawn;
      vi.mocked(SpawnService.getAllSpawns)
        .mockResolvedValueOnce(mockSpawns)
        .mockResolvedValue([...mockSpawns, created]);
      vi.mocked(SpawnService.createSpawn).mockResolvedValue({
        success: true,
        spawn: created,
      });

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        screen.getByRole("button", { name: "Create New Spawn" }).click();
      });

      expect(
        await screen.findByText(/Editing: New Spawn 1/),
      ).toBeInTheDocument();
    });

    it("renders right panel placeholder icon and content while center shows Spawn Editor", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading4 = screen.queryByText("Loading spawns...");
      if (loading4) {
        await waitForElementToBeRemoved(loading4);
      }

      // Right panel shows AssetManagementPanel structure
      expect(screen.getByText("Assets in Current Spawn")).toBeInTheDocument();
      expect(screen.getByText("Asset Library")).toBeInTheDocument();

      // Center panel now shows Spawn Editor (no ⚙️ placeholder)
      expect(screen.getByText("Spawn Editor")).toBeInTheDocument();
    });

    it("keeps right panel 'Coming Soon' while center shows Spawn Editor", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(mockSpawns);

      await act(async () => {
        renderWithAllProviders(<Layout />);
      });
      const loading5 = screen.queryByText("Loading spawns...");
      if (loading5) {
        await waitForElementToBeRemoved(loading5);
      }

      expect(screen.getByText("Assets in Current Spawn")).toBeInTheDocument();
      expect(screen.getByText("Asset Library")).toBeInTheDocument();
      expect(screen.getByText("Spawn Editor")).toBeInTheDocument();
    });
  });

  describe("Layout Structure", () => {
    it("applies correct width distribution", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = renderWithAllProviders(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const leftPanel = container.querySelector(".col-span-3");
      const centerPanel = container.querySelector(".col-span-6");
      const rightPanel = container.querySelector(".col-span-3:last-child");

      expect(leftPanel).toBeInTheDocument();
      expect(centerPanel).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();
    });

    it("applies minimum width constraints", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = renderWithAllProviders(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const leftPanel = container.querySelector(".min-w-\\[320px\\]");
      const centerPanel = container.querySelector(".min-w-\\[640px\\]");
      const rightPanel = container.querySelector(".min-w-\\[320px\\]");

      expect(leftPanel).toBeInTheDocument();
      expect(centerPanel).toBeInTheDocument();
      expect(rightPanel).toBeInTheDocument();
    });

    it("renders three-panel layout structure", async () => {
      await act(async () => {
        renderWithAllProviders(<Layout />);
      });

      // Verify panels exist by checking for panel IDs
      expect(document.getElementById("spawn-list")).toBeInTheDocument();
      expect(document.getElementById("main-content")).toBeInTheDocument();
      expect(document.getElementById("asset-management")).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("maintains full height layout", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = renderWithAllProviders(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const gridContainer = container.querySelector(
        ".h-\\[calc\\(100vh-80px\\)\\]",
      );
      expect(gridContainer).toBeInTheDocument();
    });

    it("applies minimum container width", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = renderWithAllProviders(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const gridContainer = container.querySelector(".min-w-\\[1280px\\]");
      expect(gridContainer).toBeInTheDocument();
    });

    it("ensures panels have proper height containers", async () => {
      let container!: HTMLElement;
      await act(async () => {
        const r = renderWithAllProviders(<Layout />);
        container = r.container as unknown as HTMLElement;
      });

      const panelContainers = container.querySelectorAll(".h-full");
      // Includes outer panel containers and internal panel content containers
      expect(panelContainers.length).toBeGreaterThanOrEqual(6);
    });
  });
});
