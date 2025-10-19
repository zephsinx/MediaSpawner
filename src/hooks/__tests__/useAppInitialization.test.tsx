import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAppInitialization } from "../useAppInitialization";
import { SpawnProfileService } from "../../services/spawnProfileService";
import type { SpawnProfile } from "../../types/spawn";

// Mock the SpawnProfileService
vi.mock("../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    ensureDefaultProfile: vi.fn(),
    getActiveProfile: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useAppInitialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.matchMedia - needs to be recreated after clearAllMocks
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should complete initialization successfully", async () => {
    // Mock that profiles have been initialized before (no work needed)
    localStorageMock.getItem.mockReturnValue("true");

    // Mock that there's an active profile
    const mockGetActiveProfile = vi.mocked(
      SpawnProfileService.getActiveProfile,
    );
    mockGetActiveProfile.mockReturnValue({
      id: "default",
      name: "Default Profile",
      description: "Default spawn profile",
      spawns: [],
      lastModified: Date.now(),
      isActive: true,
    } as SpawnProfile);

    const { result } = renderHook(() => useAppInitialization());

    // Should complete initialization
    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });

    expect(result.current.error).toBe(null);
  });

  it("should create default profile on first run", async () => {
    // Mock that profiles haven't been initialized
    localStorageMock.getItem.mockReturnValue(null);

    // Mock successful profile creation
    const mockEnsureDefaultProfile = vi.mocked(
      SpawnProfileService.ensureDefaultProfile,
    );
    mockEnsureDefaultProfile.mockReturnValue({
      success: true,
      profile: {
        id: "default",
        name: "Default Profile",
        description: "Default spawn profile",
        spawns: [],
        lastModified: Date.now(),
        isActive: true,
      } as SpawnProfile,
    });

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });

    expect(mockEnsureDefaultProfile).toHaveBeenCalledOnce();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "mediaspawner_profiles_initialized",
      "true",
    );
    expect(result.current.error).toBe(null);
  });

  it("should not create default profile on subsequent runs", async () => {
    // Mock that profiles have been initialized before
    localStorageMock.getItem.mockReturnValue("true");

    // Mock that there's an active profile
    const mockGetActiveProfile = vi.mocked(
      SpawnProfileService.getActiveProfile,
    );
    mockGetActiveProfile.mockReturnValue({
      id: "default",
      name: "Default Profile",
      description: "Default spawn profile",
      spawns: [],
      lastModified: Date.now(),
      isActive: true,
    } as SpawnProfile);

    const mockEnsureDefaultProfile = vi.mocked(
      SpawnProfileService.ensureDefaultProfile,
    );

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });

    expect(mockEnsureDefaultProfile).not.toHaveBeenCalled();
    expect(result.current.error).toBe(null);
  });

  it("should auto-heal when initialization flag exists but no active profile", async () => {
    // Mock that profiles have been initialized before
    localStorageMock.getItem.mockReturnValue("true");

    // Mock that there's NO active profile (this is the auto-heal scenario)
    const mockGetActiveProfile = vi.mocked(
      SpawnProfileService.getActiveProfile,
    );
    mockGetActiveProfile.mockReturnValue(null);

    // Mock successful profile creation/restoration
    const mockEnsureDefaultProfile = vi.mocked(
      SpawnProfileService.ensureDefaultProfile,
    );
    mockEnsureDefaultProfile.mockReturnValue({
      success: true,
      profile: {
        id: "default",
        name: "Default Profile",
        description: "Default spawn profile",
        spawns: [],
        lastModified: Date.now(),
        isActive: true,
      } as SpawnProfile,
    });

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });

    // Should call ensureDefaultProfile to auto-heal the state
    expect(mockEnsureDefaultProfile).toHaveBeenCalledOnce();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "mediaspawner_profiles_initialized",
      "true",
    );
    expect(result.current.error).toBe(null);
  });

  it("should handle profile creation errors", async () => {
    // Mock that profiles haven't been initialized
    localStorageMock.getItem.mockReturnValue(null);

    // Mock failed profile creation
    const mockEnsureDefaultProfile = vi.mocked(
      SpawnProfileService.ensureDefaultProfile,
    );
    mockEnsureDefaultProfile.mockReturnValue({
      success: false,
      error: "Failed to create profile",
    });

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to create profile");
    });
  });

  it("should handle initialization exceptions", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Mock that profiles haven't been initialized
    localStorageMock.getItem.mockReturnValue(null);

    // Mock exception during profile creation
    const mockEnsureDefaultProfile = vi.mocked(
      SpawnProfileService.ensureDefaultProfile,
    );
    mockEnsureDefaultProfile.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.error).toBe("Initialization failed");
    });

    errorSpy.mockRestore();
  });
});
