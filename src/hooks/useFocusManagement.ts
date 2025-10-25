import { useRef, useCallback, useMemo } from "react";

/**
 * Focus management utilities for accessibility
 */
export interface FocusManagementOptions {
  /** Whether to trap focus within the container */
  trapFocus?: boolean;
  /** Whether to restore focus when the component unmounts */
  restoreFocus?: boolean;
  /** Custom selector for focusable elements */
  focusableSelector?: string;
}

/**
 * Focus management hook providing utilities for focus trapping, restoration, and skip navigation
 *
 * @param options - Configuration options for focus management
 * @returns Object containing focus management utilities
 */
export function useFocusManagement(options: FocusManagementOptions = {}) {
  const {
    trapFocus = false,
    restoreFocus = false,
    focusableSelector = '[tabindex]:not([tabindex="-1"]), button, input, select, textarea, a[href], [contenteditable="true"]',
  } = options;

  // Store references to maintain focus state
  const containerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<Element | null>(null);
  const firstFocusableElementRef = useRef<HTMLElement | null>(null);
  const lastFocusableElementRef = useRef<HTMLElement | null>(null);

  /**
   * Get all focusable elements within a container
   */
  const getFocusableElements = useCallback(
    (container: HTMLElement): HTMLElement[] => {
      const elements = Array.from(
        container.querySelectorAll(focusableSelector),
      ) as HTMLElement[];

      return elements.filter((element) => {
        // Check if element is visible and not disabled
        const style = window.getComputedStyle(element);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          !element.hasAttribute("disabled") &&
          !element.hasAttribute("aria-hidden")
        );
      });
    },
    [focusableSelector],
  );

  /**
   * Set up focus trapping within a container
   */
  const setupFocusTrap = useCallback(
    (container: HTMLElement) => {
      const focusableElements = getFocusableElements(container);

      if (focusableElements.length === 0) return;

      firstFocusableElementRef.current = focusableElements[0];
      lastFocusableElementRef.current =
        focusableElements[focusableElements.length - 1];

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;

        if (event.shiftKey) {
          // Shift + Tab: moving backwards
          if (document.activeElement === firstFocusableElementRef.current) {
            event.preventDefault();
            lastFocusableElementRef.current?.focus();
          }
        } else {
          // Tab: moving forwards
          if (document.activeElement === lastFocusableElementRef.current) {
            event.preventDefault();
            firstFocusableElementRef.current?.focus();
          }
        }
      };

      container.addEventListener("keydown", handleKeyDown);

      // Focus the first element when trap is activated, but only if no element is already focused within the container
      const currentActiveElement = document.activeElement as HTMLElement;
      const isElementWithinContainer = container.contains(currentActiveElement);

      if (!isElementWithinContainer) {
        firstFocusableElementRef.current?.focus();
      }

      return () => {
        container.removeEventListener("keydown", handleKeyDown);
      };
    },
    [getFocusableElements],
  );

  /**
   * Restore focus to the previously focused element
   */
  const restoreFocusToPrevious = useCallback(() => {
    if (
      previousActiveElementRef.current &&
      previousActiveElementRef.current instanceof HTMLElement
    ) {
      previousActiveElementRef.current.focus();
    }
  }, []);

  /**
   * Initialize focus management for a container
   */
  const initializeFocusManagement = useCallback(
    (container: HTMLElement | null) => {
      if (!container) return undefined;

      containerRef.current = container;

      // Store the currently focused element for restoration
      if (restoreFocus) {
        previousActiveElementRef.current = document.activeElement;
      }

      // Set up focus trapping if enabled
      if (trapFocus) {
        return setupFocusTrap(container);
      }

      return undefined;
    },
    [trapFocus, restoreFocus, setupFocusTrap],
  );

  /**
   * Clean up focus management
   */
  const cleanupFocusManagement = useCallback(() => {
    if (restoreFocus) {
      restoreFocusToPrevious();
    }

    containerRef.current = null;
    firstFocusableElementRef.current = null;
    lastFocusableElementRef.current = null;
  }, [restoreFocus, restoreFocusToPrevious]);

  /**
   * Skip to a specific element by ID
   */
  const skipToElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element && element instanceof HTMLElement) {
      element.focus();
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  /**
   * Skip to the next focusable element
   */
  const skipToNext = useCallback(() => {
    const focusableElements = getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement,
    );

    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1]?.focus();
    }
  }, [getFocusableElements]);

  /**
   * Skip to the previous focusable element
   */
  const skipToPrevious = useCallback(() => {
    const focusableElements = getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement,
    );

    if (currentIndex > 0) {
      focusableElements[currentIndex - 1]?.focus();
    }
  }, [getFocusableElements]);

  /**
   * Get the current focusable element
   */
  const getCurrentFocusableElement = useCallback(() => {
    return document.activeElement as HTMLElement | null;
  }, []);

  /**
   * Check if an element is focusable
   */
  const isFocusable = useCallback(
    (element: HTMLElement) => {
      const focusableElements = getFocusableElements(document.body);
      return focusableElements.includes(element);
    },
    [getFocusableElements],
  );

  return useMemo(
    () => ({
      // Core focus management
      initializeFocusManagement,
      cleanupFocusManagement,

      // Focus utilities
      getFocusableElements,
      getCurrentFocusableElement,
      isFocusable,

      // Skip navigation utilities
      skipToElement,
      skipToNext,
      skipToPrevious,

      // Focus restoration
      restoreFocus: restoreFocusToPrevious,

      // Refs for external use
      containerRef,
      previousActiveElementRef,
      firstFocusableElementRef,
      lastFocusableElementRef,
    }),
    [
      initializeFocusManagement,
      cleanupFocusManagement,
      getFocusableElements,
      getCurrentFocusableElement,
      isFocusable,
      skipToElement,
      skipToNext,
      skipToPrevious,
      restoreFocusToPrevious,
      containerRef,
      previousActiveElementRef,
      firstFocusableElementRef,
      lastFocusableElementRef,
    ],
  );
}

/**
 * Hook specifically for modal focus management
 * Combines focus trapping and restoration for modal dialogs
 */
export function useModalFocusManagement() {
  const focusManagement = useFocusManagement({
    trapFocus: true,
    restoreFocus: true,
  });

  return focusManagement;
}

/**
 * Hook for skip navigation utilities
 * Provides helpers for implementing skip links
 */
export function useSkipNavigation() {
  const focusManagement = useFocusManagement();

  return {
    skipToElement: focusManagement.skipToElement,
    skipToNext: focusManagement.skipToNext,
    skipToPrevious: focusManagement.skipToPrevious,
    getFocusableElements: focusManagement.getFocusableElements,
  };
}
