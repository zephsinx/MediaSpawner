import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SpawnList from "../SpawnList";
import { createMockSpawn } from "./testUtils";

// Mock the SpawnService
vi.mock("../../../services/spawnService", () => ({
  SpawnService: {
    getAllSpawns: vi.fn(),
    enableSpawn: vi.fn(),
    disableSpawn: vi.fn(),
  },
}));

// Import after mocking
import { SpawnService } from "../../../services/spawnService";

describe("SpawnList", () => {
  it("loads and displays spawns correctly", () => {
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
    const mockGetAllSpawns = vi.fn().mockReturnValue(testSpawns);
    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

    // Render the component
    render(<SpawnList />);

    // Verify the component loaded spawns
    expect(mockGetAllSpawns).toHaveBeenCalledTimes(1);

    // Verify the spawn list is displayed
    expect(screen.getByText("Spawns")).toBeInTheDocument();
    expect(screen.getByText("2 spawns")).toBeInTheDocument();

    // Verify individual spawns are displayed
    expect(screen.getByText("Test Spawn 1")).toBeInTheDocument();
    expect(screen.getByText("Test Spawn 2")).toBeInTheDocument();

    // Verify status text is displayed correctly
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("shows empty state when no spawns exist", () => {
    // Create fresh mock that returns empty array
    const mockGetAllSpawns = vi.fn().mockReturnValue([]);
    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

    // Render the component
    render(<SpawnList />);

    // Verify the component loaded spawns
    expect(mockGetAllSpawns).toHaveBeenCalledTimes(1);

    // Verify empty state is displayed
    expect(screen.getByText("No Spawns Found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You haven't created any spawns yet. Create your first spawn to get started."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("📋")).toBeInTheDocument();

    // Verify the header is not displayed (since there are no spawns)
    expect(screen.queryByText("Spawns")).not.toBeInTheDocument();
    expect(screen.queryByText("0 spawns")).not.toBeInTheDocument();
  });

  it("shows error state when service throws an error", () => {
    // Create fresh mock that throws an error
    const mockGetAllSpawns = vi.fn().mockImplementation(() => {
      throw new Error("Network error");
    });
    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);

    // Render the component
    render(<SpawnList />);

    // Verify the component called the service
    expect(mockGetAllSpawns).toHaveBeenCalledTimes(1);

    // Verify error state is displayed
    expect(screen.getByText("Failed to load spawns")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
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
    const mockGetAllSpawns = vi.fn().mockReturnValue([disabledSpawn]);
    const mockEnableSpawn = vi.fn().mockReturnValue({
      success: true,
      spawn: { ...disabledSpawn, enabled: true },
    });

    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);
    vi.mocked(SpawnService.enableSpawn).mockImplementation(mockEnableSpawn);

    // Render the component
    render(<SpawnList />);

    // Verify initial state
    expect(screen.getByText("Disabled Spawn")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();

    // Find and click the toggle button
    const toggleButton = screen.getByRole("button", {
      name: "Enable Disabled Spawn",
    });
    fireEvent.click(toggleButton);

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
    const mockGetAllSpawns = vi.fn().mockReturnValue([enabledSpawn]);
    const mockDisableSpawn = vi.fn().mockReturnValue({
      success: true,
      spawn: { ...enabledSpawn, enabled: false },
    });

    vi.mocked(SpawnService.getAllSpawns).mockImplementation(mockGetAllSpawns);
    vi.mocked(SpawnService.disableSpawn).mockImplementation(mockDisableSpawn);

    // Render the component
    render(<SpawnList />);

    // Verify initial state
    expect(screen.getByText("Enabled Spawn")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    // Find and click the toggle button
    const toggleButton = screen.getByRole("button", {
      name: "Disable Enabled Spawn",
    });
    fireEvent.click(toggleButton);

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
    const mockGetAllSpawns = vi.fn().mockReturnValue([disabledSpawn]);
    const mockEnableSpawn = vi.fn().mockReturnValue({
      success: false,
      error: "Failed to enable spawn",
    });

    // Apply mocks to fresh service
    SpawnService.getAllSpawns = mockGetAllSpawns;
    SpawnService.enableSpawn = mockEnableSpawn;

    // Render with fresh service
    render(<SpawnList />);

    // Verify initial state
    expect(screen.getByText("Disabled Spawn")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();

    // Find and click the toggle button
    const toggleButton = screen.getByRole("button", {
      name: "Enable Disabled Spawn",
    });

    fireEvent.click(toggleButton);

    // Verify service was called
    expect(mockEnableSpawn).toHaveBeenCalledWith("spawn-disabled");

    // Verify error message is displayed in the error section
    expect(screen.getByText("Failed to enable spawn")).toBeInTheDocument();

    // Verify spawn remains disabled (optimistic update reverted)
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});
