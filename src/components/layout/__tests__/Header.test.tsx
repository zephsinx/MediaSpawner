import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { SpawnProfile } from "../../../types/spawn";

// Mock SpawnProfileService before importing the component
vi.mock("../../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    getProfilesWithActiveInfo: vi.fn(),
    setActiveProfile: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
    getLiveProfileId: vi.fn(),
    setLiveProfile: vi.fn(),
  },
}));

// Mock SettingsService for theme functionality
vi.mock("../../../services/settingsService", () => ({
  SettingsService: {
    getThemeMode: vi.fn(),
    setThemeMode: vi.fn(),
    applyThemeMode: vi.fn(),
  },
}));

// Mock useStreamerbotStatus hook
vi.mock("../../../hooks/useStreamerbotStatus", () => ({
  useStreamerbotStatus: vi.fn(() => ({
    state: "connected",
    host: "localhost",
    port: 8080,
    errorMessage: undefined,
  })),
}));

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

// Import after mocking
import Header from "../Header";
import { SpawnProfileService } from "../../../services/spawnProfileService";
import { SettingsService } from "../../../services/settingsService";
import { useStreamerbotStatus } from "../../../hooks/useStreamerbotStatus";
import { renderWithAllProviders, mockLocalStorage } from "./testUtils";

const mockSpawnProfileService = vi.mocked(SpawnProfileService);
const mockSettingsService = vi.mocked(SettingsService);
const mockUseStreamerbotStatus = vi.mocked(useStreamerbotStatus);

