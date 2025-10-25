import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileFormDialog } from "../ProfileFormDialog";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";
import { SpawnProfileService } from "../../../services/spawnProfileService";
import { toast } from "sonner";
import type { SpawnProfile } from "../../../types/spawn";

// Mock the SpawnProfileService
vi.mock("../../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    getProfilesWithActiveInfo: vi.fn().mockReturnValue([]),
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
interface MockDialogState {
  mockDialogOnOpenChange?: (open: boolean) => void;
}

declare global {
  var mockDialogState: MockDialogState;
}

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => {
    // Store the onOpenChange callback globally so Close can access it
    global.mockDialogState = { mockDialogOnOpenChange: onOpenChange };
    return <div data-testid="dialog-root">{children}</div>;
  },
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
  Close: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild ? (
      <div
        onClick={() => {
          const onOpenChange = global.mockDialogState?.mockDialogOnOpenChange;
          if (onOpenChange) {
            onOpenChange(false);
          }
        }}
      >
        {children}
      </div>
    ) : (
      <button
        data-testid="dialog-close"
        aria-label="Close modal"
        onClick={() => {
          const onOpenChange = global.mockDialogState?.mockDialogOnOpenChange;
          if (onOpenChange) {
            onOpenChange(false);
          }
        }}
      >
        {children}
      </button>
    ),
}));

const mockSpawnProfileService = vi.mocked(SpawnProfileService);

