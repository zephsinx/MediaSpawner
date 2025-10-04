import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { ProfileActionsDropdown } from "../ProfileActionsDropdown";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";

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
        />
      );

      expect(screen.getByText("Create Profile")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Additional profile actions")
      ).toBeInTheDocument();
    });

    it("renders dropdown trigger button", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions"
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
        />
      );

      fireEvent.click(screen.getByText("Create Profile"));
      expect(mockOnCreateProfile).toHaveBeenCalledTimes(1);
    });

    it("opens dropdown and shows Edit/Delete options when trigger is clicked", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions"
      );
      fireEvent.click(dropdownTrigger);

      expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      expect(screen.getByText("Delete Profile")).toBeInTheDocument();
    });

    it("calls onEditProfile when Edit Profile is clicked", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions"
      );
      fireEvent.click(dropdownTrigger);

      fireEvent.click(screen.getByText("Edit Profile"));
      expect(mockOnEditProfile).toHaveBeenCalledTimes(1);
    });

    it("calls onDeleteProfile when Delete Profile is clicked", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions"
      );
      fireEvent.click(dropdownTrigger);

      fireEvent.click(screen.getByText("Delete Profile"));
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
        />
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions"
      );
      fireEvent.click(dropdownTrigger);

      const editButton = screen.getByText("Edit Profile");
      const deleteButton = screen.getByText("Delete Profile");

      expect(editButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it("enables Edit and Delete buttons when hasActiveProfile is true", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions"
      );
      fireEvent.click(dropdownTrigger);

      const editButton = screen.getByText("Edit Profile");
      const deleteButton = screen.getByText("Delete Profile");

      expect(editButton).not.toBeDisabled();
      expect(deleteButton).not.toBeDisabled();
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
        />
      );

      expect(screen.getByLabelText("Create Profile")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Additional profile actions")
      ).toBeInTheDocument();
    });

    it("has proper ARIA attributes on dropdown trigger", () => {
      renderWithAllProviders(
        <ProfileActionsDropdown
          hasActiveProfile={true}
          onCreateProfile={mockOnCreateProfile}
          onEditProfile={mockOnEditProfile}
          onDeleteProfile={mockOnDeleteProfile}
        />
      );

      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions"
      );
      expect(dropdownTrigger).toHaveAttribute("aria-haspopup", "menu");
      expect(dropdownTrigger).toHaveAttribute("aria-expanded", "false");
    });
  });
});
