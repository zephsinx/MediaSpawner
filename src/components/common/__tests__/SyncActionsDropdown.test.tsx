import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SyncActionsDropdown } from "../SyncActionsDropdown";
import type { SyncStatusInfo, SyncOperationResult } from "../../../types/sync";
import { StreamerbotService } from "../../../services/streamerbotService";

// Mock the StreamerbotService
vi.mock("../../../services/streamerbotService", () => ({
  StreamerbotService: {
    subscribeToSyncStatus: vi.fn(() => () => {}),
    pushConfiguration: vi.fn(),
    checkConfigSyncStatus: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the DropdownMenu component to avoid Radix UI complexity in tests
vi.mock("@radix-ui/react-dropdown-menu", () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-root">{children}</div>
  ),
  Trigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <div data-testid="dropdown-trigger">{children}</div>
    ),
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-portal">{children}</div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  Item: ({
    children,
    onSelect,
    disabled,
  }: {
    children: React.ReactNode;
    onSelect?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
  }) => (
    <button data-testid="dropdown-item" onClick={onSelect} disabled={disabled}>
      {children}
    </button>
  ),
}));

describe("SyncActionsDropdown", () => {
  const mockSyncStatus: SyncStatusInfo = {
    status: "synced",
    lastChecked: new Date("2024-01-01T12:00:00Z"),
  };

  const mockOnSyncStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders primary sync button correctly", () => {
    render(
      <SyncActionsDropdown
        syncStatus={mockSyncStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    expect(
      screen.getByRole("button", { name: /sync config/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /additional sync actions/i }),
    ).toBeInTheDocument();
  });

  it("shows correct status in dropdown", () => {
    render(
      <SyncActionsDropdown
        syncStatus={mockSyncStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByText(/Last checked:/)).toBeInTheDocument();
  });

  it("handles sync config action", async () => {
    const mockPushConfiguration = vi.mocked(
      StreamerbotService.pushConfiguration,
    );
    mockPushConfiguration.mockResolvedValue({
      success: true,
      timestamp: new Date(),
    });

    render(
      <SyncActionsDropdown
        syncStatus={mockSyncStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    const syncButton = screen.getByRole("button", { name: /sync config/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockPushConfiguration).toHaveBeenCalledTimes(1);
    });
  });

  it("handles check status action", async () => {
    const mockCheckStatus = vi.mocked(StreamerbotService.checkConfigSyncStatus);
    mockCheckStatus.mockResolvedValue({
      success: true,
      statusInfo: mockSyncStatus,
    });

    render(
      <SyncActionsDropdown
        syncStatus={mockSyncStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    // Open dropdown and click check status
    const dropdownTrigger = screen.getByRole("button", {
      name: /additional sync actions/i,
    });
    fireEvent.click(dropdownTrigger);

    const checkStatusButton = screen.getByRole("button", {
      name: /check status/i,
    });
    fireEvent.click(checkStatusButton);

    await waitFor(() => {
      expect(mockCheckStatus).toHaveBeenCalledTimes(1);
    });
  });

  it("handles refresh action", async () => {
    const mockCheckStatus = vi.mocked(StreamerbotService.checkConfigSyncStatus);
    mockCheckStatus.mockResolvedValue({
      success: true,
      statusInfo: mockSyncStatus,
    });

    render(
      <SyncActionsDropdown
        syncStatus={mockSyncStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    // Open dropdown and click refresh
    const dropdownTrigger = screen.getByRole("button", {
      name: /additional sync actions/i,
    });
    fireEvent.click(dropdownTrigger);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockCheckStatus).toHaveBeenCalledTimes(1);
    });
  });

  it("shows loading state during sync", async () => {
    const mockPushConfiguration = vi.mocked(
      StreamerbotService.pushConfiguration,
    );

    // Create a promise that we can control
    let resolvePromise: (value: SyncOperationResult) => void;
    const controlledPromise = new Promise<SyncOperationResult>((resolve) => {
      resolvePromise = resolve;
    });

    mockPushConfiguration.mockReturnValue(controlledPromise);

    render(
      <SyncActionsDropdown
        syncStatus={mockSyncStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    const syncButton = screen.getByRole("button", { name: /sync config/i });

    act(() => {
      fireEvent.click(syncButton);
    });

    // Should show loading state immediately after click
    expect(syncButton).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /additional sync actions/i }),
    ).toBeDisabled();

    // Resolve the promise to complete the operation
    act(() => {
      resolvePromise!({ success: true });
    });

    // Wait for the operation to complete
    await waitFor(() => {
      expect(mockPushConfiguration).toHaveBeenCalledTimes(1);
    });
  });

  it("disables sync button when offline", () => {
    const offlineStatus: SyncStatusInfo = {
      status: "offline",
    };

    render(
      <SyncActionsDropdown
        syncStatus={offlineStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    const syncButton = screen.getByRole("button", { name: /sync config/i });
    expect(syncButton).toBeDisabled();
  });

  it("shows error status correctly", () => {
    const errorStatus: SyncStatusInfo = {
      status: "error",
      errorMessage: "Connection failed",
    };

    render(
      <SyncActionsDropdown
        syncStatus={errorStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("shows out-of-sync status correctly", () => {
    const outOfSyncStatus: SyncStatusInfo = {
      status: "out-of-sync",
    };

    render(
      <SyncActionsDropdown
        syncStatus={outOfSyncStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    expect(screen.getByText("Out of sync")).toBeInTheDocument();
  });

  it("subscribes to sync status changes", () => {
    const mockSubscribe = vi.mocked(StreamerbotService.subscribeToSyncStatus);

    render(
      <SyncActionsDropdown
        syncStatus={mockSyncStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
      />,
    );

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    render(
      <SyncActionsDropdown
        syncStatus={mockSyncStatus}
        onSyncStatusChange={mockOnSyncStatusChange}
        className="custom-class"
      />,
    );

    const container = screen.getByRole("button", {
      name: /sync config/i,
    }).parentElement;
    expect(container).toHaveClass("custom-class");
  });
});
