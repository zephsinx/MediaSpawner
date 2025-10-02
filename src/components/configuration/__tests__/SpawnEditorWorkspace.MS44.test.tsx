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

  it("saves spawn configuration without default properties", async () => {
    const s = createSpawn({});
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s]);
    vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
      success: true,
      spawn: s,
    });

    await act(async () => {
      render(<SpawnEditorWorkspace />);
    });

    // Make a change to enable save button
    const nameInput = screen.getByLabelText("Name");
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Updated Spawn" } });
    });

    const saveBtn = screen.getByRole("button", { name: "Save spawn" });
    expect(saveBtn).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    const args = vi.mocked(SpawnService.updateSpawn).mock.calls[0][1];
    expect(args).not.toHaveProperty("defaultProperties");
  });

  it("cancel reverts form changes", async () => {
    const s = createSpawn({});
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s]);
    vi.mocked(SpawnService.updateSpawn).mockResolvedValue({
      success: true,
      spawn: s,
    });

    await act(async () => {
      render(<SpawnEditorWorkspace />);
    });

    const nameInput = screen.getByLabelText("Name");
    expect(nameInput).toHaveValue("Spawn One");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Changed Name" } });
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

    expect(nameInput).toHaveValue("Spawn One");
  });
});
