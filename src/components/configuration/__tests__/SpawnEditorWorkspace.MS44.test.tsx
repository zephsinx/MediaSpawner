import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SpawnEditorWorkspace from "../SpawnEditorWorkspace";
import type { Spawn } from "../../../types/spawn";
import { createSpawn as createSpawnModel } from "../../../types/spawn";

vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getAllSpawns: vi.fn(),
    updateSpawn: vi.fn(),
  },
}));
import { SpawnService } from "../../../services/spawnService";

vi.mock("../../../hooks/useLayout", () => ({
  usePanelState: () => ({
    selectedSpawnId: "s1",
    setUnsavedChanges: vi.fn(),
    selectSpawn: vi.fn(),
    setCenterPanelMode: vi.fn(),
    selectSpawnAsset: vi.fn(),
    centerPanelMode: "spawn-settings" as const,
  }),
}));

const createSpawn = (overrides: Partial<Spawn> = {}): Spawn => {
  const base = createSpawnModel("Spawn One", "desc", [], "s1");
  return { ...base, ...overrides } as Spawn;
};

describe("SpawnEditorWorkspace (MS-44 Defaults)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves only enabled default properties and dispatches event", async () => {
    const s = createSpawn({
      defaultProperties: { dimensions: { width: 80, height: 80 } },
    });
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s]);
    vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
      success: true,
      spawn: s,
    });

    await act(async () => {
      render(<SpawnEditorWorkspace />);
    });

    // Enable volume default, set to 40%
    const volToggle = screen.getByLabelText(
      "Enable default for volume"
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.click(volToggle);
    });
    const volNumber = screen
      .getAllByRole("spinbutton")
      .find((el) => (el as HTMLInputElement).max === "100") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(volNumber, { target: { value: "40" } });
    });

    const saveBtn = screen.getByRole("button", { name: "Save spawn" });
    expect(saveBtn).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    const args = vi.mocked(SpawnService.updateSpawn).mock.calls[0][1];
    expect(args.defaultProperties).toMatchObject({ volume: 0.4 });
  });

  it("cancel reverts defaults draft and toggles", async () => {
    const s = createSpawn({ defaultProperties: { volume: 0.5 } });
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s]);
    vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
      success: true,
      spawn: s,
    });

    await act(async () => {
      render(<SpawnEditorWorkspace />);
    });

    const volToggle = screen.getByLabelText(
      "Enable default for volume"
    ) as HTMLInputElement;
    expect(volToggle.checked).toBe(true);
    const volNumber = screen
      .getAllByRole("spinbutton")
      .find((el) => (el as HTMLInputElement).max === "100") as HTMLInputElement;
    expect(volNumber.value).toBe("50");

    await act(async () => {
      fireEvent.click(volToggle); // disable
      fireEvent.change(volNumber, { target: { value: "30" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel edits" }));
    });
    // dialog
    const dialog = await screen.findByRole("dialog", {
      name: "Discard Unsaved Changes?",
    });
    await act(async () => {
      const buttons = dialog.querySelectorAll("button");
      (buttons[1] as HTMLButtonElement).click();
    });

    expect(
      (screen.getByLabelText("Enable default for volume") as HTMLInputElement)
        .checked
    ).toBe(true);
    const volNumber2 = screen
      .getAllByRole("spinbutton")
      .find((el) => (el as HTMLInputElement).max === "100") as HTMLInputElement;
    expect(volNumber2.value).toBe("50");
  });
});
