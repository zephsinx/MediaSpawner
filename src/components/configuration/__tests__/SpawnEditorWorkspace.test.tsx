import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import SpawnEditorWorkspace from "../SpawnEditorWorkspace";
import type { Spawn } from "../../../types/spawn";
import { createSpawn as createSpawnModel } from "../../../types/spawn";

// Mock SpawnService
vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getAllSpawns: vi.fn(),
    updateSpawn: vi.fn(),
    deleteSpawn: vi.fn(),
  },
}));
import { SpawnService } from "../../../services/spawnService";

// Provide a controllable mock for usePanelState
type MockPanelState = {
  selectedSpawnId: string | undefined;
  setUnsavedChanges: (b: boolean) => void;
  selectSpawn: (id: string | undefined) => void;
};
const mockState: MockPanelState = {
  selectedSpawnId: undefined,
  setUnsavedChanges: vi.fn(),
  selectSpawn: vi.fn((id?: string) => {
    mockState.selectedSpawnId = id;
  }),
};

vi.mock("../../../hooks/useLayout", () => ({
  usePanelState: () => ({
    selectedSpawnId: mockState.selectedSpawnId,
    setUnsavedChanges: mockState.setUnsavedChanges,
    selectSpawn: mockState.selectSpawn,
  }),
}));

const createSpawn = (overrides: Partial<Spawn> = {}): Spawn => {
  const base = createSpawnModel("Spawn One", "desc", [], "s1");
  return { ...base, ...overrides } as Spawn;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockState.selectedSpawnId = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SpawnEditorWorkspace", () => {
  it("shows guidance when no spawn selected", async () => {
    mockState.selectedSpawnId = undefined;
    render(<SpawnEditorWorkspace />);
    expect(
      screen.getByText("Select a spawn to edit its settings")
    ).toBeInTheDocument();
  });

  it("loads selected spawn and clears success message when selection changes", async () => {
    const a = createSpawn({ id: "a", name: "A" });
    const b = createSpawn({ id: "b", name: "B" });
    mockState.selectedSpawnId = "a";
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([a, b]);
    vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
      success: true,
      spawn: { ...a, name: "A2" },
    });

    const { rerender } = render(<SpawnEditorWorkspace />);

    // Wait for editor to show A
    expect(await screen.findByText("Editing: A")).toBeInTheDocument();

    // Change name to enable save
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Name"), {
        target: { value: "A2" },
      });
    });
    // Ensure input reflects change and Save becomes enabled
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "A2"
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save spawn" })
      ).not.toBeDisabled()
    );
    // Save -> sets success message
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save spawn" }));
    });
    expect(await screen.findByText("Changes saved")).toBeInTheDocument();

    // Change selection to B
    mockState.selectedSpawnId = "b";
    // Re-render to pick up new selectedSpawnId
    await act(async () => {
      rerender(<SpawnEditorWorkspace />);
    });

    expect(await screen.findByText("Editing: B")).toBeInTheDocument();
    // Success message cleared on new selection (allow async update)
    await waitFor(() => {
      expect(screen.queryByText("Changes saved")).not.toBeInTheDocument();
    });
  });

  it("cancel with dirty opens confirm, confirm resets fields; if selection removed before confirm, just closes", async () => {
    const a = createSpawn({ id: "a", name: "A", description: "d" });
    mockState.selectedSpawnId = "a";
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([a]);

    const viewCancel = render(<SpawnEditorWorkspace />);
    await screen.findByText("Editing: A");

    // Make dirty change
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Name"), {
        target: { value: "A changed" },
      });
    });

    // Ensure dirty state has propagated before triggering cancel
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save spawn" })
      ).not.toBeDisabled()
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel edits" }));
    });

    // Dialog appears
    const dialog = await screen.findByRole("dialog", {
      name: "Discard Unsaved Changes?",
    });

    // Case 1: selection present -> confirm resets fields
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput.value).toBe("A changed");
    // Click Discard changes
    await act(async () => {
      const buttons = dialog.querySelectorAll("button");
      (buttons[1] as HTMLButtonElement).click();
    });
    // Field reset back to original
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("A");

    // Open again and then remove selection before confirming; dialog should close automatically
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Name"), {
        target: { value: "A changed" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Cancel edits" }));
    });
    await screen.findByRole("dialog", { name: "Discard Unsaved Changes?" });
    mockState.selectedSpawnId = undefined;
    await act(async () => {
      viewCancel.rerender(<SpawnEditorWorkspace />);
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Discard Unsaved Changes?" })
      ).not.toBeInTheDocument();
    });
  });

  it("uses String(ms) fallback if toLocaleString throws in formatDate", async () => {
    const a = createSpawn({ id: "a", name: "A", lastModified: 12345 });
    mockState.selectedSpawnId = "a";
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([a]);

    const spy = vi
      .spyOn(Date.prototype, "toLocaleString")
      .mockImplementation(() => {
        throw new Error("boom");
      });

    render(<SpawnEditorWorkspace />);

    const input = await screen.findByLabelText("Last Modified");
    expect((input as HTMLInputElement).value).toBe("12345");

    spy.mockRestore();
  });

  it("shows fallback save error when updateSpawn rejects with non-Error", async () => {
    const a = createSpawn({ id: "a", name: "A" });
    mockState.selectedSpawnId = "a";
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([a]);
    vi.mocked(SpawnService.updateSpawn).mockRejectedValue("weird");

    render(<SpawnEditorWorkspace />);
    await screen.findByText("Editing: A");

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Name"), {
        target: { value: "A2" },
      });
    });
    // Ensure save becomes enabled before clicking
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "A2"
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save spawn" })
      ).not.toBeDisabled()
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save spawn" }));
    });

    expect(await screen.findByText("Failed to save spawn")).toBeInTheDocument();
  });

  it("delete confirm handles no selected spawn gracefully (no service call)", async () => {
    const a = createSpawn({ id: "a", name: "A" });
    mockState.selectedSpawnId = "a";
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([a]);

    const { rerender } = render(<SpawnEditorWorkspace />);
    await screen.findByText("Editing: A");

    // Open delete dialog
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Delete spawn" }));
    });
    await screen.findByRole("dialog", { name: "Delete Spawn?" });

    // Change selection to a different, missing id before confirming to hit null branch
    mockState.selectedSpawnId = "missing";
    await act(async () => {
      rerender(<SpawnEditorWorkspace />);
    });

    const dialog = await screen.findByRole("dialog", { name: "Delete Spawn?" });
    const del = vi.mocked(SpawnService.deleteSpawn);
    await act(async () => {
      const buttons = dialog.querySelectorAll("button");
      // Confirm button (text: Delete)
      (buttons[1] as HTMLButtonElement).click();
    });
    expect(del).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Delete Spawn?" })
      ).not.toBeInTheDocument();
    });
  });
});
