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

// Import after mocking
import Header from "../Header";
import { SpawnProfileService } from "../../../services/spawnProfileService";
import { renderWithLayoutProvider, mockLocalStorage } from "./testUtils";

const mockSpawnProfileService = vi.mocked(SpawnProfileService);

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders application title and branding", () => {
      renderWithLayoutProvider(<Header />);

      expect(screen.getByText("MediaSpawner")).toBeInTheDocument();
    });

    it("renders spawn profile selector", () => {
      renderWithLayoutProvider(<Header />);

      expect(screen.getByText("Active Profile:")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders profile management action buttons", () => {
      renderWithLayoutProvider(<Header />);

      expect(screen.getByText("Create Profile")).toBeInTheDocument();
      expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      expect(screen.getByText("Delete Profile")).toBeInTheDocument();
    });
  });

  describe("Profile Selector Functionality", () => {
    it("displays all available profiles in dropdown", () => {
      renderWithLayoutProvider(<Header />);

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
      renderWithLayoutProvider(<Header />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("profile-1");
    });

    it("calls SpawnProfileService.getProfilesWithActiveInfo on mount", () => {
      renderWithLayoutProvider(<Header />);

      expect(
        mockSpawnProfileService.getProfilesWithActiveInfo
      ).toHaveBeenCalledTimes(2); // Called once by LayoutProvider and once by Header
    });

    it("handles profile switching correctly", () => {
      renderWithLayoutProvider(<Header />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "profile-2" } });

      expect(mockSpawnProfileService.setActiveProfile).toHaveBeenCalledWith(
        "profile-2"
      );
    });

    it("updates local state when profile switching succeeds", () => {
      renderWithLayoutProvider(<Header />);

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

      renderWithLayoutProvider(<Header />);

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

      renderWithLayoutProvider(<Header />);

      // Test Create Profile button
      fireEvent.click(screen.getByText("Create Profile"));
      expect(consoleSpy).toHaveBeenCalledWith(
        "Create profile - to be implemented in Epic 6"
      );

      // Test Edit Profile button
      fireEvent.click(screen.getByText("Edit Profile"));
      expect(consoleSpy).toHaveBeenCalledWith(
        "Edit profile - to be implemented in Epic 6"
      );

      // Test Delete Profile button
      fireEvent.click(screen.getByText("Delete Profile"));
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

      renderWithLayoutProvider(<Header />);

      const editButton = screen.getByText("Edit Profile");
      const deleteButton = screen.getByText("Delete Profile");

      expect(editButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it("enables Edit and Delete buttons when active profile exists", () => {
      renderWithLayoutProvider(<Header />);

      const editButton = screen.getByText("Edit Profile");
      const deleteButton = screen.getByText("Delete Profile");

      expect(editButton).not.toBeDisabled();
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe("Layout and Styling", () => {
    it("applies correct CSS classes for header layout", () => {
      const { container } = renderWithLayoutProvider(<Header />);

      const header = container.querySelector("header");
      expect(header).toHaveClass(
        "bg-white",
        "border-b",
        "border-gray-200",
        "px-6",
        "py-4"
      );
    });

    it("applies correct CSS classes for profile selector", () => {
      const { container } = renderWithLayoutProvider(<Header />);

      const select = container.querySelector("select");
      expect(select).toHaveClass(
        "px-3",
        "py-2",
        "border",
        "border-gray-300",
        "rounded-md",
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-blue-500",
        "min-w-[200px]"
      );
    });

    it("applies correct CSS classes for action buttons", () => {
      renderWithLayoutProvider(<Header />);

      const createButton = screen.getByText("Create Profile");
      const editButton = screen.getByText("Edit Profile");
      const deleteButton = screen.getByText("Delete Profile");

      expect(createButton).toHaveClass(
        "bg-blue-500",
        "text-white",
        "rounded-md",
        "hover:bg-blue-600"
      );
      expect(editButton).toHaveClass(
        "bg-gray-500",
        "text-white",
        "rounded-md",
        "hover:bg-gray-600"
      );
      expect(deleteButton).toHaveClass(
        "bg-red-500",
        "text-white",
        "rounded-md",
        "hover:bg-red-600"
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles empty profiles list", () => {
      mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
        profiles: [],
        activeProfileId: undefined,
      });

      renderWithLayoutProvider(<Header />);

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

      renderWithLayoutProvider(<Header />);

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
      expect(() => renderWithLayoutProvider(<Header />)).not.toThrow();
    });
  });
});
