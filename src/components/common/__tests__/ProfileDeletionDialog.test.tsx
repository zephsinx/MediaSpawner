import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileDeletionDialog } from "../ProfileDeletionDialog";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";
import { SpawnProfileService } from "../../../services/spawnProfileService";
import type { SpawnProfile } from "../../../types/spawn";

// Mock the SpawnProfileService
vi.mock("../../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    deleteProfile: vi.fn(),
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

describe("ProfileDeletionDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockToast = vi.mocked(require("sonner").toast);

  const mockProfile: SpawnProfile = {
    id: "profile-1",
    name: "Test Profile",
    description: "Test description",
    spawns: [
      {
        id: "spawn-1",
        name: "Spawn 1",
        enabled: true,
        assets: [],
        triggers: [],
      },
      {
        id: "spawn-2",
        name: "Spawn 2",
        enabled: false,
        assets: [],
        triggers: [],
      },
    ],
    lastModified: Date.now(),
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders dialog with correct title", () => {
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      expect(screen.getByText("Delete Profile")).toBeInTheDocument();
      expect(
        screen.getByText(
          `Are you sure you want to delete the profile "${mockProfile.name}"?`
        )
      ).toBeInTheDocument();
    });

    it("displays profile information correctly", () => {
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      expect(screen.getByText("Test Profile")).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
      expect(screen.getByText("2 total (1 enabled)")).toBeInTheDocument();
    });

    it("shows warning message about data loss", () => {
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      expect(
        screen.getByText("Warning: This action cannot be undone")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Deleting this profile will permanently remove all spawns and their configurations. Make sure you have exported your data if you need to keep it."
        )
      ).toBeInTheDocument();
    });

    it("renders correct button text", () => {
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      expect(screen.getByText("Delete Profile")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("handles profile without description", () => {
      const profileWithoutDescription = {
        ...mockProfile,
        description: undefined,
      };

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={profileWithoutDescription}
        />
      );

      expect(screen.getByText("Test Profile")).toBeInTheDocument();
      expect(screen.getByText("2 total (1 enabled)")).toBeInTheDocument();
    });

    it("handles profile with no spawns", () => {
      const profileWithNoSpawns = {
        ...mockProfile,
        spawns: [],
      };

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={profileWithNoSpawns}
        />
      );

      expect(screen.getByText("0 total (0 enabled)")).toBeInTheDocument();
    });
  });

  describe("Deletion Process", () => {
    it("calls deleteProfile service when confirmed", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.deleteProfile.mockReturnValue({
        success: true,
      });

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const deleteButton = screen.getByText("Delete Profile");
      await user.click(deleteButton);

      expect(mockSpawnProfileService.deleteProfile).toHaveBeenCalledWith(
        mockProfile.id
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        "Profile deleted successfully"
      );
    });

    it("handles service errors gracefully", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.deleteProfile.mockReturnValue({
        success: false,
        error: "Cannot delete active profile",
      });

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const deleteButton = screen.getByText("Delete Profile");
      await user.click(deleteButton);

      expect(
        screen.getByText("Cannot delete active profile")
      ).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalledWith(
        "Cannot delete active profile"
      );
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("handles unexpected errors", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.deleteProfile.mockImplementation(() => {
        throw new Error("Network error");
      });

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const deleteButton = screen.getByText("Delete Profile");
      await user.click(deleteButton);

      expect(screen.getByText("Network error")).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalledWith("Network error");
    });

    it("handles service error without specific message", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.deleteProfile.mockReturnValue({
        success: false,
      });

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const deleteButton = screen.getByText("Delete Profile");
      await user.click(deleteButton);

      expect(screen.getByText("Failed to delete profile")).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalledWith("Failed to delete profile");
    });
  });

  describe("User Interactions", () => {
    it("closes dialog when cancel button is clicked", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("closes dialog when close button is clicked", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const closeButton = screen.getByLabelText("Close modal");
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("closes dialog when overlay is clicked", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      // Click on the overlay (outside the dialog content)
      const overlay = screen.getByRole("dialog").parentElement;
      if (overlay) {
        await user.click(overlay);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Loading States", () => {
    it("shows loading state during deletion", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.deleteProfile.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100)
          )
      );

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const deleteButton = screen.getByText("Delete Profile");
      await user.click(deleteButton);

      expect(screen.getByText("Deleting...")).toBeInTheDocument();
      expect(deleteButton).toBeDisabled();
    });

    it("disables cancel button during deletion", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.deleteProfile.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true }), 100)
          )
      );

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const deleteButton = screen.getByText("Delete Profile");
      await user.click(deleteButton);

      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("Error Display", () => {
    it("displays error message in styled error container", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.deleteProfile.mockReturnValue({
        success: false,
        error: "Test error message",
      });

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const deleteButton = screen.getByText("Delete Profile");
      await user.click(deleteButton);

      const errorContainer = screen
        .getByText("Test error message")
        .closest("div");
      expect(errorContainer).toHaveClass("bg-[rgb(var(--color-error-bg))]");
      expect(errorContainer).toHaveClass("border-[rgb(var(--color-error))]");
    });

    it("clears error when dialog is closed", async () => {
      const user = userEvent.setup();
      mockSpawnProfileService.deleteProfile.mockReturnValue({
        success: false,
        error: "Test error message",
      });

      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      // Trigger error
      const deleteButton = screen.getByText("Delete Profile");
      await user.click(deleteButton);
      expect(screen.getByText("Test error message")).toBeInTheDocument();

      // Close dialog
      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      // Reopen dialog
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      expect(screen.queryByText("Test error message")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
    });

    it("has proper semantic structure", () => {
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });
  });

  describe("Variant Styling", () => {
    it("uses danger variant for destructive action", () => {
      renderWithAllProviders(
        <ProfileDeletionDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />
      );

      // Check that the dialog uses danger styling
      const deleteButton = screen.getByText("Delete Profile");
      expect(deleteButton).toHaveClass("destructive");
    });
  });
});
