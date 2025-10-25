import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { ProfileActionsDropdown } from "../ProfileActionsDropdown";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";

// Mock Radix UI DropdownMenu to avoid complexity in tests
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
}));

describe("ProfileActionsDropdown", () => {
  const mockOnCreateProfile = vi.fn();
  const mockOnEditProfile = vi.fn();
  const mockOnDeleteProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders primary Create Profile button", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      expect(screen.getByText("Create Profile")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Additional profile actions"),
      ).toBeInTheDocument();
    });

    it("renders dropdown trigger button", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      expect(dropdownTrigger).toBeInTheDocument();
    });
  });

  describe("Functionality", () => {
    it("calls onCreateProfile when Create Profile button is clicked", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));
      expect(mockOnCreateProfile).toHaveBeenCalledTimes(1);
    });

    it("opens dropdown and shows Edit/Delete options when trigger is clicked", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);

      expect(
        screen.getByRole("menuitem", { name: "Edit Profile" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: "Delete Profile" }),
      ).toBeInTheDocument();
    });

    it("calls onEditProfile when Edit Profile is clicked", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);

      fireEvent.click(screen.getByRole("menuitem", { name: "Edit Profile" }));
      expect(mockOnEditProfile).toHaveBeenCalledTimes(1);
    });

    it("calls onDeleteProfile when Delete Profile is clicked", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);

      fireEvent.click(screen.getByRole("menuitem", { name: "Delete Profile" }));
      expect(mockOnDeleteProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe("Disabled States", () => {
    it("disables Edit and Delete buttons when hasActiveProfile is false", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={false}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);

      const editButton = screen.getByRole("menuitem", { name: "Edit Profile" });
      const deleteButton = screen.getByRole("menuitem", {
        name: "Delete Profile",
      });

      expect(editButton).toHaveAttribute("aria-disabled", "true");
      expect(deleteButton).toHaveAttribute("aria-disabled", "true");
    });

    it("enables Edit and Delete buttons when hasActiveProfile is true", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);

      const editButton = screen.getByRole("menuitem", { name: "Edit Profile" });
      const deleteButton = screen.getByRole("menuitem", {
        name: "Delete Profile",
      });

      expect(editButton).not.toHaveAttribute("aria-disabled", "true");
      expect(deleteButton).not.toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      expect(screen.getByLabelText("Create Profile")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Additional profile actions"),
      ).toBeInTheDocument();
    });

    it("has proper ARIA attributes on dropdown trigger", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />,
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      expect(dropdownTrigger).toHaveAttribute("aria-haspopup", "menu");
      expect(dropdownTrigger).toHaveAttribute("aria-expanded", "false");
    });
  });
});
