import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  renderHook,
  act,
} from "@testing-library/react";
import { LayoutProvider } from "../LayoutContext";
import { usePanelState, useLayoutContext } from "../../../hooks";

// Mock SpawnProfileService
vi.mock("../../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    getProfilesWithActiveInfo: vi.fn(),
    setActiveProfile: vi.fn(),
  },
}));

import { SpawnProfileService } from "../../../services/spawnProfileService";

const mockSpawnProfileService = vi.mocked(SpawnProfileService);

// Test component that uses the layout context
const TestComponent = () => {
  const {
    activeProfileId,
    selectedSpawnId,
    centerPanelMode,
    hasUnsavedChanges,
    profileSpawnSelections,
    setActiveProfile,
    selectSpawn,
    setCenterPanelMode,
    setUnsavedChanges,
    clearContext,
  } = usePanelState();

  return (
    <div>
      <div data-testid="active-profile">{activeProfileId || "none"}</div>
      <div data-testid="selected-spawn">{selectedSpawnId || "none"}</div>
      <div data-testid="center-mode">{centerPanelMode}</div>
      <div data-testid="unsaved-changes">
        {hasUnsavedChanges ? "true" : "false"}
      </div>
      <div data-testid="profile-selections">
        {JSON.stringify(profileSpawnSelections)}
      </div>
      <button
        onClick={() => setActiveProfile("profile-1")}
        data-testid="set-profile-1"
      >
        Set Profile 1
      </button>
      <button
        onClick={() => setActiveProfile("profile-2")}
        data-testid="set-profile-2"
      >
        Set Profile 2
      </button>
      <button
        onClick={() => setActiveProfile(undefined)}
        data-testid="set-profile-none"
      >
        Set No Profile
      </button>
      <button
        onClick={() => selectSpawn("spawn-1")}
        data-testid="select-spawn-1"
      >
        Select Spawn 1
      </button>
      <button
        onClick={() => selectSpawn("spawn-2")}
        data-testid="select-spawn-2"
      >
        Select Spawn 2
      </button>
      <button
        onClick={() => setCenterPanelMode("asset-settings")}
        data-testid="set-asset-mode"
      >
        Set Asset Mode
      </button>
      <button
        onClick={() => setCenterPanelMode("spawn-settings")}
        data-testid="set-spawn-mode"
      >
        Set Spawn Mode
      </button>
      <button
        onClick={() => setUnsavedChanges(true)}
        data-testid="set-unsaved-true"
      >
        Set Unsaved True
      </button>
      <button
        onClick={() => setUnsavedChanges(false)}
        data-testid="set-unsaved-false"
      >
        Set Unsaved False
      </button>
      <button onClick={clearContext} data-testid="clear-context">
        Clear Context
      </button>
    </div>
  );
};

