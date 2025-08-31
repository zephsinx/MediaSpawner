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
import {
  createSpawn as createSpawnModel,
  getDefaultTrigger,
} from "../../../types/spawn";

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

    // Wait for editor to show A and the Name input to be populated
    expect(await screen.findByText("Editing: A")).toBeInTheDocument();
    const initialNameInput = await screen.findByLabelText("Name");
    await waitFor(() =>
      expect((initialNameInput as HTMLInputElement).value).toBe("A")
    );

    // Change name to enable save
    await act(async () => {
      const nameInput = screen.getByLabelText("Name");
      fireEvent.input(nameInput, { target: { value: "A2" } });
    });
    // Ensure input reflects change and Save becomes enabled (allow async state to settle)
    await waitFor(() =>
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
        "A2"
      )
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

    // Ensure input reflects change and Save becomes enabled
    await waitFor(() =>
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
        "A changed"
      )
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save spawn" })).toBeEnabled()
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

  describe("MS-54 Event & Time-based triggers", () => {
    it("renders Subscription config and updates tier and months with comparator", async () => {
      const subSpawn = createSpawn({
        id: "s-sub",
        name: "Sub Spawn",
        trigger: getDefaultTrigger("twitch.subscription"),
      });
      mockState.selectedSpawnId = "s-sub";
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([subSpawn]);

      render(<SpawnEditorWorkspace />);
      await screen.findByText("Editing: Sub Spawn");

      // Ensure trigger type is initialized to subscription
      const typeSelect = screen.getByLabelText(
        "Trigger Type"
      ) as HTMLSelectElement;
      await waitFor(() => expect(typeSelect.value).toBe("twitch.subscription"));

      expect(
        await screen.findByText("Subscription Configuration")
      ).toBeInTheDocument();

      // Set tier to Tier 2
      const tierSelect = screen.getByLabelText("Tier") as HTMLSelectElement;
      await act(async () => {
        fireEvent.change(tierSelect, { target: { value: "2000" } });
      });
      expect(tierSelect.value).toBe("2000");

      // Set months comparator and months
      const comp = screen.getByLabelText(
        "Months Comparator"
      ) as HTMLSelectElement;
      await act(async () => {
        fireEvent.change(comp, { target: { value: "gt" } });
      });
      const months = screen.getByLabelText("Months") as HTMLInputElement;
      await act(async () => {
        fireEvent.change(months, { target: { value: "3" } });
      });
      expect(comp.value).toBe("gt");
      expect(months.value).toBe("3");
    });

    it("renders Gifted Subs config and updates minCount and tier", async () => {
      const giftSpawn = createSpawn({
        id: "s-gift",
        name: "Gift Spawn",
        trigger: getDefaultTrigger("twitch.giftSub"),
      });
      mockState.selectedSpawnId = "s-gift";
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([giftSpawn]);

      render(<SpawnEditorWorkspace />);
      await screen.findByText("Editing: Gift Spawn");

      const typeSelect = screen.getByLabelText(
        "Trigger Type"
      ) as HTMLSelectElement;
      await waitFor(() => expect(typeSelect.value).toBe("twitch.giftSub"));

      expect(
        await screen.findByText("Gifted Subs Configuration")
      ).toBeInTheDocument();

      const minCount = screen.getByLabelText(
        "Minimum Count"
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(minCount, { target: { value: "5" } });
      });
      expect(minCount.value).toBe("5");

      const tier = screen.getByLabelText("Tier") as HTMLSelectElement;
      await act(async () => {
        fireEvent.change(tier, { target: { value: "1000" } });
      });
      expect(tier.value).toBe("1000");
    });

    it("renders Cheer config and updates bits with comparator", async () => {
      const cheerSpawn = createSpawn({
        id: "s-cheer",
        name: "Cheer Spawn",
        trigger: getDefaultTrigger("twitch.cheer"),
      });
      mockState.selectedSpawnId = "s-cheer";
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([cheerSpawn]);

      render(<SpawnEditorWorkspace />);
      await screen.findByText("Editing: Cheer Spawn");

      const typeSelect = screen.getByLabelText(
        "Trigger Type"
      ) as HTMLSelectElement;
      await waitFor(() => expect(typeSelect.value).toBe("twitch.cheer"));

      expect(
        await screen.findByText("Cheer Configuration")
      ).toBeInTheDocument();
      const comp = screen.getByLabelText(
        "Bits Comparator"
      ) as HTMLSelectElement;
      await act(async () => {
        fireEvent.change(comp, { target: { value: "eq" } });
      });
      const bits = screen.getByLabelText("Bits") as HTMLInputElement;
      await act(async () => {
        fireEvent.change(bits, { target: { value: "50" } });
      });
      expect(comp.value).toBe("eq");
      expect(bits.value).toBe("50");
    });

    it("renders Daily time-based config and shows Next activation", async () => {
      const timeSpawn = createSpawn({
        id: "s-time",
        name: "Time Spawn",
        trigger: getDefaultTrigger("time.dailyAt"),
      });
      mockState.selectedSpawnId = "s-time";
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([timeSpawn]);

      render(<SpawnEditorWorkspace />);
      await screen.findByText("Editing: Time Spawn");

      const typeSelect = screen.getByLabelText(
        "Trigger Type"
      ) as HTMLSelectElement;
      await waitFor(() => expect(typeSelect.value).toBe("time.dailyAt"));

      expect(
        await screen.findByText("Time-based Configuration")
      ).toBeInTheDocument();
      // Next activation banner present
      expect(screen.getByText(/Next activation:/i)).toBeInTheDocument();

      // Update HH:mm
      const timeInput = screen.getByLabelText(
        "Time (HH:mm)"
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(timeInput, { target: { value: "12:30" } });
      });
      expect(timeInput.value).toBe("12:30");
    });

    it("renders Weekly and Monthly panels and toggles Trigger Enabled", async () => {
      const weeklySpawn = createSpawn({
        id: "s-week",
        name: "Weekly Spawn",
        trigger: {
          type: "time.weeklyAt",
          enabled: true,
          config: { dayOfWeek: 1, time: "09:00", timezone: "UTC" },
        } as unknown as import("../../../types/spawn").Trigger,
      });
      mockState.selectedSpawnId = "s-week";
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([weeklySpawn]);

      render(<SpawnEditorWorkspace />);
      await screen.findByText("Editing: Weekly Spawn");
      const typeSelect = screen.getByLabelText(
        "Trigger Type"
      ) as HTMLSelectElement;
      await waitFor(() => expect(typeSelect.value).toBe("time.weeklyAt"));
      expect(screen.getByText("Time-based Configuration")).toBeInTheDocument();
      // Trigger Enabled toggle present
      const enabledToggle = screen.getByRole("checkbox", {
        name: "Trigger Enabled",
      });
      expect(enabledToggle).toBeChecked();

      // Switch to Monthly and ensure panel renders
      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: "time.monthlyOn" } });
      });
      // Confirm dialog appears, confirm change
      const dialog = await screen.findByRole("dialog", {
        name: "Change Trigger Type?",
      });
      const buttons = dialog.querySelectorAll("button");
      await act(async () => {
        (buttons[1] as HTMLButtonElement).click();
      });
      await waitFor(() => expect(typeSelect.value).toBe("time.monthlyOn"));
      expect(screen.getByText("Time-based Configuration")).toBeInTheDocument();
    });

    it("disables Save and shows field error when dailyAt time invalid", async () => {
      const timeSpawn = createSpawn({
        id: "s-time2",
        name: "Time Spawn 2",
        trigger: getDefaultTrigger("time.dailyAt"),
      });
      mockState.selectedSpawnId = "s-time2";
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([timeSpawn]);

      render(<SpawnEditorWorkspace />);
      await screen.findByText("Editing: Time Spawn 2");

      const typeSelect = screen.getByLabelText(
        "Trigger Type"
      ) as HTMLSelectElement;
      await waitFor(() => expect(typeSelect.value).toBe("time.dailyAt"));

      const timeInput = screen.getByLabelText(
        "Time (HH:mm)"
      ) as HTMLInputElement;
      await act(async () => {
        fireEvent.change(timeInput, { target: { value: "9:3" } });
      });

      // Error message from validation should render
      expect(
        await screen.findByText("Time must be HH:mm (24-hour)")
      ).toBeInTheDocument();

      // Save should be disabled
      const saveButton = screen.getByRole("button", { name: "Save spawn" });
      expect(saveButton).toBeDisabled();
    });
  });
});
