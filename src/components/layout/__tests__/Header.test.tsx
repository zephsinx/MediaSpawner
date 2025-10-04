import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { SpawnProfile } from "../../../types/spawn";

// Mock SpawnProfileService before importing the component
vi.mock("../../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    getProfilesWithActiveInfo: vi.fn(),
    setActiveProfile: vi.fn(),
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

// Import after mocking
import Header from "../Header";
import { SpawnProfileService } from "../../../services/spawnProfileService";
import { SettingsService } from "../../../services/settingsService";
import { renderWithAllProviders, mockLocalStorage } from "./testUtils";

const mockSpawnProfileService = vi.mocked(SpawnProfileService);
const mockSettingsService = vi.mocked(SettingsService);

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
        screen.getByLabelText("Additional profile actions")
      ).toBeInTheDocument();
    });

    it("renders navigation dropdown component", () => {
      renderWithAllProviders(<Header />);

      expect(screen.getByText("Open Asset Library")).toBeInTheDocument();
      // Settings is now in dropdown menu
      expect(
        screen.getByLabelText("Additional navigation options")
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
        "Default Profile - Default spawn profile"
      );
      expect(options[1]).toHaveTextContent(
        "Gaming Profile - Profile for gaming streams"
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
        mockSpawnProfileService.getProfilesWithActiveInfo
      ).toHaveBeenCalledTimes(2); // Called once by LayoutProvider and once by Header
    });

    it("handles profile switching correctly", () => {
      renderWithAllProviders(<Header />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "profile-2" } });

      expect(mockSpawnProfileService.setActiveProfile).toHaveBeenCalledWith(
        "profile-2"
      );
    });

    it("updates local state when profile switching succeeds", () => {
      renderWithAllProviders(<Header />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "profile-2" } });

      // The component should update its internal state
      expect(mockSpawnProfileService.setActiveProfile).toHaveBeenCalledWith(
        "profile-2"
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
        "Profile not found"
      );
    });
  });

  describe("Profile Management Actions", () => {
    it("calls placeholder functions for profile management actions", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      renderWithAllProviders(<Header />);

      // Test Create Profile button (primary action)
      fireEvent.click(screen.getByText("Create Profile"));
      expect(consoleSpy).toHaveBeenCalledWith(
        "Create profile - to be implemented in Epic 6"
      );

      // Test Edit Profile button (in dropdown)
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions"
      );
      fireEvent.click(dropdownTrigger);

      const editButton = screen.getByText("Edit Profile");
      fireEvent.click(editButton);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Edit profile - to be implemented in Epic 6"
      );

      // Test Delete Profile button (in dropdown)
      const deleteButton = screen.getByText("Delete Profile");
      fireEvent.click(deleteButton);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Delete profile - to be implemented in Epic 6"
      );

      consoleSpy.mockRestore();
    });

    it("disables Edit and Delete buttons when no active profile", () => {
      mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
        profiles: mockProfiles,
        activeProfileId: undefined,
      });

      renderWithAllProviders(<Header />);

      // Open dropdown to access Edit and Delete buttons
      const dropdownTrigger = screen.getByLabelText(
        "Additional profile actions"
      );
      fireEvent.click(dropdownTrigger);

      const editButton = screen.getByText("Edit Profile");
      const deleteButton = screen.getByText("Delete Profile");

      expect(editButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it("enables Edit and Delete buttons when active profile exists", () => {
      renderWithAllProviders(<Header />);

      // Open dropdown to access Edit and Delete buttons
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
        }
      );

      // Should not crash the component
      expect(() => renderWithAllProviders(<Header />)).not.toThrow();
    });
  });
});
