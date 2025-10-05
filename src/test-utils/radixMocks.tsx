import React from "react";

/**
 * Shared Radix UI mocking utilities for consistent testing across the project
 * These mocks simplify Radix UI components for testing while maintaining their essential behavior
 */

// DropdownMenu mock based on Header.test.tsx pattern
export const createDropdownMenuMock = () => ({
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
    <div data-testid="dropdown-content" role="menu">
      {children}
    </div>
  ),
  Item: ({
    children,
    onSelect,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onSelect?: (e: Event) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="dropdown-item"
      role="menuitem"
      onClick={(e) => {
        if (!disabled && onSelect) {
          onSelect(e as unknown as Event);
        }
      }}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </div>
  ),
});

// Dialog mock for ProfileFormDialog and ProfileDeletionDialog
export const createDialogMock = () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-root">{children}</div>
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
      <div data-testid="dialog-trigger">{children}</div>
    ),
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-portal">{children}</div>
  ),
  Overlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-overlay">{children}</div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content" role="dialog">
      {children}
    </div>
  ),
  Title: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title" role="heading">
      {children}
    </h2>
  ),
  Description: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  Close: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="dialog-close" aria-label="Close modal">
      {children}
    </button>
  ),
});

// Tooltip mock based on SettingsButton.test.tsx pattern
export const createTooltipMock = () => ({
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
  Provider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
});

// Switch mock for ThemeToggle
export const createSwitchMock = () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="switch-root">{children}</div>
  ),
  Thumb: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="switch-thumb">{children}</div>
  ),
});

// Label mock for form components
export const createLabelMock = () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <label data-testid="label-root">{children}</label>
  ),
});
