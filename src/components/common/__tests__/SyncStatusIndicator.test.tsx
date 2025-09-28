import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SyncStatusIndicator } from "../SyncStatusIndicator";
import type { SyncStatusInfo } from "../../../types/sync";

// Mock the Tooltip component to avoid Radix UI complexity in tests
vi.mock("@radix-ui/react-tooltip", () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-root">{children}</div>
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
      <div data-testid="tooltip-trigger">{children}</div>
    ),
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-portal">{children}</div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  Arrow: () => <div data-testid="tooltip-arrow" />,
}));

describe("SyncStatusIndicator", () => {
  const createStatusInfo = (
    status: SyncStatusInfo["status"],
    overrides?: Partial<SyncStatusInfo>
  ): SyncStatusInfo => ({
    status,
    lastChecked: new Date("2024-01-01T12:00:00Z"),
    ...overrides,
  });

  it("renders synced status correctly", () => {
    const statusInfo = createStatusInfo("synced");
    render(<SyncStatusIndicator statusInfo={statusInfo} />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Sync status: Synced"
    );
  });

  it("renders out-of-sync status correctly", () => {
    const statusInfo = createStatusInfo("out-of-sync");
    render(<SyncStatusIndicator statusInfo={statusInfo} />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Sync status: Out of sync"
    );
  });

  it("renders error status correctly", () => {
    const statusInfo = createStatusInfo("error", {
      errorMessage: "Connection failed",
    });
    render(<SyncStatusIndicator statusInfo={statusInfo} />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Sync status: Error"
    );
  });

  it("renders unknown status correctly", () => {
    const statusInfo = createStatusInfo("unknown");
    render(<SyncStatusIndicator statusInfo={statusInfo} />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Sync status: Unknown"
    );
  });

  it("renders offline status correctly", () => {
    const statusInfo = createStatusInfo("offline");
    render(<SyncStatusIndicator statusInfo={statusInfo} />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Sync status: Offline"
    );
  });

  it("shows label when showLabel is true", () => {
    const statusInfo = createStatusInfo("synced");
    render(<SyncStatusIndicator statusInfo={statusInfo} showLabel={true} />);

    expect(screen.getByText("Synced")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const statusInfo = createStatusInfo("synced");
    render(
      <SyncStatusIndicator statusInfo={statusInfo} className="custom-class" />
    );

    const container = screen.getByRole("status");
    expect(container).toHaveClass("custom-class");
  });

  it("renders different sizes correctly", () => {
    const statusInfo = createStatusInfo("synced");

    const { rerender } = render(
      <SyncStatusIndicator statusInfo={statusInfo} size="sm" />
    );
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<SyncStatusIndicator statusInfo={statusInfo} size="md" />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<SyncStatusIndicator statusInfo={statusInfo} size="lg" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("includes tooltip with status information", () => {
    const statusInfo = createStatusInfo("synced");
    render(<SyncStatusIndicator statusInfo={statusInfo} />);

    expect(screen.getByTestId("tooltip-root")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-arrow")).toBeInTheDocument();
  });
});
