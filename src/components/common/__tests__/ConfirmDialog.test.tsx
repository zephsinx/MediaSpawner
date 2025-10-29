import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConfirmDialog } from "../ConfirmDialog";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the focus management hook
vi.mock("../../hooks/useFocusManagement", () => ({
  useModalFocusManagement: () => ({
    containerRef: { current: null },
    initializeFocusManagement: vi.fn(() => vi.fn()),
    cleanupFocusManagement: vi.fn(),
  }),
}));

describe("ConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders confirm dialog with focus management", async () => {
    await act(async () => {
      render(<ConfirmDialog {...defaultProps} />);
    });

    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to proceed?"),
    ).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    await act(async () => {
      render(<ConfirmDialog {...defaultProps} />);
    });

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    await act(async () => {
      render(<ConfirmDialog {...defaultProps} />);
    });

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("renders different variants correctly", async () => {
    const { rerender } = render(
      <ConfirmDialog {...defaultProps} variant="warning" />,
    );
    // Check for outline variant classes
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass(
      "border",
    );

    rerender(<ConfirmDialog {...defaultProps} variant="info" />);
    // Check for primary variant classes
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveClass(
      "bg-[rgb(var(--color-accent))]",
    );
  });

  it("renders custom button text", async () => {
    await act(async () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          confirmText="Delete"
          cancelText="Keep"
        />,
      );
    });

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });
});