describe("Header", () => {
  // Test data
  const mockProfiles: SpawnProfile[] = [
    {
      id: "profile-1",
      name: "Default Profile",
      description: "Default spawn profile",
      spawns: [],
      lastModified: 1234567890000,
      isActive: true,
    },
    {
      id: "profile-2",
      name: "Gaming Profile",
      description: "Profile for gaming streams",
      spawns: [],
      lastModified: 1234567890000,
      isActive: false,
    },
    {
      id: "profile-3",
      name: "Work Profile",
      spawns: [],
      lastModified: 1234567890000,
      isActive: false,
    },
  ];

  beforeEach(() => {
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock localStorage
    mockLocalStorage();

    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementation
    mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
      profiles: mockProfiles,
      activeProfileId: "profile-1",
    });
    mockSpawnProfileService.setActiveProfile.mockReturnValue({
      success: true,
      profile: mockProfiles[0],
    });
    mockSpawnProfileService.createProfile.mockReturnValue({
      success: true,
      profile: mockProfiles[0],
    });
    mockSpawnProfileService.updateProfile.mockReturnValue({
      success: true,
      profile: mockProfiles[0],
    });
    mockSpawnProfileService.deleteProfile.mockReturnValue({
      success: true,
    });
    mockSpawnProfileService.getLiveProfileId.mockResolvedValue(undefined);
    mockSpawnProfileService.setLiveProfile.mockResolvedValue({
      success: true,
      profile: mockProfiles[0],
    });

    // Default SettingsService mock
    mockSettingsService.getThemeMode.mockReturnValue("light");
    mockSettingsService.setThemeMode.mockReturnValue({
      success: true,
      settings: { themeMode: "dark", workingDirectory: "" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders application title and branding", () => {
      renderWithAllProviders(<Header />);

      expect(screen.getByText("MediaSpawner")).toBeInTheDocument();
    });

    it("renders spawn profile selector", () => {
      renderWithAllProviders(<Header />);

      expect(screen.getByText("Profile:")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders profile actions dropdown component", () => {
      renderWithAllProviders(<Header />);

      expect(screen.getByText("Create Profile")).toBeInTheDocument();
      // Edit and Delete Profile are now in dropdown menu
      expect(
        screen.getByLabelText("Additional profile actions"),
      ).toBeInTheDocument();
    });

    it("renders navigation dropdown component", () => {
      renderWithAllProviders(<Header />);

      expect(screen.getByText("Edit Assets")).toBeInTheDocument();
      // NavigationDropdown only has primary action, no dropdown menu
      expect(
        screen.getByRole("button", { name: "Edit Assets" }),
      ).toBeInTheDocument();
    });

    it("renders theme toggle component", () => {
      renderWithAllProviders(<Header />);

      expect(screen.getByRole("switch")).toBeInTheDocument();
      // Should show sun icon for light theme by default
      const icon = screen
        .getByRole("switch")
        .parentElement?.querySelector("svg");
      expect(icon).toHaveClass("lucide-sun");
    });

    it("renders settings button component", () => {
      renderWithAllProviders(<Header />);

      const settingsButton = screen.getByLabelText("Settings");
      expect(settingsButton).toBeInTheDocument();

      // Check for Settings icon
      const icon = settingsButton.querySelector("svg");
      expect(icon).toHaveClass("lucide-settings");

      // Check that it's a link to /settings
      const link = settingsButton.closest("a");
      expect(link).toHaveAttribute("href", "/settings");
    });
  });

  describe("Profile Selector Functionality", () => {
    it("displays all available profiles in dropdown", () => {
      renderWithAllProviders(<Header />);

      const select = screen.getByRole("combobox");
      const options = select.querySelectorAll("option");

      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent(
        "Default Profile - Default spawn profile",
      );
      expect(options[1]).toHaveTextContent(
        "Gaming Profile - Profile for gaming streams",
      );
      expect(options[2]).toHaveTextContent("Work Profile");
    });

    it("shows currently active profile as selected", () => {
      renderWithAllProviders(<Header />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("profile-1");
    });

    it("calls SpawnProfileService.getProfilesWithActiveInfo on mount", () => {
      renderWithAllProviders(<Header />);

      expect(
        mockSpawnProfileService.getProfilesWithActiveInfo,
      ).toHaveBeenCalledTimes(2); // Called once by LayoutProvider and once by Header
    });

    it("handles profile switching correctly", () => {
      renderWithAllProviders(<Header />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "profile-2" } });

      expect(mockSpawnProfileService.setActiveProfile).toHaveBeenCalledWith(
        "profile-2",
      );
    });

    it("updates local state when profile switching succeeds", () => {
      renderWithAllProviders(<Header />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "profile-2" } });

      // The component should update its internal state
      expect(mockSpawnProfileService.setActiveProfile).toHaveBeenCalledWith(
        "profile-2",
      );
    });

    it("handles profile switching failure gracefully", () => {
      mockSpawnProfileService.setActiveProfile.mockReturnValue({
        success: false,
        error: "Profile not found",
      });

      renderWithAllProviders(<Header />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "invalid-profile" } });

      expect(console.error).toHaveBeenCalledWith(
        "Failed to set active profile:",
        "Profile not found",
      );
    });
  });

  describe("Profile Management Actions", () => {
    it("opens dialogs for profile management actions", () => {
      renderWithAllProviders(<Header />);

      // Test Create Profile button (primary action)
      fireEvent.click(screen.getByRole("button", { name: "Create Profile" }));
      expect(
        screen.getByRole("heading", { name: "Create Profile" }),
      ).toBeInTheDocument();

      // Close the dialog
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // Test Edit Profile button (in dropdown)
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);

      const editButton = screen.getByRole("menuitem", { name: "Edit Profile" });
      fireEvent.click(editButton);
      expect(
        screen.getByRole("heading", { name: "Edit Profile" }),
      ).toBeInTheDocument();

      // Close the dialog
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // Test Delete Profile button (in dropdown)
      const deleteButton = screen.getByRole("menuitem", {
        name: "Delete Profile",
      });
      fireEvent.click(deleteButton);
      expect(
        screen.getByRole("heading", { name: "Delete Profile" }),
      ).toBeInTheDocument();
    });

    it("disables Edit and Delete buttons when no active profile", () => {
      mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
        profiles: mockProfiles,
        activeProfileId: undefined,
      });

      renderWithAllProviders(<Header />);

      // Open dropdown to access Edit and Delete buttons
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

    it("enables Edit and Delete buttons when active profile exists", () => {
      renderWithAllProviders(<Header />);

      // Open dropdown to access Edit and Delete buttons
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);

      const editButton = screen.getByRole("menuitem", { name: "Edit Profile" });
      const deleteButton = screen.getByRole("menuitem", {
        name: "Delete Profile",
      });

      expect(editButton).not.toBeDisabled();
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty profiles list", () => {
      mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
        profiles: [],
        activeProfileId: undefined,
      });

      renderWithAllProviders(<Header />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("");
      expect(select.querySelectorAll("option")).toHaveLength(0);
    });

    it("handles profiles without descriptions", () => {
      const profilesWithoutDescriptions: SpawnProfile[] = [
        {
          id: "profile-1",
          name: "Simple Profile",
          spawns: [],
          lastModified: 1234567890000,
          isActive: true,
        },
      ];

      mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
        profiles: profilesWithoutDescriptions,
        activeProfileId: "profile-1",
      });

      renderWithAllProviders(<Header />);

      const select = screen.getByRole("combobox");
      const options = select.querySelectorAll("option");
      expect(options[0]).toHaveTextContent("Simple Profile");
    });

    it("handles service errors gracefully", () => {
      mockSpawnProfileService.getProfilesWithActiveInfo.mockImplementation(
        () => {
          throw new Error("Service error");
        },
      );

      // Should not crash the component
      expect(() => renderWithAllProviders(<Header />)).not.toThrow();
    });
  });

  describe("Profile Management", () => {
    it("opens create profile dialog when Create Profile button is clicked", () => {
      renderWithAllProviders(<Header />);

      const createButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      fireEvent.click(createButton);

      // Check that ProfileFormDialog is rendered
      expect(
        screen.getByRole("heading", { name: "Create Profile" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Profile Name")).toBeInTheDocument();
    });

    it("opens edit profile dialog when Edit Profile is clicked", () => {
      renderWithAllProviders(<Header />);

      // Click on the dropdown trigger
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);

      // Click Edit Profile option
      const editOption = screen.getByRole("menuitem", { name: "Edit Profile" });
      fireEvent.click(editOption);

      // Check that ProfileFormDialog is rendered in edit mode
      expect(
        screen.getByRole("heading", { name: "Edit Profile" }),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("Default Profile")).toBeInTheDocument();
    });

    it("opens delete profile dialog when Delete Profile is clicked", () => {
      renderWithAllProviders(<Header />);

      // Click on the dropdown trigger
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);

      // Click Delete Profile option
      const deleteOption = screen.getByRole("menuitem", {
        name: "Delete Profile",
      });
      fireEvent.click(deleteOption);

      // Check that ProfileDeletionDialog is rendered
      expect(
        screen.getByRole("heading", { name: "Delete Profile" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Default Profile")).toBeInTheDocument();
    });

    it("handles profile creation success", () => {
      const newProfile: SpawnProfile = {
        id: "new-profile",
        name: "New Profile",
        description: "New description",
        spawns: [],
        lastModified: Date.now(),
        isActive: false,
      };

      mockSpawnProfileService.createProfile.mockReturnValue({
        success: true,
        profile: newProfile,
      });

      renderWithAllProviders(<Header />);

      // Open create dialog
      const createButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      fireEvent.click(createButton);

      // Fill form and submit
      const nameInput = screen.getByLabelText("Profile Name");
      fireEvent.change(nameInput, { target: { value: "New Profile" } });

      const submitButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      fireEvent.click(submitButton);

      // Check that service was called
      expect(mockSpawnProfileService.createProfile).toHaveBeenCalledWith(
        "New Profile",
        undefined,
      );
    });

    it("handles profile update success", () => {
      const updatedProfile: SpawnProfile = {
        ...mockProfiles[0],
        name: "Updated Profile",
      };

      mockSpawnProfileService.updateProfile.mockReturnValue({
        success: true,
        profile: updatedProfile,
      });

      renderWithAllProviders(<Header />);

      // Open edit dialog
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);
      const editOption = screen.getByRole("menuitem", { name: "Edit Profile" });
      fireEvent.click(editOption);

      // Update form and submit
      const nameInput = screen.getByLabelText("Profile Name");
      fireEvent.change(nameInput, { target: { value: "Updated Profile" } });

      const submitButton = screen.getByText("Update Profile");
      fireEvent.click(submitButton);

      // Check that service was called
      expect(mockSpawnProfileService.updateProfile).toHaveBeenCalledWith(
        mockProfiles[0].id,
        {
          name: "Updated Profile",
          description: "Default spawn profile",
        },
      );
    });

    it("handles profile deletion success", () => {
      mockSpawnProfileService.deleteProfile.mockReturnValue({
        success: true,
      });

      renderWithAllProviders(<Header />);

      // Open delete dialog
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);
      const deleteOption = screen.getByRole("menuitem", {
        name: "Delete Profile",
      });
      fireEvent.click(deleteOption);

      // Confirm deletion
      const confirmButton = screen.getByRole("button", {
        name: "Delete Profile",
      });
      fireEvent.click(confirmButton);

      // Check that service was called
      expect(mockSpawnProfileService.deleteProfile).toHaveBeenCalledWith(
        mockProfiles[0].id,
      );
    });

    it("shows error when no active profile for edit", () => {
      // Mock no active profile
      mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
        profiles: mockProfiles,
        activeProfileId: undefined,
      });

      renderWithAllProviders(<Header />);

      // Try to edit profile
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);
      const editOption = screen.getByRole("menuitem", { name: "Edit Profile" });
      fireEvent.click(editOption);

      // Should not open edit dialog
      expect(
        screen.queryByRole("heading", { name: "Edit Profile" }),
      ).not.toBeInTheDocument();
    });

    it("shows error when no active profile for delete", () => {
      // Mock no active profile
      mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
        profiles: mockProfiles,
        activeProfileId: undefined,
      });

      renderWithAllProviders(<Header />);

      // Try to delete profile
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions",
      );
      fireEvent.click(dropdownTrigger);
      const deleteOption = screen.getByRole("menuitem", {
        name: "Delete Profile",
      });
      fireEvent.click(deleteOption);

      // Should not open delete dialog
      expect(
        screen.queryByRole("heading", { name: "Delete Profile" }),
      ).not.toBeInTheDocument();
    });

    it("refreshes profiles list after successful operations", () => {
      const newProfile: SpawnProfile = {
        id: "new-profile",
        name: "New Profile",
        spawns: [],
        lastModified: Date.now(),
        isActive: false,
      };

      mockSpawnProfileService.createProfile.mockReturnValue({
        success: true,
        profile: newProfile,
      });

      renderWithAllProviders(<Header />);

      // Open create dialog and submit
      const createButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText("Profile Name");
      fireEvent.change(nameInput, { target: { value: "New Profile" } });

      const submitButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      fireEvent.click(submitButton);

      // Check that profiles list was refreshed
      expect(
        mockSpawnProfileService.getProfilesWithActiveInfo,
      ).toHaveBeenCalledTimes(3);
    });

    it("sets new profile as active after creation", () => {
      const newProfile: SpawnProfile = {
        id: "new-profile",
        name: "New Profile",
        spawns: [],
        lastModified: Date.now(),
        isActive: false,
      };

      mockSpawnProfileService.createProfile.mockReturnValue({
        success: true,
        profile: newProfile,
      });

      renderWithAllProviders(<Header />);

      // Open create dialog and submit
      const createButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      fireEvent.click(createButton);

      const nameInput = screen.getByLabelText("Profile Name");
      fireEvent.change(nameInput, { target: { value: "New Profile" } });

      const submitButton = screen.getByRole("button", {
        name: "Create Profile",
      });
      fireEvent.click(submitButton);

      // Check that setActiveProfile was called
      expect(mockSpawnProfileService.setActiveProfile).toHaveBeenCalledWith(
        newProfile.id,
      );
    });
  });

  describe("Live Profile Functionality", () => {
    it("renders live profile indicator", () => {
      renderWithAllProviders(<Header />);

      expect(
        screen.getByRole("status", { name: "Live status: Not live" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Not Live")).toBeInTheDocument();
    });

    it("shows live status when profile is live", async () => {
      // Mock live profile as the first profile
      mockSpawnProfileService.getLiveProfileId.mockResolvedValue("profile-1");

      renderWithAllProviders(<Header />);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.getAllByText("Live")).toHaveLength(2); // Status text and button text
    });

    it("calls setLiveProfile when Set as Live button is clicked", async () => {
      renderWithAllProviders(<Header />);

      const setLiveButton = screen.getByText("Set as Live");
      fireEvent.click(setLiveButton);

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSpawnProfileService.setLiveProfile).toHaveBeenCalledWith(
        "profile-1",
      );
    });

    it("disables Set as Live button when no active profile", () => {
      mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
        profiles: mockProfiles,
        activeProfileId: undefined,
      });

      renderWithAllProviders(<Header />);

      // When there's no active profile, the button should be disabled
      const setLiveButton = screen.getByRole("button", {
        name: "Profile is already live",
      });
      expect(setLiveButton).toBeDisabled();
    });

    it("disables Set as Live button when Streamer.bot is not connected", () => {
      // Mock disconnected state
      mockUseStreamerbotStatus.mockReturnValue({
        state: "disconnected",
        host: "localhost",
        port: 8080,
        endpoint: "ws://localhost:8080",
        errorMessage: undefined,
      });

      renderWithAllProviders(<Header />);

      const setLiveButton = screen.getByText("Set as Live");
      expect(setLiveButton).toBeDisabled();
    });

    it("handles setLiveProfile success", async () => {
      renderWithAllProviders(<Header />);

      const setLiveButton = screen.getByText("Set as Live");
      fireEvent.click(setLiveButton);

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSpawnProfileService.setLiveProfile).toHaveBeenCalledWith(
        "profile-1",
      );
    });

    it("handles setLiveProfile failure", async () => {
      mockSpawnProfileService.setLiveProfile.mockResolvedValue({
        success: false,
        error: "Failed to set live profile",
      });

      renderWithAllProviders(<Header />);

      const setLiveButton = screen.getByText("Set as Live");
      fireEvent.click(setLiveButton);

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSpawnProfileService.setLiveProfile).toHaveBeenCalledWith(
        "profile-1",
      );
    });

    it("loads live profile on mount when connected", async () => {
      renderWithAllProviders(<Header />);

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSpawnProfileService.getLiveProfileId).toHaveBeenCalled();
    });
  });
});
