import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAppInitialization } from "../useAppInitialization";
import { SpawnProfileService } from "../../services/spawnProfileService";
import type { SpawnProfile } from "../../types/spawn";

// Mock the SpawnProfileService
vi.mock("../../services/spawnProfileService", () => ({
  SpawnProfileService: {
    ensureDefaultProfile: vi.fn(),
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should complete initialization successfully", async () => {
    // Mock that profiles have been initialized before (no work needed)
    localStorageMock.getItem.mockReturnValue("true");

    const { result } = renderHook(() => useAppInitialization());

    // Should complete initialization
    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.error).toBe(null);
  });

  it("should create default profile on first run", async () => {
    // Mock that profiles haven't been initialized
    localStorageMock.getItem.mockReturnValue(null);

    // Mock successful profile creation
    const mockEnsureDefaultProfile = vi.mocked(
      SpawnProfileService.ensureDefaultProfile
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
      expect(result.current.isInitializing).toBe(false);
    });

    expect(mockEnsureDefaultProfile).toHaveBeenCalledOnce();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "mediaspawner_profiles_initialized",
      "true"
    );
    expect(result.current.error).toBe(null);
  });

  it("should not create default profile on subsequent runs", async () => {
    // Mock that profiles have been initialized before
    localStorageMock.getItem.mockReturnValue("true");

    const mockEnsureDefaultProfile = vi.mocked(
      SpawnProfileService.ensureDefaultProfile
    );

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(mockEnsureDefaultProfile).not.toHaveBeenCalled();
    expect(result.current.error).toBe(null);
  });

  it("should handle profile creation errors", async () => {
    // Mock that profiles haven't been initialized
    localStorageMock.getItem.mockReturnValue(null);

    // Mock failed profile creation
    const mockEnsureDefaultProfile = vi.mocked(
      SpawnProfileService.ensureDefaultProfile
    );
    mockEnsureDefaultProfile.mockReturnValue({
      success: false,
      error: "Failed to create profile",
    });

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.error).toBe("Failed to create profile");
  });

  it("should handle initialization exceptions", async () => {
    // Mock that profiles haven't been initialized
    localStorageMock.getItem.mockReturnValue(null);

    // Mock exception during profile creation
    const mockEnsureDefaultProfile = vi.mocked(
      SpawnProfileService.ensureDefaultProfile
    );
    mockEnsureDefaultProfile.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.error).toBe("Initialization failed");
  });
});