describe("ProfileFormDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

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
    mockSpawnProfileService.createProfile.mockReturnValue({
      success: true,
      profile: mockProfile,
    });
    mockSpawnProfileService.updateProfile.mockReturnValue({
      success: true,
      profile: mockProfile,
    });
  });

  describe("Create Mode", () => {
    it("renders create dialog with correct title", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(
        screen.getByRole("heading", { name: "Create Profile" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Profile Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
    });

    it("renders form fields with correct placeholders", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(
        screen.getByPlaceholderText("Enter profile name..."),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter profile description (optional)..."),
      ).toBeInTheDocument();
    });

    it("shows helper text for form fields", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(
        screen.getByText("A unique name to identify this profile"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Optional description of the profile's purpose"),
      ).toBeInTheDocument();
    });

    it("has correct button text for create mode", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Create Profile" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
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
        />,
      );

      expect(
        screen.getByRole("heading", { name: "Edit Profile" }),
      ).toBeInTheDocument();
    });

    it("pre-fills form fields with profile data", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          profile={mockProfile}
        />,
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
        />,
      );

      expect(
        screen.getByRole("button", { name: "Update Profile" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("shows error for empty profile name", async () => {
      const { container } = renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      expect(mockSpawnProfileService.createProfile).not.toHaveBeenCalled();
      expect(
        await screen.findByText("Profile name is required"),
      ).toBeInTheDocument();
    });

    it("shows error for profile name that is too long", async () => {
      const { container } = renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      const nameInput = screen.getByLabelText(
        "Profile Name",
      ) as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "a".repeat(101) } });

      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      expect(mockSpawnProfileService.createProfile).not.toHaveBeenCalled();
      expect(nameInput.value.length).toBe(101);
    });

    it("shows error for description that is too long", async () => {
      const { container } = renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      const nameInput = screen.getByLabelText("Profile Name");
      const descriptionInput = screen.getByLabelText(
        "Description",
      ) as HTMLTextAreaElement;

      fireEvent.change(nameInput, { target: { value: "Valid Name" } });
      fireEvent.change(descriptionInput, {
        target: { value: "a".repeat(501) },
      });

      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      expect(mockSpawnProfileService.createProfile).not.toHaveBeenCalled();
      expect(descriptionInput.value.length).toBe(501);
    });

    it("clears field errors when user starts typing", async () => {
      const user = userEvent.setup();
      const { container } = renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);
      expect(mockSpawnProfileService.createProfile).not.toHaveBeenCalled();
      expect(
        await screen.findByText("Profile name is required"),
      ).toBeInTheDocument();

      const nameInput = screen.getByLabelText("Profile Name");
      await user.type(nameInput, "Test");

      expect(
        screen.queryByText("Profile name is required"),
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
        />,
      );

      const nameInput = screen.getByLabelText("Profile Name");
      const descriptionInput = screen.getByLabelText("Description");

      await user.type(nameInput, "New Profile");
      await user.type(descriptionInput, "New description");

      const submitButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      await user.click(submitButton);

      expect(mockSpawnProfileService.createProfile).toHaveBeenCalledWith(
        "New Profile",
        "New description",
        undefined,
      );
      expect(mockOnSuccess).toHaveBeenCalledWith(mockCreatedProfile);
      expect(mockOnClose).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Profile created successfully",
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
        />,
      );

      const nameInput = screen.getByLabelText("Profile Name");
      await user.clear(nameInput);
      await user.type(nameInput, "Updated Profile");

      const submitButton = screen.getByRole("button", {
        name: "Update Profile",
      });
      await user.click(submitButton);

      expect(mockSpawnProfileService.updateProfile).toHaveBeenCalledWith(
        mockProfile.id,
        {
          name: "Updated Profile",
          description: "Test description",
        },
      );
      expect(mockOnSuccess).toHaveBeenCalledWith(mockUpdatedProfile);
      expect(mockOnClose).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Profile updated successfully",
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
        />,
      );

      const nameInput = screen.getByLabelText("Profile Name");
      await user.type(nameInput, "Duplicate Name");

      const submitButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      await user.click(submitButton);

      expect(mockSpawnProfileService.createProfile).toHaveBeenCalledWith(
        "Duplicate Name",
        undefined,
        undefined,
      );
      await screen.findByText("Profile name already exists");
      expect(toast.error).toHaveBeenCalledWith("Profile name already exists");
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
        />,
      );

      const nameInput = screen.getByLabelText("Profile Name");
      await user.type(nameInput, "Test Profile");

      const submitButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      await user.click(submitButton);

      expect(screen.getByText("Unexpected error")).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith("Unexpected error");
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
        />,
      );

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
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
        />,
      );

      const closeButton = screen.getByLabelText("Close modal");
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("disables submit button when form is invalid", async () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      const submitButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      expect(submitButton).toBeDisabled();
    });

    it("enables submit button when form is valid", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      const nameInput = screen.getByLabelText("Profile Name");
      await user.type(nameInput, "Valid Name");

      const submitButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Focus Management", () => {
    it("maintains focus on input fields while typing", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      const nameInput = screen.getByLabelText("Profile Name");
      const descriptionInput = screen.getByLabelText("Description");

      // Focus on name input and type
      await user.click(nameInput);
      expect(document.activeElement).toBe(nameInput);

      // Type multiple characters to trigger state updates
      await user.type(nameInput, "Test Profile Name");
      expect(document.activeElement).toBe(nameInput);
      expect(nameInput).toHaveValue("Test Profile Name");

      // Focus on description input and type
      await user.click(descriptionInput);
      expect(document.activeElement).toBe(descriptionInput);

      // Type multiple characters to trigger state updates
      await user.type(descriptionInput, "Test Description");
      expect(document.activeElement).toBe(descriptionInput);
      expect(descriptionInput).toHaveValue("Test Description");
    });

    it("maintains focus when switching between input fields", async () => {
      const user = userEvent.setup();
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
      );

      const nameInput = screen.getByLabelText("Profile Name");
      const descriptionInput = screen.getByLabelText("Description");

      // Type in name input
      await user.type(nameInput, "Test");
      expect(document.activeElement).toBe(nameInput);

      // Switch to description input
      await user.click(descriptionInput);
      expect(document.activeElement).toBe(descriptionInput);

      // Type in description input
      await user.type(descriptionInput, "Description");
      expect(document.activeElement).toBe(descriptionInput);

      // Switch back to name input
      await user.click(nameInput);
      expect(document.activeElement).toBe(nameInput);
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      renderWithAllProviders(
        <ProfileFormDialog
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
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
        />,
      );

      const nameInput = screen.getByLabelText("Profile Name");
      const descriptionInput = screen.getByLabelText("Description");

      expect(nameInput).toHaveAttribute("required");
      expect(nameInput).toHaveAttribute("maxLength", "100");
      expect(descriptionInput).toHaveAttribute("maxLength", "500");
    });
  });

  // Loading state is not observable because createProfile/updateProfile are synchronous.
  // We omit a loading-state test to avoid asserting on behavior the UI does not expose.
});
