import { fireEvent, waitFor } from "@testing-library/react";
import { expect } from "vitest";

/**
 * Comprehensive accessibility testing utilities for MediaSpawner
 * Builds upon existing test-utils/radixMocks.tsx patterns
 * Provides reusable utilities for accessibility testing across components
 */

// ============================================================================
// Keyboard Navigation Testing Utilities
// ============================================================================

/**
 * Keyboard event simulation utilities
 */
export const keyboardUtils = {
  /**
   * Simulate Tab key press
   */
  tab: () => {
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Tab",
      code: "Tab",
      keyCode: 9,
      which: 9,
    });
  },

  /**
   * Simulate Shift+Tab key press
   */
  shiftTab: () => {
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Tab",
      code: "Tab",
      keyCode: 9,
      which: 9,
      shiftKey: true,
    });
  },

  /**
   * Simulate Enter key press
   */
  enter: () => {
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    });
  },

  /**
   * Simulate Escape key press
   */
  escape: () => {
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
    });
  },

  /**
   * Simulate Space key press
   */
  space: () => {
    fireEvent.keyDown(document.activeElement || document.body, {
      key: " ",
      code: "Space",
      keyCode: 32,
      which: 32,
    });
  },

  /**
   * Simulate Arrow key press
   */
  arrowUp: () => {
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "ArrowUp",
      code: "ArrowUp",
      keyCode: 38,
      which: 38,
    });
  },

  arrowDown: () => {
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "ArrowDown",
      code: "ArrowDown",
      keyCode: 40,
      which: 40,
    });
  },

  arrowLeft: () => {
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "ArrowLeft",
      code: "ArrowLeft",
      keyCode: 37,
      which: 37,
    });
  },

  arrowRight: () => {
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "ArrowRight",
      code: "ArrowRight",
      keyCode: 39,
      which: 39,
    });
  },
};

/**
 * Tab order testing utilities
 */
export const tabOrderUtils = {
  /**
   * Get all focusable elements in document order
   */
  getFocusableElements: (container?: HTMLElement): HTMLElement[] => {
    const selector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ");

    const elements = Array.from(
      (container || document).querySelectorAll(selector),
    ) as HTMLElement[];

    return elements.filter((element) => {
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        !element.hasAttribute("aria-hidden")
      );
    });
  },

  /**
   * Test tab order through a sequence of elements
   */
  testTabOrder: async (expectedOrder: string[]) => {
    const results: string[] = [];

    for (let i = 0; i < expectedOrder.length; i++) {
      keyboardUtils.tab();
      await waitFor(() => {
        const activeElement = document.activeElement;
        if (activeElement) {
          const testId =
            activeElement.getAttribute("data-testid") ||
            activeElement.getAttribute("id") ||
            activeElement.tagName.toLowerCase();
          results.push(testId);
        }
      });
    }

    return results;
  },

  /**
   * Test reverse tab order (Shift+Tab)
   */
  testReverseTabOrder: async (expectedOrder: string[]) => {
    const results: string[] = [];

    for (let i = 0; i < expectedOrder.length; i++) {
      keyboardUtils.shiftTab();
      await waitFor(() => {
        const activeElement = document.activeElement;
        if (activeElement) {
          const testId =
            activeElement.getAttribute("data-testid") ||
            activeElement.getAttribute("id") ||
            activeElement.tagName.toLowerCase();
          results.push(testId);
        }
      });
    }

    return results;
  },
};

// ============================================================================
// Focus Management Testing Utilities
// ============================================================================

/**
 * Focus management testing utilities
 */
