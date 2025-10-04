import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileFormDialog } from "../ProfileFormDialog";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";
import { SpawnProfileService } from "../../../services/spawnProfileService";
import type { SpawnProfile } from "../../../types/spawn";

// Mock the SpawnProfileService
vi.mock("../../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSpawnProfileService = vi.mocked(SpawnProfileService);

describe("ProfileFormDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockToast = vi.mocked(require("sonner").toast);

  const mockProfile: SpawnProfile = {
    id: "profile-1",
    name: "Test Profile",
    description: "Test description",
    spawns: [],
    lastModified: Date.now(),
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Mode", () => {
    it("renders create dialog with correct title", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Create Profile")).toBeInTheDocument();
      expect(screen.getByLabelText("Profile Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
    });

    it("renders form fields with correct placeholders", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(
        screen.getByPlaceholderText("Enter profile name...")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter profile description (optional)...")
      ).toBeInTheDocument();
    });

    it("shows helper text for form fields", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(
        screen.getByText("A unique name to identify this profile")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Optional description of the profile's purpose")
      ).toBeInTheDocument();
    });

    it("has correct button text for create mode", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText("Create Profile")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    it("renders edit dialog with correct title", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    });

    it("pre-fills form fields with profile data", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const nameInput = screen.getByDisplayValue("Test Profile");
      const descriptionInput = screen.getByDisplayValue("Test description");

      expect(nameInput).toBeInTheDocument();
      expect(descriptionInput).toBeInTheDocument();
    });

    it("has correct button text for edit mode", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      expect(screen.getByText("Update Profile")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("shows error for empty profile name", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByText("Create Profile");
      await user.click(submitButton);

      expect(screen.getByText("Profile name is required")).toBeInTheDocument();
    });

    it("shows error for profile name that is too long", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText("Profile Name");
      const longName = "a".repeat(101);
      await user.type(nameInput, longName);

      const submitButton = screen.getByText("Create Profile");
      await user.click(submitButton);

      expect(
        screen.getByText("Profile name must be less than 100 characters")
      ).toBeInTheDocument();
    });

    it("shows error for description that is too long", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText("Profile Name");
      const descriptionInput = screen.getByLabelText("Description");

      await user.type(nameInput, "Valid Name");
      const longDescription = "a".repeat(501);
      await user.type(descriptionInput, longDescription);

      const submitButton = screen.getByText("Create Profile");
      await user.click(submitButton);

      expect(
        screen.getByText("Description must be less than 500 characters")
      ).toBeInTheDocument();
    });

    it("clears field errors when user starts typing", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Trigger validation error
      const submitButton = screen.getByText("Create Profile");
      await user.click(submitButton);
      expect(screen.getByText("Profile name is required")).toBeInTheDocument();

      // Start typing to clear error
      const nameInput = screen.getByLabelText("Profile Name");
      await user.type(nameInput, "Test");

      expect(
        screen.queryByText("Profile name is required")
      ).not.toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("calls createProfile service for new profiles", async () => {
      const user = userEvent.setup();
      const mockCreatedProfile = { ...mockProfile, id: "new-profile" };
      mockSpawnProfileService.createProfile.mockReturnValue({
        success: true,
        profile: mockCreatedProfile,
      });

      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText("Profile Name");
      const descriptionInput = screen.getByLabelText("Description");

      await user.type(nameInput, "New Profile");
      await user.type(descriptionInput, "New description");

      const submitButton = screen.getByText("Create Profile");
      await user.click(submitButton);

      expect(mockSpawnProfileService.createProfile).toHaveBeenCalledWith(
        "New Profile",
        "New description"
      );
      expect(mockOnSuccess).toHaveBeenCalledWith(mockCreatedProfile);
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        "Profile created successfully"
      );
    });

    it("calls updateProfile service for existing profiles", async () => {
      const user = userEvent.setup();
      const mockUpdatedProfile = { ...mockProfile, name: "Updated Profile" };
      mockSpawnProfileService.updateProfile.mockReturnValue({
        success: true,
        profile: mockUpdatedProfile,
      });

      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const nameInput = screen.getByLabelText("Profile Name");
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Profile");

      const submitButton = screen.getByText("Update Profile");
      await user.click(submitButton);

      expect(mockSpawnProfileService.updateProfile).toHaveBeenCalledWith(
        mockProfile.id,
        {
          name: "Updated Profile",
          description: "Test description",
        }
      );
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUpdatedProfile);
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        "Profile updated successfully"
      );
    });

    it("handles service errors gracefully", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.createProfile.mockReturnValue({
        success: false,
        error: "Profile name already exists",
      });

      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText("Profile Name");
      await user.type(nameInput, "Duplicate Name");

      const submitButton = screen.getByText("Create Profile");
      await user.click(submitButton);

      expect(
        screen.getByText("Profile name already exists")
      ).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalledWith(
        "Profile name already exists"
      );
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("handles unexpected errors", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.createProfile.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText("Profile Name");
      await user.type(nameInput, "Test Profile");

      const submitButton = screen.getByText("Create Profile");
      await user.click(submitButton);

      expect(screen.getByText("Unexpected error")).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalledWith("Unexpected error");
    });
  });

  describe("User Interactions", () => {
    it("closes dialog when cancel button is clicked", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("closes dialog when close button is clicked", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const closeButton = screen.getByLabelText("Close modal");
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("disables submit button when form is invalid", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByText("Create Profile");
      expect(submitButton).toBeDisabled();
    });

    it("enables submit button when form is valid", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText("Profile Name");
      await user.type(nameInput, "Valid Name");

      const submitButton = screen.getByText("Create Profile");
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByLabelText("Profile Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
      expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
    });

    it("has proper form associations", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText("Profile Name");
      const descriptionInput = screen.getByLabelText("Description");

      expect(nameInput).toHaveAttribute("required");
      expect(nameInput).toHaveAttribute("maxLength", "100");
      expect(descriptionInput).toHaveAttribute("maxLength", "500");
    });
  });

  describe("Loading States", () => {
    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.createProfile.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ success: true, profile: mockProfile }),
              100
            )
          )
      );

      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText("Profile Name");
      await user.type(nameInput, "Test Profile");

      const submitButton = screen.getByText("Create Profile");
      await user.click(submitButton);

      expect(screen.getByText("Creating...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });
});
