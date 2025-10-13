import { describe, it, expect, vi } from "vitest";
import {
  screen,
  fireEvent,
  waitForElementToBeRemoved,
  act,
} from "@testing-library/react";
import SpawnList from "../SpawnList";
import { createMockSpawn, renderSpawnList } from "./testUtils";

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
      renderSpawnList(<SpawnList />);
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
      .closest('[role="option"]') as HTMLElement;
    expect(within(row1).getByText("Active")).toBeInTheDocument();
    const row2 = screen
      .getByText("Test Spawn 2")
      .closest('[role="option"]') as HTMLElement;
    expect(within(row2).getByText("Inactive")).toBeInTheDocument();
  });

  it("shows empty state when no spawns exist", async () => {
    // Create fresh mock that returns empty array
    const mockGetAllSpawns = vi.fn().mockResolvedValue([]);
    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

    // Render the component
    await act(async () => {
      renderSpawnList(<SpawnList />);
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
        "You haven't created any spawns yet. Create your first spawn to get started.",
      ),
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
      renderSpawnList(<SpawnList />);
    });

    // Verify the component called the service
    expect(mockGetAllSpawns).toHaveBeenCalledTimes(1);

    // Verify error state is displayed
    expect(
      await screen.findByText("Failed to load spawns"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("⚠️")).toBeInTheDocument();

    // Verify the spawn list is not displayed
    expect(screen.queryByText("Spawns")).not.toBeInTheDocument();
    expect(screen.queryByText("No Spawns Found")).not.toBeInTheDocument();
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
      renderSpawnList(<SpawnList onSpawnClick={onSpawnClick} />);
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
      expect.objectContaining({ id: "spawn-1" }),
    );
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
      renderSpawnList(<SpawnList />);
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
      renderSpawnList(<SpawnList className="extra-class" />);
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
      renderSpawnList(<SpawnList selectedSpawnId="s2" />);
    });

    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    const selectedRow = screen.getByText("B").closest('[role="option"]')!;
    expect(selectedRow).toHaveClass(
      "bg-[rgb(var(--color-accent))]/5",
      "border-[rgb(var(--color-accent))]",
    );
    const otherRow = screen.getByText("A").closest('[role="option"]')!;
    expect(otherRow).not.toHaveClass(
      "bg-[rgb(var(--color-accent))]/5",
      "border-[rgb(var(--color-accent))]",
    );
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
      renderSpawnList(<SpawnList onSpawnClick={onSpawnClick} />);
    });

    const loading = screen.queryByText("Loading spawns...");
    if (loading) {
      await waitForElementToBeRemoved(loading);
    }

    const listbox = screen.getByRole("listbox");

    await act(async () => {
      fireEvent.keyDown(listbox, { key: "ArrowDown" });
      fireEvent.keyDown(listbox, { key: "ArrowDown" });
      fireEvent.keyDown(listbox, { key: "Enter" });
    });

    expect(onSpawnClick).toHaveBeenCalledTimes(1);
    expect(onSpawnClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s2" }),
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
      renderSpawnList(<SpawnList onSpawnClick={onSpawnClick} />);
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
      expect.objectContaining({ id: "s2" }),
    );
  });

  it("shows error when creation fails", async () => {
    vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);
    vi.mocked(SpawnService.createSpawn).mockResolvedValue({
      success: false,
      error: "No active profile",
    });

    await act(async () => {
      renderSpawnList(<SpawnList />);
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

  describe("Additional coverage", () => {
    it("shows fallback load error for non-Error rejection", async () => {
      const mockGetAllSpawns = vi.fn().mockRejectedValue("oops");
      vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

      await act(async () => {
        renderSpawnList(<SpawnList />);
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
        renderSpawnList(<SpawnList onSpawnClick={onSpawnClick} />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Create New Spawn" }),
        );
      });

      expect(await screen.findByText("New Spawn 2")).toBeInTheDocument();
      expect(onSpawnClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Spawn 2" }),
      );
    });

    it("shows creation error when createSpawn throws", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);
      vi.mocked(SpawnService.createSpawn).mockRejectedValue(
        new Error("boom create"),
      );

      await act(async () => {
        renderSpawnList(<SpawnList />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Create New Spawn" }),
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
        renderSpawnList(<SpawnList onSpawnClick={onSpawnClick} />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      const listbox = screen.getByRole("listbox");
      await act(async () => {
        fireEvent.keyDown(listbox, { key: "ArrowUp" });
        fireEvent.keyDown(listbox, { key: "Enter" });
      });

      expect(onSpawnClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: "s3" }),
      );
    });

    it("renders create error banner", async () => {
      const base = createMockSpawn({
        id: "sid",
        name: "Row",
        enabled: true,
        assets: [],
      });
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([base]);

      vi.mocked(SpawnService.createSpawn).mockResolvedValue({
        success: false,
        error: "create fail",
      });

      await act(async () => {
        renderSpawnList(<SpawnList />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      // Trigger create error
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Create New Spawn" }),
        );
      });

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
        async () => d.promise,
      );

      const onSpawnClick = vi.fn();

      await act(async () => {
        renderSpawnList(<SpawnList onSpawnClick={onSpawnClick} />);
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
        expect.objectContaining({ id: "s2" }),
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
        renderSpawnList(<SpawnList onSpawnClick={onSpawnClick} />);
      });

      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Create New Spawn" }),
        );
      });

      expect(await screen.findByText("New Spawn 1")).toBeInTheDocument();
      expect(onSpawnClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: "s1" }),
      );
    });

    it("reloads list when spawn-deleted event has no id (fallback reload)", async () => {
      const first = [
        createMockSpawn({ id: "a", name: "A", enabled: true, assets: [] }),
      ];
      const second = [
        createMockSpawn({ id: "b", name: "B", enabled: false, assets: [] }),
      ];
      vi.mocked(SpawnService.getAllSpawns)
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second);

      await act(async () => {
        renderSpawnList(<SpawnList />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }
      expect(await screen.findByText("A")).toBeInTheDocument();

      // Dispatch event without detail.id to trigger fallback reload
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("mediaspawner:spawn-deleted" as unknown as string),
        );
      });

      // Next render should show the updated list
      expect(await screen.findByText("B")).toBeInTheDocument();
      expect(screen.queryByText("A")).not.toBeInTheDocument();
    });

    it("shows fallback message when createSpawn rejects with non-Error", async () => {
      vi.mocked(SpawnService.getAllSpawns).mockResolvedValue([]);
      vi.mocked(SpawnService.createSpawn).mockRejectedValue("weird");

      await act(async () => {
        renderSpawnList(<SpawnList />);
      });
      const loading = screen.queryByText("Loading spawns...");
      if (loading) {
        await waitForElementToBeRemoved(loading);
      }

      const btn = screen.getByRole("button", { name: "Create New Spawn" });
      await act(async () => {
        fireEvent.click(btn);
      });

      expect(
        await screen.findByText("Failed to create spawn"),
      ).toBeInTheDocument();
      // Button should be re-enabled after failure
      expect(btn).not.toBeDisabled();
    });
  });
});