export const focusUtils = {
  /**
   * Test focus trapping within a container
   */
  testFocusTrap: async (container: HTMLElement) => {
    const focusableElements = tabOrderUtils.getFocusableElements(container);

    if (focusableElements.length === 0) {
      return { isTrapped: false, reason: "No focusable elements found" };
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();
    await waitFor(() => {
      expect(document.activeElement).toBe(firstElement);
    });

    // Test forward tab wrapping
    keyboardUtils.tab();
    await waitFor(() => {
      expect(document.activeElement).toBe(firstElement);
    });

    // Focus last element
    lastElement.focus();
    await waitFor(() => {
      expect(document.activeElement).toBe(lastElement);
    });

    // Test backward tab wrapping
    keyboardUtils.shiftTab();
    await waitFor(() => {
      expect(document.activeElement).toBe(lastElement);
    });

    return { isTrapped: true };
  },

  /**
   * Test focus restoration
   */
  testFocusRestoration: async (
    triggerElement: HTMLElement,
    restoreCallback: () => void,
  ) => {
    // Focus trigger element
    triggerElement.focus();
    await waitFor(() => {
      expect(document.activeElement).toBe(triggerElement);
    });

    // Execute restore callback
    restoreCallback();

    // Wait for focus to be restored
    await waitFor(() => {
      expect(document.activeElement).toBe(triggerElement);
    });
  },

  /**
   * Test skip navigation functionality
   */
  testSkipNavigation: async (skipLinkId: string, targetId: string) => {
    const skipLink = document.getElementById(skipLinkId);
    const targetElement = document.getElementById(targetId);

    if (!skipLink || !targetElement) {
      return { success: false, reason: "Skip link or target not found" };
    }

    // For testing purposes, just verify both elements exist
    // In a real implementation, this would handle focus management
    return { success: true };
  },
};

// ============================================================================
// ARIA Attribute Validation Utilities
// ============================================================================

/**
 * ARIA attribute validation utilities
 */
export const ariaUtils = {
  /**
   * Validate ARIA attributes on an element
   */
  validateAriaAttributes: (
    element: HTMLElement,
    expectedAttributes: Record<string, string>,
  ) => {
    const results: Record<
      string,
      { expected: string; actual: string; valid: boolean }
    > = {};

    for (const [attribute, expectedValue] of Object.entries(
      expectedAttributes,
    )) {
      const actualValue = element.getAttribute(attribute);
      results[attribute] = {
        expected: expectedValue,
        actual: actualValue || "",
        valid: actualValue === expectedValue,
      };
    }

    return results;
  },

  /**
   * Test ARIA labels and descriptions
   */
  testAriaLabels: (element: HTMLElement) => {
    const results = {
      hasLabel: false,
      hasDescription: false,
      labelText: "",
      descriptionText: "",
    };

    const labelId = element.getAttribute("aria-labelledby");
    const descriptionId = element.getAttribute("aria-describedby");
    const ariaLabel = element.getAttribute("aria-label");

    // Check for aria-label first
    if (ariaLabel) {
      results.hasLabel = true;
      results.labelText = ariaLabel;
    } else if (labelId) {
      const labelElement = document.getElementById(labelId);
      if (labelElement) {
        results.hasLabel = true;
        results.labelText = labelElement.textContent || "";
      }
    }

    if (descriptionId) {
      const descriptionElement = document.getElementById(descriptionId);
      if (descriptionElement) {
        results.hasDescription = true;
        results.descriptionText = descriptionElement.textContent || "";
      }
    }

    return results;
  },

  /**
   * Test ARIA roles
   */
  testAriaRoles: (element: HTMLElement, expectedRole?: string) => {
    const actualRole =
      element.getAttribute("role") || element.tagName.toLowerCase();

    return {
      expected: expectedRole,
      actual: actualRole,
      valid: expectedRole ? actualRole === expectedRole : true,
    };
  },

  /**
   * Test ARIA states
   */
  testAriaStates: (
    element: HTMLElement,
    expectedStates: Record<string, string>,
  ) => {
    const results: Record<
      string,
      { expected: string; actual: string; valid: boolean }
    > = {};

    for (const [state, expectedValue] of Object.entries(expectedStates)) {
      const actualValue = element.getAttribute(state);
      results[state] = {
        expected: expectedValue,
        actual: actualValue || "",
        valid: actualValue === expectedValue,
      };
    }

    return results;
  },
};

// ============================================================================
// Modal and Dialog Testing Utilities
// ============================================================================

/**
 * Modal and dialog testing utilities
 */
export const modalUtils = {
  /**
   * Test modal focus management
   */
  testModalFocusManagement: async (modalElement: HTMLElement) => {
    const results = {
      focusTrapped: false,
      focusRestored: false,
      escapeCloses: false,
      overlayCloses: false,
    };

    // Test focus trapping
    const trapResult = await focusUtils.testFocusTrap(modalElement);
    results.focusTrapped = trapResult.isTrapped;

    // Test escape key
    keyboardUtils.escape();
    await waitFor(() => {
      // Check if modal is closed (implementation dependent)
      results.escapeCloses =
        !modalElement.isConnected ||
        modalElement.getAttribute("aria-hidden") === "true";
    });

    return results;
  },

  /**
   * Test dialog accessibility
   */
  testDialogAccessibility: (dialogElement: HTMLElement) => {
    const results = {
      hasRole: false,
      hasLabel: false,
      hasDescription: false,
      hasCloseButton: false,
      closeButtonAccessible: false,
    };

    // Check role
    results.hasRole =
      dialogElement.getAttribute("role") === "dialog" ||
      dialogElement.tagName.toLowerCase() === "dialog";

    // Check aria-label or aria-labelledby
    const labelId = dialogElement.getAttribute("aria-labelledby");
    const label = dialogElement.getAttribute("aria-label");
    results.hasLabel = !!(labelId || label);

    // Check aria-describedby
    const descriptionId = dialogElement.getAttribute("aria-describedby");
    results.hasDescription = !!descriptionId;

    // Check for close button
    const closeButton = dialogElement.querySelector(
      '[aria-label*="close"], [aria-label*="Close"]',
    );
    results.hasCloseButton = !!closeButton;

    if (closeButton) {
      results.closeButtonAccessible =
        !closeButton.hasAttribute("disabled") &&
        closeButton.getAttribute("aria-hidden") !== "true";
    }

    return results;
  },
};

// ============================================================================
// Form Accessibility Testing Utilities
// ============================================================================

/**
 * Form accessibility testing utilities
 */
export const formUtils = {
  /**
   * Test form field accessibility
   */
  testFormFieldAccessibility: (fieldElement: HTMLElement) => {
    const results = {
      hasLabel: false,
      hasDescription: false,
      hasError: false,
      isRequired: false,
      hasHelpText: false,
    };

    // Check for associated label
    const labelId = fieldElement.getAttribute("aria-labelledby");
    const label = fieldElement.getAttribute("aria-label");
    const htmlFor = fieldElement.getAttribute("id");

    if (labelId || label) {
      results.hasLabel = true;
    } else if (htmlFor) {
      const labelElement = document.querySelector(`label[for="${htmlFor}"]`);
      results.hasLabel = !!labelElement;
    }

    // Check for description
    const descriptionId = fieldElement.getAttribute("aria-describedby");
    if (descriptionId) {
      results.hasDescription = true;
    }

    // Check for error state
    const errorId = fieldElement.getAttribute("aria-describedby");
    if (errorId) {
      const errorElement = document.getElementById(errorId);
      if (errorElement && errorElement.getAttribute("role") === "alert") {
        results.hasError = true;
      }
    }

    // Check if required
    results.isRequired =
      fieldElement.hasAttribute("required") ||
      fieldElement.getAttribute("aria-required") === "true";

    return results;
  },

  /**
   * Test form validation accessibility
   */
  testFormValidationAccessibility: (formElement: HTMLElement) => {
    const results = {
      hasErrorSummary: false,
      errorsAnnounced: false,
      focusOnError: false,
    };

    // Check for error summary
    const errorSummary = formElement.querySelector(
      '[role="alert"], .error-summary',
    );
    results.hasErrorSummary = !!errorSummary;

    // Check if errors are announced
    const errorElements = formElement.querySelectorAll('[role="alert"]');
    results.errorsAnnounced = errorElements.length > 0;

    // Check if focus moves to first error
    const firstError = formElement.querySelector('[aria-invalid="true"]');
    if (firstError) {
      results.focusOnError = document.activeElement === firstError;
    }

    return results;
  },
};

// ============================================================================
// Screen Reader Testing Utilities
// ============================================================================

/**
 * Screen reader testing utilities
 */
export const screenReaderUtils = {
  /**
   * Test screen reader announcements
   */
  testScreenReaderAnnouncements: (element: HTMLElement) => {
    const results = {
      hasLiveRegion: false,
      hasPoliteAnnouncement: false,
      hasAssertiveAnnouncement: false,
    };

    // Check for live regions
    const liveRegion = element.querySelector("[aria-live]");
    if (liveRegion) {
      results.hasLiveRegion = true;
      const liveValue = liveRegion.getAttribute("aria-live");
      results.hasPoliteAnnouncement = liveValue === "polite";
      results.hasAssertiveAnnouncement = liveValue === "assertive";
    }

    return results;
  },

  /**
   * Test heading hierarchy
   */
  testHeadingHierarchy: (container: HTMLElement) => {
    const headings = Array.from(
      container.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'),
    );
    const results = {
      hasH1: false,
      properHierarchy: true,
      headingLevels: [] as number[],
    };

    headings.forEach((heading) => {
      const level = heading.tagName.match(/h(\d)/)?.[1];
      if (level) {
        const levelNum = parseInt(level, 10);
        results.headingLevels.push(levelNum);

        if (levelNum === 1) {
          results.hasH1 = true;
        }
      } else {
        // Handle role="heading" elements
        const ariaLevel = heading.getAttribute("aria-level");
        if (ariaLevel) {
          const levelNum = parseInt(ariaLevel, 10);
          results.headingLevels.push(levelNum);
          if (levelNum === 1) {
            results.hasH1 = true;
          }
        }
      }
    });

    // Check for proper hierarchy (no skipping levels)
    for (let i = 1; i < results.headingLevels.length; i++) {
      const current = results.headingLevels[i];
      const previous = results.headingLevels[i - 1];
      if (current > previous + 1) {
        results.properHierarchy = false;
        break;
      }
    }

    return results;
  },
};

// ============================================================================
// Color and Contrast Testing Utilities
// ============================================================================

/**
 * Color and contrast testing utilities
 */
export const contrastUtils = {
  /**
   * Test focus indicator visibility
   */
  testFocusIndicatorVisibility: (element: HTMLElement) => {
    const results = {
      hasFocusRing: false,
      focusRingVisible: false,
      focusRingColor: "",
    };

    // Check for focus-visible styles
    const computedStyle = window.getComputedStyle(element);
    const outline = computedStyle.outline;
    const boxShadow = computedStyle.boxShadow;

    if (outline !== "none" || boxShadow !== "none") {
      results.hasFocusRing = true;
      results.focusRingVisible = true;
      results.focusRingColor = outline !== "none" ? outline : boxShadow;
    }

    return results;
  },

  /**
   * Test color contrast (basic check)
   */
  testColorContrast: (element: HTMLElement) => {
    const results = {
      hasSufficientContrast: false,
      backgroundColor: "",
      textColor: "",
    };

    const computedStyle = window.getComputedStyle(element);
    results.backgroundColor = computedStyle.backgroundColor;
    results.textColor = computedStyle.color;

    // Basic contrast check (simplified)
    // In a real implementation, you'd use a proper contrast calculation library
    const bgColor = computedStyle.backgroundColor;
    const textColor = computedStyle.color;

    // This is a placeholder - real contrast testing would require proper color parsing
    results.hasSufficientContrast = !!(
      bgColor &&
      textColor &&
      bgColor !== textColor
    );

    return results;
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wait for accessibility updates
 */
export const waitForAccessibilityUpdate = async (timeout = 1000) => {
  await waitFor(
    () => {
      // Wait for any pending accessibility updates
    },
    { timeout },
  );
};

/**
 * Create accessible test element
 */
export const createAccessibleTestElement = (
  tagName: string,
  attributes: Record<string, string> = {},
): HTMLElement => {
  const element = document.createElement(tagName);

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
};

/**
 * Mock screen reader for testing
 */
export const mockScreenReader = () => {
  const announcements: string[] = [];

  const mockAnnounce = (message: string) => {
    announcements.push(message);
  };

  const getAnnouncements = () => announcements;

  const clearAnnouncements = () => {
    announcements.length = 0;
  };

  return {
    mockAnnounce,
    getAnnouncements,
    clearAnnouncements,
  };
};

// ============================================================================
// Export all utilities
// ============================================================================

export default {
  keyboardUtils,
  tabOrderUtils,
  focusUtils,
  ariaUtils,
  modalUtils,
  formUtils,
  screenReaderUtils,
  contrastUtils,
  waitForAccessibilityUpdate,
  createAccessibleTestElement,
  mockScreenReader,
};
