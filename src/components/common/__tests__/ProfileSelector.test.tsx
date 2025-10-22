import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import type { SpawnProfile } from "../../../types/spawn";
import { ProfileSelector } from "../ProfileSelector";
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
    <div
      data-testid="dropdown-content"
      role="menu"
      aria-label="Profile selection options"
    >
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
      role="menuitemradio"
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

describe("ProfileSelector", () => {
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

  const defaultProps = {
    profiles: mockProfiles,
    selectedProfileId: "profile-1",
    onProfileChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders with profiles list", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      expect(screen.getByRole("button")).toBeInTheDocument();
      expect(screen.getByRole("button")).toHaveTextContent("Default Profile");
    });

    it("shows selected profile name", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Default Profile");
    });

    it("shows 'Select profile' when no profile is selected", async () => {
      await act(async () => {
        renderWithAllProviders(
          <ProfileSelector {...defaultProps} selectedProfileId={undefined} />,
        );
      });

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Select profile");
    });

    it("handles empty profiles list", async () => {
      await act(async () => {
        renderWithAllProviders(
          <ProfileSelector {...defaultProps} profiles={[]} />,
        );
      });

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Select profile");
    });
  });

  describe("Dropdown Interaction", () => {
    it("opens dropdown on click", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Check that dropdown content is rendered
      expect(screen.getByTestId("dropdown-content")).toBeInTheDocument();
    });

    it("shows all profiles in dropdown", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Check that all profiles are in the dropdown menu
      const menuItems = screen.getAllByRole("menuitemradio");
      expect(menuItems).toHaveLength(3);
      expect(menuItems[0]).toHaveAttribute(
        "aria-label",
        "Select Default Profile - Default spawn profile",
      );
      expect(menuItems[1]).toHaveAttribute(
        "aria-label",
        "Select Gaming Profile - Profile for gaming streams",
      );
      expect(menuItems[2]).toHaveAttribute("aria-label", "Select Work Profile");
    });

    it("shows profile descriptions in dropdown", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("Default spawn profile")).toBeInTheDocument();
      expect(
        screen.getByText("Profile for gaming streams"),
      ).toBeInTheDocument();
    });

    it("calls onProfileChange when profile is selected", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const gamingProfileItem = screen
        .getByText("Gaming Profile")
        .closest("[data-testid='dropdown-item']");
      expect(gamingProfileItem).toBeInTheDocument();

      fireEvent.click(gamingProfileItem!);

      expect(defaultProps.onProfileChange).toHaveBeenCalledWith("profile-2");
    });

    it("shows check mark for selected profile", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // The selected profile should have aria-checked="true"
      const selectedItem = screen.getByRole("menuitemradio", {
        name: /Default Profile/,
      });
      expect(selectedItem).toHaveAttribute("aria-checked", "true");
    });

    it("shows unchecked state for non-selected profiles", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const gamingProfileItem = screen.getByRole("menuitemradio", {
        name: /Gaming Profile/,
      });
      expect(gamingProfileItem).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-haspopup", "menu");
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute(
        "aria-label",
        "Select profile. Current: Default Profile",
      );
    });

    it("has proper menu role", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const menu = screen.getByRole("menu");
      expect(menu).toHaveAttribute("aria-label", "Profile selection options");
    });

    it("has proper menuitemradio roles", async () => {
      await act(async () => {
        renderWithAllProviders(<ProfileSelector {...defaultProps} />);
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const menuItems = screen.getAllByRole("menuitemradio");
      expect(menuItems).toHaveLength(3);
    });
  });

  describe("Edge Cases", () => {
    it("handles profiles without descriptions", async () => {
      const profilesWithoutDescriptions: SpawnProfile[] = [
        {
          id: "profile-1",
          name: "Simple Profile",
          spawns: [],
          lastModified: 1234567890000,
          isActive: true,
        },
      ];

      await act(async () => {
        renderWithAllProviders(
          <ProfileSelector
            {...defaultProps}
            profiles={profilesWithoutDescriptions}
          />,
        );
      });

      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Simple Profile");

      fireEvent.click(button);

      const menuItems = screen.getAllByRole("menuitemradio");
      expect(menuItems).toHaveLength(1);
      expect(menuItems[0]).toHaveAttribute(
        "aria-label",
        "Select Simple Profile",
      );
    });

    it("handles profile selection with undefined selectedProfileId", async () => {
      await act(async () => {
        renderWithAllProviders(
          <ProfileSelector {...defaultProps} selectedProfileId={undefined} />,
        );
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // All profiles should be unchecked
      const menuItems = screen.getAllByRole("menuitemradio");
      menuItems.forEach((item) => {
        expect(item).toHaveAttribute("aria-checked", "false");
      });
    });
  });
});
