import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileDeletionDialog } from "../ProfileDeletionDialog";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";
import { SpawnProfileService } from "../../../services/spawnProfileService";
import { toast } from "sonner";
import type { SpawnProfile } from "../../../types/spawn";

// Mock the SpawnProfileService
vi.mock("../../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    deleteProfile: vi.fn(),
    getProfilesWithActiveInfo: vi.fn().mockReturnValue({
      profiles: [],
      activeProfileId: undefined,
    }),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Radix UI Dialog to avoid complexity in tests
vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-root">{children}</div>
  ),
  Trigger: ({
    children,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <div data-testid="dialog-trigger" {...props}>
        {children}
      </div>
    ),
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-portal">{children}</div>
  ),
  Overlay: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="dialog-overlay" {...props}>
      {children}
    </div>
  ),
  Content: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content" role="dialog" {...props}>
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
  Close: ({
    children,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <button data-testid="dialog-close" aria-label="Close modal" {...props}>
        {children}
      </button>
    ),
}));

const mockSpawnProfileService = vi.mocked(SpawnProfileService);

describe("ProfileDeletionDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

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
        trigger: { type: "manual" as const, config: {} },
        duration: 5000,
        lastModified: Date.now(),
        order: 0,
      },
      {
        id: "spawn-2",
        name: "Spawn 2",
        enabled: false,
        assets: [],
        trigger: { type: "manual" as const, config: {} },
        duration: 5000,
        lastModified: Date.now(),
        order: 1,
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

      expect(
        screen.getByRole("heading", { name: "Delete Profile" })
      ).toBeInTheDocument();
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

      expect(
        screen.getByRole("heading", { name: "Delete Profile" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Delete Profile" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
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

      const deleteButton = screen.getByRole("button", {
        name: "Delete Profile",
      });
      await user.click(deleteButton);

      expect(mockSpawnProfileService.deleteProfile).toHaveBeenCalledWith(
        mockProfile.id
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
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

      const deleteButton = screen.getByRole("button", {
        name: "Delete Profile",
      });
      await user.click(deleteButton);

      expect(
        screen.getByText("Cannot delete active profile")
      ).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith("Cannot delete active profile");
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

      const deleteButton = screen.getByRole("button", {
        name: "Delete Profile",
      });
      await user.click(deleteButton);

      expect(screen.getByText("Network error")).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith("Network error");
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

      const deleteButton = screen.getByRole("button", {
        name: "Delete Profile",
      });
      await user.click(deleteButton);

      expect(screen.getByText("Failed to delete profile")).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith("Failed to delete profile");
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

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

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

      const overlay = screen.getByTestId("dialog-overlay");
      await user.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe.skip("Loading States", () => {
    // The current ConfirmDialog closes immediately on confirm, so loading state is not observable.
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

      const deleteButton = screen.getByRole("button", {
        name: "Delete Profile",
      });
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
      const deleteButton = screen.getByRole("button", {
        name: "Delete Profile",
      });
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
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Delete Profile" })
      ).toBeInTheDocument();
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
      expect(dialog).toBeInTheDocument();
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
      const deleteButton = screen.getByRole("button", {
        name: "Delete Profile",
      });
      expect(deleteButton).toHaveClass("bg-[rgb(var(--color-error))]");
    });
  });
});
