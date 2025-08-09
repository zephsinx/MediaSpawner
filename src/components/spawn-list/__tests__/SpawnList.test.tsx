import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitForElementToBeRemoved,
  act,
} from "@testing-library/react";
import SpawnList from "../SpawnList";
import { createMockSpawn } from "./testUtils";

// Mock the SpawnService
vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getAllSpawns: vi.fn(),
    enableSpawn: vi.fn(),
    disableSpawn: vi.fn(),
    createSpawn: vi.fn(),
  },
}));

// Import after mocking
import { SpawnService } from "../../../services/spawnService";
import { within } from "@testing-library/react";
import type { Spawn } from "../../../types/spawn";

describe("SpawnList", () => {
  it("loads and displays spawns correctly", async () => {
    // Create test data
    const testSpawns = [
      createMockSpawn({
        id: "spawn-1",
        name: "Test Spawn 1",
        enabled: true,
        assets: [],
      }),
      createMockSpawn({
        id: "spawn-2",
        name: "Test Spawn 2",
        enabled: false,
        assets: [],
      }),
    ];

    // Create fresh mock for this test
    const mockGetAllSpawns = vi.fn().mockResolvedValue(testSpawns);
    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

    // Render the component
    await act(async () => {
      render(<SpawnList />);
    });

    // Verify the component loaded spawns
    expect(mockGetAllSpawns).toHaveBeenCalledTimes(1);

    // Wait for loading to disappear, then verify the list
    const loading1 = screen.queryByText("Loading spawns...");
    if (loading1) {
      await waitForElementToBeRemoved(loading1);
    }
    expect(await screen.findByText("Spawns")).toBeInTheDocument();
    expect(await screen.findByText("2 spawns")).toBeInTheDocument();

    // Verify individual spawns are displayed
    expect(await screen.findByText("Test Spawn 1")).toBeInTheDocument();
    expect(await screen.findByText("Test Spawn 2")).toBeInTheDocument();

    // Verify status text is displayed correctly per row
    const row1 = screen
      .getByText("Test Spawn 1")
      .closest('[role="button"]') as HTMLElement;
    expect(within(row1).getByText("Active")).toBeInTheDocument();
    const row2 = screen
      .getByText("Test Spawn 2")
      .closest('[role="button"]') as HTMLElement;
    expect(within(row2).getByText("Inactive")).toBeInTheDocument();
  });

  it("shows empty state when no spawns exist", async () => {
    // Create fresh mock that returns empty array
    const mockGetAllSpawns = vi.fn().mockResolvedValue([]);
    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

    // Render the component
    await act(async () => {
      render(<SpawnList />);
    });

    // Verify the component loaded spawns
    expect(mockGetAllSpawns).toHaveBeenCalledTimes(1);

    // Verify empty state is displayed
    const loading2 = screen.queryByText("Loading spawns...");
    if (loading2) {
      await waitForElementToBeRemoved(loading2);
    }
    expect(await screen.findByText("No Spawns Found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You haven't created any spawns yet. Create your first spawn to get started."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("📋")).toBeInTheDocument();

    // Header is displayed in empty state (with New Spawn button)
    expect(screen.getByText("Spawns")).toBeInTheDocument();
    expect(screen.getByText("0 spawns")).toBeInTheDocument();
  });

  it("shows error state when service throws an error", async () => {
    // Create fresh mock that throws an error
    const mockGetAllSpawns = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));
    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

    // Render the component
    await act(async () => {
      render(<SpawnList />);
    });

    // Verify the component called the service
    expect(mockGetAllSpawns).toHaveBeenCalledTimes(1);

    // Verify error state is displayed
    expect(
      await screen.findByText("Failed to load spawns")
    ).toBeInTheDocument();
    expect(await screen.findByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("⚠️")).toBeInTheDocument();

    // Verify the spawn list is not displayed
    expect(screen.queryByText("Spawns")).not.toBeInTheDocument();
    expect(screen.queryByText("No Spawns Found")).not.toBeInTheDocument();
  });

  it("successfully enables a disabled spawn", async () => {
    // Create test data
    const disabledSpawn = createMockSpawn({
      id: "spawn-disabled",
      name: "Disabled Spawn",
      enabled: false,
      assets: [],
    });

    // Create fresh mocks for this test
    const mockGetAllSpawns = vi.fn().mockResolvedValue([disabledSpawn]);
    const mockEnableSpawn = vi.fn().mockResolvedValue({
      success: true,
      spawn: { ...disabledSpawn, enabled: true },
    });

    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);
    vi.mocked(SpawnService.enableSpawn).mockImplementation(mockEnableSpawn);

    // Render the component
    await act(async () => {
      render(<SpawnList />);
    });

    // Verify initial state
    const loading3 = screen.queryByText("Loading spawns...");
    if (loading3) {
      await waitForElementToBeRemoved(loading3);
    }
    expect(await screen.findByText("Disabled Spawn")).toBeInTheDocument();
    expect(await screen.findByText("Inactive")).toBeInTheDocument();

    // Find and click the toggle button
    const toggleButton = screen.getByRole("button", {
      name: "Enable Disabled Spawn",
    });
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    // Verify service was called
    expect(mockEnableSpawn).toHaveBeenCalledWith("spawn-disabled");

    // Verify optimistic update (spawn should appear enabled immediately)
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("successfully disables an enabled spawn", async () => {
    // Create test data
    const enabledSpawn = createMockSpawn({
      id: "spawn-enabled",
      name: "Enabled Spawn",
      enabled: true,
      assets: [],
    });

    // Create fresh mocks for this test
    const mockGetAllSpawns = vi.fn().mockResolvedValue([enabledSpawn]);
    const mockDisableSpawn = vi.fn().mockResolvedValue({
      success: true,
      spawn: { ...enabledSpawn, enabled: false },
    });

    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);
    vi.mocked(SpawnService.disableSpawn).mockImplementation(mockDisableSpawn);

    // Render the component
    render(<SpawnList />);

    // Verify initial state
    await waitForElementToBeRemoved(() =>
      screen.getByText("Loading spawns...")
    );
    expect(await screen.findByText("Enabled Spawn")).toBeInTheDocument();
    const enabledRow = screen
      .getByText("Enabled Spawn")
      .closest('[role="button"]') as HTMLElement;
    expect(within(enabledRow).getByText("Active")).toBeInTheDocument();

    // Find and click the toggle button
    const toggleButton = screen.getByRole("button", {
      name: "Disable Enabled Spawn",
    });
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    // Verify service was called
    expect(mockDisableSpawn).toHaveBeenCalledWith("spawn-enabled");

    // Verify optimistic update (spawn should appear disabled immediately)
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("handles enable toggle failure and reverts optimistic update", async () => {
    // Create test data
    const disabledSpawn = createMockSpawn({
      id: "spawn-disabled",
      name: "Disabled Spawn",
      enabled: false,
      assets: [],
    });

    // Import fresh service inside isolated module
    const { SpawnService } = await import("../../../services/spawnService");

    // Create completely fresh mocks
    const mockGetAllSpawns = vi.fn().mockResolvedValue([disabledSpawn]);
    const mockEnableSpawn = vi.fn().mockResolvedValue({
      success: false,
      error: "Failed to enable spawn",
    });

    // Apply mocks to fresh service
    SpawnService.getAllSpawns = mockGetAllSpawns;
    SpawnService.enableSpawn = mockEnableSpawn;

    // Render with fresh service
    render(<SpawnList />);

    // Verify initial state
    await waitForElementToBeRemoved(() =>
      screen.getByText("Loading spawns...")
    );
    expect(await screen.findByText("Disabled Spawn")).toBeInTheDocument();
    expect(await screen.findByText("Inactive")).toBeInTheDocument();

    // Find and click the toggle button
    const toggleButton = screen.getByRole("button", {
      name: "Enable Disabled Spawn",
    });

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    // Verify service was called
    expect(mockEnableSpawn).toHaveBeenCalledWith("spawn-disabled");

    // Verify error message is displayed in the error section (async render)
    expect(
      await screen.findByText("Failed to enable spawn")
    ).toBeInTheDocument();

    // Verify spawn remains disabled (optimistic update reverted)
    expect(await screen.findByText("Inactive")).toBeInTheDocument();
  });

  it("invokes onSpawnClick when a spawn item is clicked", async () => {
    const testSpawns = [
      createMockSpawn({
        id: "spawn-1",
        name: "Click Me",
        enabled: true,
        assets: [],
      }),
      createMockSpawn({
        id: "spawn-2",
        name: "Other",
        enabled: false,
        assets: [],
      }),
    ];

    const mockGetAllSpawns = vi.fn().mockResolvedValue(testSpawns);
    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

    const onSpawnClick = vi.fn();

    await act(async () => {
      render(<SpawnList onSpawnClick={onSpawnClick} />);
    });
    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    const item = screen.getByText("Click Me");
    await act(async () => {
      fireEvent.click(item);
    });

    expect(onSpawnClick).toHaveBeenCalledTimes(1);
    expect(onSpawnClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "spawn-1" })
    );
  });

  it("shows error message when enable throws an Error and reverts state", async () => {
    const disabledSpawn = createMockSpawn({
      id: "s1",
      name: "Err Spawn",
      enabled: false,
      assets: [],
    });

    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([disabledSpawn]);
    vi.mocked(SpawnService.enableSpawn).mockRejectedValue(new Error("Boom"));

    await act(async () => {
      render(<SpawnList />);
    });
    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    const toggleButton = screen.getByRole("button", {
      name: "Enable Err Spawn",
    });
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(await screen.findByText("Boom")).toBeInTheDocument();
    // Reverted back to inactive
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("uses fallback error message when disable rejects with non-Error and reverts state", async () => {
    const enabledSpawn = createMockSpawn({
      id: "s2",
      name: "Weird Spawn",
      enabled: true,
      assets: [],
    });

    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([enabledSpawn]);
    vi.mocked(SpawnService.disableSpawn).mockRejectedValue("weird");

    await act(async () => {
      render(<SpawnList />);
    });
    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    const toggleButton = screen.getByRole("button", {
      name: "Disable Weird Spawn",
    });
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(
      await screen.findByText("Failed to disable spawn")
    ).toBeInTheDocument();
    // Reverted back to active
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows singular count '1 spawn' when only one spawn exists", async () => {
    const oneSpawn = createMockSpawn({
      id: "s1",
      name: "Only One",
      enabled: true,
      assets: [],
    });
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([oneSpawn]);

    await act(async () => {
      render(<SpawnList />);
    });

    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    expect(await screen.findByText("Spawns")).toBeInTheDocument();
    expect(await screen.findByText("1 spawn")).toBeInTheDocument();
  });

  it("applies className to root container (empty state)", async () => {
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);

    await act(async () => {
      render(<SpawnList className="extra-class" />);
    });

    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    // Root container should have the custom class applied
    const rootWithClass = document.querySelector(".extra-class");
    expect(rootWithClass).not.toBeNull();
  });

  it("marks the item matching selectedSpawnId as selected", async () => {
    const items = [
      createMockSpawn({ id: "s1", name: "A", enabled: true, assets: [] }),
      createMockSpawn({ id: "s2", name: "B", enabled: false, assets: [] }),
    ];
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(items);

    await act(async () => {
      render(<SpawnList selectedSpawnId="s2" />);
    });

    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    const selectedRow = screen.getByText("B").closest('[role="button"]')!;
    expect(selectedRow).toHaveClass("bg-blue-50", "border-blue-200");
    const otherRow = screen.getByText("A").closest('[role="button"]')!;
    expect(otherRow).not.toHaveClass("bg-blue-50", "border-blue-200");
  });

  it("supports arrow key navigation and Enter to select via onSpawnClick", async () => {
    const items = [
      createMockSpawn({ id: "s1", name: "First", enabled: true, assets: [] }),
      createMockSpawn({ id: "s2", name: "Second", enabled: true, assets: [] }),
      createMockSpawn({ id: "s3", name: "Third", enabled: true, assets: [] }),
    ];
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(items);

    const onSpawnClick = vi.fn();

    await act(async () => {
      render(<SpawnList onSpawnClick={onSpawnClick} />);
    });

    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    const listbox = screen.getByRole("listbox", { name: "Spawns" });

    await act(async () => {
      fireEvent.keyDown(listbox, { key: "ArrowDown" });
      fireEvent.keyDown(listbox, { key: "ArrowDown" });
      fireEvent.keyDown(listbox, { key: "Enter" });
    });

    expect(onSpawnClick).toHaveBeenCalledTimes(1);
    expect(onSpawnClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s2" })
    );
  });

  it("creates a new spawn, appends it to the list, and calls onSpawnClick for selection", async () => {
    const items = [
      createMockSpawn({
        id: "s1",
        name: "Existing 1",
        enabled: true,
        assets: [],
      }),
    ];
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(items);

    const newSpawn = createMockSpawn({
      id: "s2",
      name: "New Spawn 1",
      enabled: true,
      assets: [],
    });
    vi.mocked(SpawnService.createSpawn).mockResolvedValue({
      success: true,
      spawn: newSpawn,
    });

    const onSpawnClick = vi.fn();

    await act(async () => {
      render(<SpawnList onSpawnClick={onSpawnClick} />);
    });

    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    // Click New Spawn button
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create New Spawn" }));
    });

    // New row appears
    expect(await screen.findByText("New Spawn 1")).toBeInTheDocument();
    // Selection callback invoked
    expect(onSpawnClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s2" })
    );
  });

  it("shows error when creation fails", async () => {
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);
    vi.mocked(SpawnService.createSpawn).mockResolvedValue({
      success: false,
      error: "No active profile",
    });

    await act(async () => {
      render(<SpawnList />);
    });

    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create New Spawn" }));
    });

    expect(await screen.findByText("No active profile")).toBeInTheDocument();
  });

  it("shows toggle error banner on failure and clears after a successful toggle", async () => {
    const s = createMockSpawn({
      id: "s1",
      name: "Toggle",
      enabled: false,
      assets: [],
    });
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s]);
    vi.mocked(SpawnService.enableSpawn).mockResolvedValue({
      success: false,
      error: "Nope",
    });

    await act(async () => {
      render(<SpawnList />);
    });

    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enable Toggle" }));
    });
    expect(await screen.findByText("Nope")).toBeInTheDocument();

    vi.mocked(SpawnService.enableSpawn).mockResolvedValue({
      success: true,
      spawn: { ...s, enabled: true },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enable Toggle" }));
    });

    // Only one row in this test; verify it shows Active before the click
    const row = screen
      .getByText("Toggle")
      .closest('[role="button"]') as HTMLElement;
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Nope")).not.toBeInTheDocument();
  });

  it("reverts optimistic update when disable returns success: false", async () => {
    const s = createMockSpawn({
      id: "s1",
      name: "Toggle",
      enabled: true,
      assets: [],
    });
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s]);
    vi.mocked(SpawnService.disableSpawn).mockResolvedValue({
      success: false,
      error: "Cannot disable",
    });

    await act(async () => {
      render(<SpawnList />);
    });
    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disable Toggle" }));
    });

    expect(await screen.findByText("Cannot disable")).toBeInTheDocument();
    expect(await screen.findByText("Active")).toBeInTheDocument();
  });

  it("uses fallback error message when enable rejects with non-Error and reverts state", async () => {
    const s = createMockSpawn({
      id: "s1",
      name: "Weird Enable",
      enabled: false,
      assets: [],
    });
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s]);
    vi.mocked(SpawnService.enableSpawn).mockRejectedValue("weird");

    await act(async () => {
      render(<SpawnList />);
    });
    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Enable Weird Enable" })
      );
    });

    expect(
      await screen.findByText("Failed to enable spawn")
    ).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  describe("Additional coverage", () => {
    it("shows fallback load error for non-Error rejection", async () => {
      const mockGetAllSpawns = vi.fn().mockRejectedValue("oops");
      vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

      await act(async () => {
        render(<SpawnList />);
      });

      const msgs = await screen.findAllByText("Failed to load spawns");
      expect(msgs.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });

    it("retries on duplicate name and succeeds with incremented name", async () => {
      const items = [
        createMockSpawn({
          id: "e1",
          name: "Existing 1",
          enabled: true,
          assets: [],
        }),
      ];
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(items);

      vi.mocked(SpawnService.createSpawn)
        .mockResolvedValueOnce({ success: false, error: "already exists" })
        .mockResolvedValueOnce({
          success: true,
          spawn: createMockSpawn({
            id: "s2",
            name: "New Spawn 2",
            enabled: true,
            assets: [],
          }),
        });

      const onSpawnClick = vi.fn();

      await act(async () => {
        render(<SpawnList onSpawnClick={onSpawnClick} />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Create New Spawn" })
        );
      });

      expect(await screen.findByText("New Spawn 2")).toBeInTheDocument();
      expect(onSpawnClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Spawn 2" })
      );
    });

    it("shows creation error when createSpawn throws", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);
      vi.mocked(SpawnService.createSpawn).mockRejectedValue(
        new Error("boom create")
      );

      await act(async () => {
        render(<SpawnList />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Create New Spawn" })
        );
      });

      expect(await screen.findByText("boom create")).toBeInTheDocument();
    });

    it("supports ArrowUp from initial state to select last item", async () => {
      const items = [
        createMockSpawn({ id: "s1", name: "First", enabled: true, assets: [] }),
        createMockSpawn({
          id: "s2",
          name: "Second",
          enabled: true,
          assets: [],
        }),
        createMockSpawn({ id: "s3", name: "Third", enabled: true, assets: [] }),
      ];
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(items);

      const onSpawnClick = vi.fn();

      await act(async () => {
        render(<SpawnList onSpawnClick={onSpawnClick} />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      const listbox = screen.getByRole("listbox", { name: "Spawns" });
      await act(async () => {
        fireEvent.keyDown(listbox, { key: "ArrowUp" });
        fireEvent.keyDown(listbox, { key: "Enter" });
      });

      expect(onSpawnClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: "s3" })
      );
    });

    it("renders both toggle and create error banners together", async () => {
      const base = createMockSpawn({
        id: "sid",
        name: "Row",
        enabled: true,
        assets: [],
      });
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([base]);

      vi.mocked(SpawnService.disableSpawn).mockResolvedValue({
        success: false,
        error: "toggle fail",
      });
      vi.mocked(SpawnService.createSpawn).mockResolvedValue({
        success: false,
        error: "create fail",
      });

      await act(async () => {
        render(<SpawnList />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      // Trigger toggle error
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Disable Row" }));
      });

      // Trigger create error
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Create New Spawn" })
        );
      });

      expect(await screen.findByText("toggle fail")).toBeInTheDocument();
      expect(await screen.findByText("create fail")).toBeInTheDocument();
    });

    it("disables create button and shows spinner while creating, then appends and selects", async () => {
      const items = [
        createMockSpawn({
          id: "s1",
          name: "Existing",
          enabled: true,
          assets: [],
        }),
      ];
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue(items);

      // deferred create
      type CreateResult = { success: boolean; spawn?: Spawn; error?: string };
      const deferred = () => {
        let resolve!: (v: CreateResult) => void;
        let reject!: (r?: unknown) => void;
        const promise: Promise<CreateResult> = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      };
      const d = deferred();
      vi.mocked(SpawnService.createSpawn).mockImplementation(
        async () => d.promise
      );

      const onSpawnClick = vi.fn();

      await act(async () => {
        render(<SpawnList onSpawnClick={onSpawnClick} />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      const btn = screen.getByRole("button", { name: "Create New Spawn" });
      await act(async () => {
        fireEvent.click(btn);
      });

      expect(btn).toBeDisabled();
      // Spinner exists inside button
      expect(btn.querySelector(".animate-spin")).not.toBeNull();

      // Resolve creation
      const created = createMockSpawn({
        id: "s2",
        name: "New Spawn 1",
        enabled: true,
        assets: [],
      });
      await act(async () => {
        d.resolve({ success: true, spawn: created });
      });

      expect(await screen.findByText("New Spawn 1")).toBeInTheDocument();
      expect(onSpawnClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: "s2" })
      );
    });

    it("creates from empty state and selects new spawn", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);
      const created = createMockSpawn({
        id: "s1",
        name: "New Spawn 1",
        enabled: true,
        assets: [],
      });
      vi.mocked(SpawnService.createSpawn).mockResolvedValue({
        success: true,
        spawn: created,
      });

      const onSpawnClick = vi.fn();

      await act(async () => {
        render(<SpawnList onSpawnClick={onSpawnClick} />);
      });

      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Create New Spawn" })
        );
      });

      expect(await screen.findByText("New Spawn 1")).toBeInTheDocument();
      expect(onSpawnClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: "s1" })
      );
    });
  });

  it("uses fallback error message when toggle returns success: false without error", async () => {
    const s = createMockSpawn({
      id: "s1",
      name: "No Error",
      enabled: true,
      assets: [],
    });
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s]);
    vi.mocked(SpawnService.disableSpawn).mockResolvedValue({ success: false });

    await act(async () => {
      render(<SpawnList />);
    });
    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disable No Error" }));
    });

    expect(
      await screen.findByText("Failed to disable spawn")
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("replaces spawn with service response object (e.g., name changes)", async () => {
    const s = createMockSpawn({
      id: "s1",
      name: "Old Name",
      enabled: false,
      assets: [],
    });
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s]);
    vi.mocked(SpawnService.enableSpawn).mockResolvedValue({
      success: true,
      spawn: { ...s, enabled: true, name: "New Name" },
    });

    await act(async () => {
      render(<SpawnList />);
    });
    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    expect(await screen.findByText("Old Name")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enable Old Name" }));
    });

    expect(await screen.findByText("New Name")).toBeInTheDocument();
  });

  it("disables only the toggled item while processing and leaves others interactive", async () => {
    const s1 = createMockSpawn({
      id: "s1",
      name: "First",
      enabled: false,
      assets: [],
    });
    const s2 = createMockSpawn({
      id: "s2",
      name: "Second",
      enabled: false,
      assets: [],
    });
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([s1, s2]);

    type ToggleResult = { success: boolean; spawn?: Spawn; error?: string };
    const deferred = () => {
      let resolve!: (value: ToggleResult) => void;
      let reject!: (reason?: unknown) => void;
      const promise: Promise<ToggleResult> = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
    const d = deferred();

    vi.mocked(SpawnService.enableSpawn).mockImplementation(
      async (id: string) => {
        if (id === "s1") return d.promise;
        return { success: true, spawn: { ...s2, enabled: true } };
      }
    );

    await act(async () => {
      render(<SpawnList />);
    });
    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    const btn1 = screen.getByRole("button", { name: "Enable First" });
    const btn2 = screen.getByRole("button", { name: "Enable Second" });

    await act(async () => {
      fireEvent.click(btn1);
    });

    // First is disabled and shows spinner
    expect(btn1).toBeDisabled();
    expect(btn1.querySelector(".animate-spin")).not.toBeNull();

    // Second remains interactive
    expect(btn2).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(btn2);
    });
    const secondRow = screen
      .getByText("Second")
      .closest('[role="button"]') as HTMLElement;
    expect(await within(secondRow).findByText("Active")).toBeInTheDocument();

    // Resolve first toggle to avoid dangling promises
    await act(async () => {
      d.resolve({ success: true, spawn: { ...s1, enabled: true } });
    });
  });
});