describe("LayoutContext", () => {
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Mock console.error to avoid noise in tests
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Reset all mocks
    vi.clearAllMocks();

    // Default mock implementation
    mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
      profiles: [],
      activeProfileId: "profile-1",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("provides correct initial state", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      expect(screen.getByTestId("active-profile")).toHaveTextContent(
        "profile-1",
      );
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("none");
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "spawn-settings",
      );
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("false");
      expect(screen.getByTestId("profile-selections")).toHaveTextContent("{}");
    });

    it("loads state from localStorage on mount", () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ "profile-1": "spawn-1", "profile-2": "spawn-2" }),
      );

      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "mediaspawner_profile_spawn_selections",
      );
    });

    it("handles localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      expect(() =>
        render(
          <LayoutProvider>
            <TestComponent />
          </LayoutProvider>,
        ),
      ).not.toThrow();
    });
  });

  describe("Profile Management", () => {
    it("sets active profile correctly", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      fireEvent.click(screen.getByTestId("set-profile-2"));

      expect(screen.getByTestId("active-profile")).toHaveTextContent(
        "profile-2",
      );
    });

    it("resets context when switching profiles", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Set some state
      fireEvent.click(screen.getByTestId("select-spawn-1"));
      fireEvent.click(screen.getByTestId("set-asset-mode"));
      fireEvent.click(screen.getByTestId("set-unsaved-true"));

      // Switch profile
      fireEvent.click(screen.getByTestId("set-profile-2"));

      // Should reset to spawn-settings mode and clear unsaved changes
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "spawn-settings",
      );
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("false");
    });

    it("remembers spawn selection per profile", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Select spawn in profile 1
      fireEvent.click(screen.getByTestId("select-spawn-1"));
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("spawn-1");

      // Switch to profile 2
      fireEvent.click(screen.getByTestId("set-profile-2"));
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("none");

      // Switch back to profile 1
      fireEvent.click(screen.getByTestId("set-profile-1"));
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("spawn-1");
    });

    it("preserves spawn selection when setting same profile", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Select spawn in profile 1
      fireEvent.click(screen.getByTestId("select-spawn-1"));
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("spawn-1");

      // Set the same profile again (should not reset spawn selection)
      fireEvent.click(screen.getByTestId("set-profile-1"));
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("spawn-1");
    });
  });

  describe("Spawn Selection", () => {
    it("selects spawn correctly", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      fireEvent.click(screen.getByTestId("select-spawn-1"));

      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("spawn-1");
    });

    it("persists spawn selection for current profile", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Select spawn in profile 1
      fireEvent.click(screen.getByTestId("select-spawn-1"));

      // Check that localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "mediaspawner_profile_spawn_selections",
        JSON.stringify({ "profile-1": "spawn-1" }),
      );
    });

    it("resets center panel mode when selecting spawn", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Set to asset mode
      fireEvent.click(screen.getByTestId("set-asset-mode"));
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "asset-settings",
      );

      // Select spawn
      fireEvent.click(screen.getByTestId("select-spawn-1"));

      // Should reset to spawn-settings mode
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "spawn-settings",
      );
    });

    it("handles spawn selection without active profile", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Set no active profile
      fireEvent.click(screen.getByTestId("set-profile-none"));
      expect(screen.getByTestId("active-profile")).toHaveTextContent("none");

      // Select spawn (should not update profileSpawnSelections)
      fireEvent.click(screen.getByTestId("select-spawn-1"));
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("spawn-1");

      // Check that profileSpawnSelections is still empty
      expect(screen.getByTestId("profile-selections")).toHaveTextContent("{}");
    });
  });

  describe("Center Panel Mode", () => {
    it("sets center panel mode correctly", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      fireEvent.click(screen.getByTestId("set-asset-mode"));
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "asset-settings",
      );

      fireEvent.click(screen.getByTestId("set-spawn-mode"));
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "spawn-settings",
      );
    });
  });

  describe("Unsaved Changes", () => {
    it("tracks unsaved changes correctly", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("false");

      fireEvent.click(screen.getByTestId("set-unsaved-true"));
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("true");

      fireEvent.click(screen.getByTestId("set-unsaved-false"));
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("false");
    });
  });

  describe("Context Clearing", () => {
    it("clears context but preserves profile selections", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Set some state
      fireEvent.click(screen.getByTestId("select-spawn-1"));
      fireEvent.click(screen.getByTestId("set-asset-mode"));
      fireEvent.click(screen.getByTestId("set-unsaved-true"));

      // Clear context
      fireEvent.click(screen.getByTestId("clear-context"));

      // Should reset to initial state but preserve profile selections
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("none");
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "spawn-settings",
      );
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("false");
      expect(screen.getByTestId("active-profile")).toHaveTextContent(
        "profile-1",
      );
    });
  });

  describe("Error Handling", () => {
    it("handles localStorage setItem errors gracefully", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("localStorage setItem error");
      });

      expect(() =>
        render(
          <LayoutProvider>
            <TestComponent />
          </LayoutProvider>,
        ),
      ).not.toThrow();
    });

    it("handles SpawnProfileService errors gracefully", () => {
      mockSpawnProfileService.getProfilesWithActiveInfo.mockImplementation(
        () => {
          throw new Error("Service error");
        },
      );

      expect(() =>
        render(
          <LayoutProvider>
            <TestComponent />
          </LayoutProvider>,
        ),
      ).not.toThrow();
    });

    it("handles unknown action types gracefully", () => {
      // Create a test component that dispatches an unknown action
      const TestUnknownActionComponent = () => {
        const { dispatch } = useLayoutContext();
        const { selectedSpawnId } = usePanelState();

        React.useEffect(() => {
          // Dispatch an unknown action type
          dispatch({
            type: "UNKNOWN_ACTION" as never,
            payload: { hasChanges: false },
          });
        }, [dispatch]);

        return (
          <div data-testid="selected-spawn">{selectedSpawnId || "none"}</div>
        );
      };

      render(
        <LayoutProvider>
          <TestUnknownActionComponent />
        </LayoutProvider>,
      );

      // State should remain unchanged (still "none" from initial state)
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("none");
    });
  });

  describe("Hook Usage", () => {
    it("throws error when used outside LayoutProvider", () => {
      expect(() => render(<TestComponent />)).toThrow(
        "useLayoutContext must be used within a LayoutProvider",
      );
    });
  });

  describe("Cross-Panel Unsaved Changes Integration", () => {
    it("tracks unsaved changes across different form types", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Initially no unsaved changes
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("false");

      // Simulate configuration form changes
      fireEvent.click(screen.getByTestId("set-unsaved-true"));
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("true");

      // Simulate profile switching should clear unsaved changes
      fireEvent.click(screen.getByTestId("set-profile-2"));
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("false");
    });

    it("maintains unsaved changes state when switching center panel modes", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Set unsaved changes
      fireEvent.click(screen.getByTestId("set-unsaved-true"));
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("true");

      // Switch center panel mode
      fireEvent.click(screen.getByTestId("set-asset-mode"));
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "asset-settings",
      );

      // Unsaved changes should persist
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("true");

      // Switch back to spawn settings mode
      fireEvent.click(screen.getByTestId("set-spawn-mode"));
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "spawn-settings",
      );

      // Unsaved changes should still persist
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("true");
    });

    it("tracks complex state interactions with asset selection and configuration changes", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Initially no unsaved changes
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("false");

      // Simulate asset property changes (like from PropertyModal)
      fireEvent.click(screen.getByTestId("set-unsaved-true"));
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("true");

      // Simulate spawner selection change - should clear unsaved changes
      fireEvent.click(screen.getByTestId("select-spawn-1"));
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("spawn-1");

      // In this implementation, spawn selection resets center panel mode and clears unsaved changes
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "spawn-settings",
      );
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("false");
    });

    it("clears unsaved changes appropriately across different contexts", () => {
      render(
        <LayoutProvider>
          <TestComponent />
        </LayoutProvider>,
      );

      // Set unsaved changes
      fireEvent.click(screen.getByTestId("set-unsaved-true"));
      expect(screen.getByTestId("unsaved-changes")).toHaveTextContent("true");

      // Clear context should preserve unsaved changes when not switching profiles
      fireEvent.click(screen.getByTestId("clear-context"));

      // Context is cleared but unsaved changes should be handled by forms, not by context clearing
      expect(screen.getByTestId("selected-spawn")).toHaveTextContent("none");
      expect(screen.getByTestId("center-mode")).toHaveTextContent(
        "spawn-settings",
      );
    });
  });

  describe("Live Profile State Management", () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();

      // Reset mocks to return no active profile for these tests
      vi.clearAllMocks();
      mockSpawnProfileService.getProfilesWithActiveInfo.mockReturnValue({
        profiles: [],
        activeProfileId: undefined,
      });
    });

    afterEach(() => {
      // Clean up any mounted components
      vi.clearAllMocks();
    });

    const TestComponentWithLiveProfile = () => {
      const {
        activeProfileId,
        liveProfileId,
        setActiveProfile,
        setLiveProfile,
      } = usePanelState();

      return (
        <div>
          <div data-testid="active-profile">{activeProfileId || "none"}</div>
          <div data-testid="live-profile">{liveProfileId || "none"}</div>
          <button
            onClick={() => setActiveProfile("profile-1")}
            data-testid="set-active-profile-1"
          >
            Set Active Profile 1
          </button>
          <button
            onClick={() => setActiveProfile("profile-2")}
            data-testid="set-active-profile-2"
          >
            Set Active Profile 2
          </button>
          <button
            onClick={() => setLiveProfile("profile-1")}
            data-testid="set-live-profile-1"
          >
            Set Live Profile 1
          </button>
          <button
            onClick={() => setLiveProfile("profile-2")}
            data-testid="set-live-profile-2"
          >
            Set Live Profile 2
          </button>
          <button
            onClick={() => setLiveProfile(undefined)}
            data-testid="clear-live-profile"
          >
            Clear Live Profile
          </button>
        </div>
      );
    };

    it("manages live profile state independently of active profile", () => {
      render(
        <LayoutProvider>
          <TestComponentWithLiveProfile />
        </LayoutProvider>,
      );

      // Initially both are undefined
      expect(screen.getByTestId("active-profile")).toHaveTextContent("none");
      expect(screen.getByTestId("live-profile")).toHaveTextContent("none");

      // Set active profile
      fireEvent.click(screen.getByTestId("set-active-profile-1"));
      expect(screen.getByTestId("active-profile")).toHaveTextContent(
        "profile-1",
      );
      expect(screen.getByTestId("live-profile")).toHaveTextContent("none");

      // Set live profile independently
      fireEvent.click(screen.getByTestId("set-live-profile-2"));
      expect(screen.getByTestId("active-profile")).toHaveTextContent(
        "profile-1",
      );
      expect(screen.getByTestId("live-profile")).toHaveTextContent("profile-2");

      // Change active profile without affecting live profile
      fireEvent.click(screen.getByTestId("set-active-profile-2"));
      expect(screen.getByTestId("active-profile")).toHaveTextContent(
        "profile-2",
      );
      expect(screen.getByTestId("live-profile")).toHaveTextContent("profile-2");

      // Change live profile without affecting active profile
      fireEvent.click(screen.getByTestId("set-live-profile-1"));
      expect(screen.getByTestId("active-profile")).toHaveTextContent(
        "profile-2",
      );
      expect(screen.getByTestId("live-profile")).toHaveTextContent("profile-1");
    });

    it("allows clearing live profile independently", () => {
      render(
        <LayoutProvider>
          <TestComponentWithLiveProfile />
        </LayoutProvider>,
      );

      // Set both profiles
      fireEvent.click(screen.getByTestId("set-active-profile-1"));
      fireEvent.click(screen.getByTestId("set-live-profile-2"));
      expect(screen.getByTestId("active-profile")).toHaveTextContent(
        "profile-1",
      );
      expect(screen.getByTestId("live-profile")).toHaveTextContent("profile-2");

      // Clear live profile only
      fireEvent.click(screen.getByTestId("clear-live-profile"));
      expect(screen.getByTestId("active-profile")).toHaveTextContent(
        "profile-1",
      );
      expect(screen.getByTestId("live-profile")).toHaveTextContent("none");
    });

    it("handles live profile state in reducer correctly", () => {
      const { result } = renderHook(() => usePanelState(), {
        wrapper: ({ children }) => <LayoutProvider>{children}</LayoutProvider>,
      });

      // Initially undefined
      expect(result.current.liveProfileId).toBeUndefined();

      // Set live profile
      act(() => {
        result.current.setLiveProfile("profile-1");
      });
      expect(result.current.liveProfileId).toBe("profile-1");

      // Change live profile
      act(() => {
        result.current.setLiveProfile("profile-2");
      });
      expect(result.current.liveProfileId).toBe("profile-2");

      // Clear live profile
      act(() => {
        result.current.setLiveProfile(undefined);
      });
      expect(result.current.liveProfileId).toBeUndefined();
    });
  });
});
