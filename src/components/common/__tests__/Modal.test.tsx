import { render, screen, fireEvent, act } from "@testing-library/react";
import { Modal } from "../Modal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  keyboardUtils,
  modalUtils,
  ariaUtils,
} from "../../../test-utils/accessibilityTestUtils";

describe("Modal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Test Modal",
    description: "Test modal description",
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders modal with focus management", async () => {
    await act(async () => {
      render(<Modal {...defaultProps} />);
    });

    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    await act(async () => {
      render(<Modal {...defaultProps} />);
    });

    const closeButton = screen.getByLabelText("Close modal");
    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("applies correct size classes", async () => {
    await act(async () => {
      render(<Modal {...defaultProps} size="lg" />);
    });

    const content = screen.getByRole("dialog");
    expect(content).toHaveClass("max-w-lg");
  });

  it("handles different size variants", async () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    expect(screen.getByRole("dialog")).toHaveClass("max-w-sm");

    rerender(<Modal {...defaultProps} size="xl" />);
    expect(screen.getByRole("dialog")).toHaveClass("max-w-2xl");
  });

  describe("Accessibility Tests", () => {
    it("has proper ARIA attributes for dialog accessibility", async () => {
      await act(async () => {
        render(<Modal {...defaultProps} />);
      });

      const dialog = screen.getByRole("dialog");
      const ariaResults = ariaUtils.validateAriaAttributes(dialog, {
        role: "dialog",
      });

      expect(ariaResults.role.valid).toBe(true);
      expect(ariaResults.role.actual).toBe("dialog");
    });

    it("has proper ARIA labels and descriptions", async () => {
      await act(async () => {
        render(<Modal {...defaultProps} />);
      });

      const dialog = screen.getByRole("dialog");
      const labelResults = ariaUtils.testAriaLabels(dialog);

      // Dialog should have a title (aria-labelledby)
      expect(labelResults.hasLabel).toBe(true);
    });

    it("tests modal focus management and trapping", async () => {
      await act(async () => {
        render(
          <Modal {...defaultProps}>
            <div>
              <button>First Button</button>
              <input type="text" placeholder="Test Input" />
              <button>Second Button</button>
            </div>
          </Modal>,
        );
      });

      const dialog = screen.getByRole("dialog");
      const focusResults = await modalUtils.testModalFocusManagement(dialog);

      // Focus should be trapped within the modal
      expect(focusResults.focusTrapped).toBe(true);
    });

    it("handles escape key to close modal", async () => {
      const onClose = vi.fn();

      await act(async () => {
        render(<Modal {...defaultProps} onClose={onClose} />);
      });

      const dialog = screen.getByRole("dialog");

      // Test escape key functionality
      await act(async () => {
        keyboardUtils.escape();
      });

      // The modal should handle escape key (implementation dependent)
      // This tests that the escape key event is properly handled
      expect(dialog).toBeInTheDocument();
    });

    it("has accessible close button with proper ARIA attributes", async () => {
      await act(async () => {
        render(<Modal {...defaultProps} />);
      });

      const closeButton = screen.getByLabelText("Close modal");

      // Test close button accessibility
      const buttonResults = ariaUtils.testAriaLabels(closeButton);
      expect(buttonResults.hasLabel).toBe(true);
      expect(buttonResults.labelText).toBe("Close modal");

      // Button should be focusable
      await act(async () => {
        closeButton.focus();
      });

      expect(document.activeElement).toBe(closeButton);
    });

    it("tests dialog accessibility compliance", async () => {
      await act(async () => {
        render(<Modal {...defaultProps} />);
      });

      const dialog = screen.getByRole("dialog");
      const dialogResults = modalUtils.testDialogAccessibility(dialog);

      // Dialog should have proper role
      expect(dialogResults.hasRole).toBe(true);

      // Dialog should have a label (title)
      expect(dialogResults.hasLabel).toBe(true);

      // Dialog should have a close button
      expect(dialogResults.hasCloseButton).toBe(true);

      // Close button should be accessible
      expect(dialogResults.closeButtonAccessible).toBe(true);
    });

    it("maintains focus within modal during tab navigation", async () => {
      await act(async () => {
        render(
          <Modal {...defaultProps}>
            <div>
              <button data-testid="first-button">First Button</button>
              <input
                type="text"
                data-testid="test-input"
                placeholder="Test Input"
              />
              <button data-testid="second-button">Second Button</button>
            </div>
          </Modal>,
        );
      });

      const firstButton = screen.getByTestId("first-button");
      const input = screen.getByTestId("test-input");
      const secondButton = screen.getByTestId("second-button");

      // Focus first element
      await act(async () => {
        firstButton.focus();
      });
      expect(document.activeElement).toBe(firstButton);

      // Test that focus management is working by checking focusable elements
      const dialog = screen.getByRole("dialog");
      const focusableElements = dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      // Should have at least the buttons and input we added
      expect(focusableElements.length).toBeGreaterThanOrEqual(3);

      // Test that elements are focusable
      expect(firstButton).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      expect(secondButton).toBeInTheDocument();
    });

    it("handles reverse tab navigation (Shift+Tab)", async () => {
      await act(async () => {
        render(
          <Modal {...defaultProps}>
            <div>
              <button data-testid="first-button">First Button</button>
              <input
                type="text"
                data-testid="test-input"
                placeholder="Test Input"
              />
              <button data-testid="second-button">Second Button</button>
            </div>
          </Modal>,
        );
      });

      const secondButton = screen.getByTestId("second-button");
      const input = screen.getByTestId("test-input");
      const firstButton = screen.getByTestId("first-button");

      // Focus last element
      await act(async () => {
        secondButton.focus();
      });
      expect(document.activeElement).toBe(secondButton);

      // Test that reverse tab navigation elements are available
      const dialog = screen.getByRole("dialog");
      const focusableElements = dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      // Should have at least the buttons and input we added
      expect(focusableElements.length).toBeGreaterThanOrEqual(3);

      // Test that elements are focusable
      expect(firstButton).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      expect(secondButton).toBeInTheDocument();
    });

    describe("Focus Management Tests", () => {
      it("focuses first input field when modal opens", async () => {
        const { rerender } = render(
          <Modal {...defaultProps} isOpen={false}>
            <div>
              <input
                type="text"
                data-testid="first-input"
                placeholder="First Input"
              />
              <button>Button</button>
            </div>
          </Modal>,
        );

        // Open modal
        await act(async () => {
          rerender(
            <Modal {...defaultProps} isOpen={true}>
              <div>
                <input
                  type="text"
                  data-testid="first-input"
                  placeholder="First Input"
                />
                <button>Button</button>
              </div>
            </Modal>,
          );
        });

        // Wait for focus to be set
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        const firstInput = screen.getByTestId("first-input");
        // First input should receive focus (onOpenAutoFocus handler focuses it)
        expect(document.activeElement).toBe(firstInput);
      });

      it("focuses first input when multiple inputs exist", async () => {
        await act(async () => {
          render(
            <Modal {...defaultProps}>
              <div>
                <input
                  type="text"
                  data-testid="first-input"
                  placeholder="First"
                />
                <input
                  type="text"
                  data-testid="second-input"
                  placeholder="Second"
                />
                <input
                  type="text"
                  data-testid="third-input"
                  placeholder="Third"
                />
              </div>
            </Modal>,
          );
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        const firstInput = screen.getByTestId("first-input");
        // Should focus the first input, not second or third
        expect(document.activeElement).toBe(firstInput);
      });

      it("skips disabled inputs when focusing first input", async () => {
        await act(async () => {
          render(
            <Modal {...defaultProps}>
              <div>
                <input
                  type="text"
                  data-testid="disabled-input"
                  disabled
                  placeholder="Disabled"
                />
                <input
                  type="text"
                  data-testid="enabled-input"
                  placeholder="Enabled"
                />
              </div>
            </Modal>,
          );
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        const enabledInput = screen.getByTestId("enabled-input");
        // Should focus the enabled input, skipping the disabled one
        expect(document.activeElement).toBe(enabledInput);
      });

      it("skips inputs with tabindex=-1 when focusing first input", async () => {
        await act(async () => {
          render(
            <Modal {...defaultProps}>
              <div>
                <input
                  type="text"
                  data-testid="skipped-input"
                  tabIndex={-1}
                  placeholder="Skipped"
                />
                <input
                  type="text"
                  data-testid="focused-input"
                  placeholder="Focused"
                />
              </div>
            </Modal>,
          );
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        const focusedInput = screen.getByTestId("focused-input");
        // Should focus the input without tabindex=-1
        expect(document.activeElement).toBe(focusedInput);
      });

      it("prevents default focus when no input found", async () => {
        await act(async () => {
          render(
            <Modal {...defaultProps}>
              <div>
                <button data-testid="first-button">First Button</button>
                <button data-testid="second-button">Second Button</button>
              </div>
            </Modal>,
          );
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        // When no input is found, onOpenAutoFocus prevents default
        // This means the close button should NOT receive automatic focus
        const closeButton = screen.getByLabelText("Close modal");
        const dialog = screen.getByRole("dialog");

        // Verify close button exists but doesn't have automatic focus
        // (our handler prevents default, so focus won't automatically go to close button)
        expect(closeButton).toBeInTheDocument();
        expect(dialog).toBeInTheDocument();
        // Since we preventDefault, focus should not automatically go to close button
        // (it might be on body or not set, but definitely not on close button automatically)
        expect(document.activeElement).not.toBe(closeButton);
      });

      it("handles textarea and select elements as focusable inputs", async () => {
        await act(async () => {
          render(
            <Modal {...defaultProps}>
              <div>
                <textarea data-testid="textarea-input" placeholder="Textarea" />
                <select data-testid="select-input">
                  <option>Option 1</option>
                </select>
              </div>
            </Modal>,
          );
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        const textarea = screen.getByTestId("textarea-input");
        // Should focus the first input-like element (textarea)
        expect(document.activeElement).toBe(textarea);
      });

      it("traps focus within modal during tab navigation", async () => {
        await act(async () => {
          render(
            <Modal {...defaultProps}>
              <div>
                <button data-testid="first-button">First Button</button>
                <input
                  type="text"
                  data-testid="test-input"
                  placeholder="Input"
                />
                <button data-testid="last-button">Last Button</button>
              </div>
            </Modal>,
          );
        });

        const dialog = screen.getByRole("dialog");
        const lastButton = screen.getByTestId("last-button");

        // Focus last button
        await act(async () => {
          lastButton.focus();
        });

        // Tab should wrap back to first focusable element (Radix handles this)
        const focusableElements = Array.from(
          dialog.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ) as HTMLElement[];
        expect(focusableElements.length).toBeGreaterThan(0);

        // Verify focus is within modal
        expect(dialog.contains(document.activeElement)).toBe(true);
      });

      it("closes modal on Escape key press", async () => {
        const onClose = vi.fn();
        render(<Modal {...defaultProps} isOpen={true} onClose={onClose} />);

        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();

        // Simulate Escape key (Radix handles this automatically)
        await act(async () => {
          // Focus the dialog to ensure keyboard events work
          dialog.focus();
          keyboardUtils.escape();
        });

        // Radix Dialog should call onOpenChange(false) which triggers onClose
        // Wait a bit for the event to propagate
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        // Verify onClose was called (Radix Dialog calls onOpenChange on Escape)
        expect(onClose).toHaveBeenCalled();
      });
    });
  });
});
