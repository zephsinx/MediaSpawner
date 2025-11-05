/**
 * Tests for GoogleDriveService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GoogleDriveService } from "../googleDriveService";
import {
  createLocalStorageMock,
  setupLocalStorageMock,
  resetLocalStorageMock,
} from "./testUtils";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto APIs
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    // Fill with predictable values for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256;
    }
    return array;
  }),
  randomUUID: vi.fn(() => "test-uuid-123"),
  subtle: {
    digest: vi.fn(async (_algorithm: string, data: ArrayBuffer) => {
      // Simple mock hash - just return first 32 bytes as hash
      const view = new Uint8Array(data);
      const hash = new Uint8Array(32);
      for (let i = 0; i < 32 && i < view.length; i++) {
        hash[i] = view[i];
      }
      return hash.buffer;
    }),
  },
};

// Mock window.location
const mockLocation = {
  href: "",
  origin: "http://localhost",
  pathname: "/",
};

// Mock sessionStorage
const mockSessionStorage: Storage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

describe("GoogleDriveService", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup localStorage mock
    localStorageMock = createLocalStorageMock();
    setupLocalStorageMock(localStorageMock);

    // Setup crypto mocks
    Object.defineProperty(global, "crypto", {
      value: mockCrypto,
      writable: true,
      configurable: true,
    });

    // Setup window.location mock
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
      configurable: true,
    });

    // Setup sessionStorage mock
    Object.defineProperty(window, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });

    // Reset location href
    mockLocation.href = "";
  });

  afterEach(() => {
    resetLocalStorageMock(localStorageMock);
    GoogleDriveService.clearTokens();
  });

  describe("authenticate", () => {
    it("should generate PKCE and redirect to Google OAuth URL", async () => {
      await GoogleDriveService.authenticate();

      // Verify sessionStorage was called to store code verifier and state
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_code_verifier",
        expect.any(String),
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_oauth_state",
        "test-uuid-123",
      );

      // Verify redirect URL was set
      expect(mockLocation.href).toContain(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      expect(mockLocation.href).toContain("client_id=");
      expect(mockLocation.href).toContain("code_challenge=");
      expect(mockLocation.href).toContain("code_challenge_method=S256");
      expect(mockLocation.href).toContain("state=test-uuid-123");
      expect(mockLocation.href).toContain("access_type=offline");
      expect(mockLocation.href).toContain("prompt=consent");
    });

    it("should handle errors during authentication", async () => {
      // Mock crypto.getRandomValues to throw
      mockCrypto.getRandomValues.mockImplementationOnce(() => {
        throw new Error("Crypto error");
      });

      await expect(GoogleDriveService.authenticate()).rejects.toThrow(
        "Crypto error",
      );
    });
  });

  describe("handleOAuthCallback", () => {
    const mockCode = "test-auth-code";
    const mockState = "test-uuid-123";
    const mockCodeVerifier = "test-code-verifier";

    beforeEach(() => {
      // Setup sessionStorage to return valid state and code verifier
      vi.mocked(mockSessionStorage.getItem).mockImplementation(
        (key: string) => {
          if (key === "mediaspawner_gdrive_oauth_state") {
            return mockState;
          }
          if (key === "mediaspawner_gdrive_code_verifier") {
            return mockCodeVerifier;
          }
          return null;
        },
      );
    });

    it("should exchange code for tokens and store them", async () => {
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        token_type: "Bearer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await GoogleDriveService.handleOAuthCallback(
        mockCode,
        mockState,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: expect.stringContaining("code=test-auth-code"),
        }),
      );

      // Verify tokens were stored in localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_tokens",
        expect.any(String),
      );

      // Verify sessionStorage was cleaned up
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_code_verifier",
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_oauth_state",
      );
    });

    it("should return error for invalid state", async () => {
      const result = await GoogleDriveService.handleOAuthCallback(
        mockCode,
        "invalid-state",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid OAuth state parameter");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return error when code verifier is missing", async () => {
      vi.mocked(mockSessionStorage.getItem).mockImplementation(
        (key: string) => {
          if (key === "mediaspawner_gdrive_oauth_state") {
            return mockState;
          }
          return null; // Code verifier missing
        },
      );

      const result = await GoogleDriveService.handleOAuthCallback(
        mockCode,
        mockState,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Code verifier not found");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return error when refresh token is missing", async () => {
      const mockTokenResponse = {
        access_token: "test-access-token",
        // No refresh_token
        expires_in: 3600,
        token_type: "Bearer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await GoogleDriveService.handleOAuthCallback(
        mockCode,
        mockState,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("No refresh token received");
    });

    it("should handle token exchange failures", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({ error: "invalid_grant" }),
      });

      const result = await GoogleDriveService.handleOAuthCallback(
        mockCode,
        mockState,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Token exchange failed");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await GoogleDriveService.handleOAuthCallback(
        mockCode,
        mockState,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("getAuthStatus", () => {
    it("should return unauthenticated when no tokens exist", async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const status = await GoogleDriveService.getAuthStatus();

      expect(status.authenticated).toBe(false);
      expect(status.needsRefresh).toBe(false);
    });

    it("should return authenticated when valid tokens exist", async () => {
      const tokens = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000, // 1 hour from now
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tokens));

      const status = await GoogleDriveService.getAuthStatus();

      expect(status.authenticated).toBe(true);
      expect(status.needsRefresh).toBe(false);
    });

    it("should refresh token when near expiry", async () => {
      const tokens = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 4 * 60 * 1000, // 4 minutes (within 5 min threshold)
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tokens));

      const mockTokenResponse = {
        access_token: "new-access-token",
        expires_in: 3600,
        token_type: "Bearer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const status = await GoogleDriveService.getAuthStatus();

      expect(status.authenticated).toBe(true);
      expect(status.needsRefresh).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should return error when refresh fails", async () => {
      const tokens = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 4 * 60 * 1000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tokens));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
        json: async () => ({ error: "invalid_grant" }),
      });

      const status = await GoogleDriveService.getAuthStatus();

      expect(status.authenticated).toBe(false);
      expect(status.needsRefresh).toBe(true);
      expect(status.error).toBeDefined();
    });
  });

  describe("uploadBackup", () => {
    const mockConfigJson = JSON.stringify({ version: "1.0.0", profiles: [] });

    beforeEach(() => {
      // Setup valid tokens
      const tokens = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      };
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "mediaspawner_gdrive_tokens") {
          return JSON.stringify(tokens);
        }
        return null;
      });
    });

    it("should create new file when fileId doesn't exist", async () => {
      // Mock file query to return no files
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "new-file-id",
            name: "mediaspawner-backup.json",
            mimeType: "application/json",
          }),
        });

      const result = await GoogleDriveService.uploadBackup(mockConfigJson);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Verify file was created
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("uploadType=multipart"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );

      // Verify fileId was stored
      const setItemCalls = localStorageMock.setItem.mock.calls;
      const tokenCall = setItemCalls.find((call) =>
        call[0].includes("gdrive_tokens"),
      );
      expect(tokenCall).toBeDefined();
      const storedTokens = JSON.parse(tokenCall![1] as string);
      expect(storedTokens.fileId).toBe("new-file-id");
    });

    it("should update existing file when fileId exists", async () => {
      // Setup tokens with fileId
      const tokens = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
        fileId: "existing-file-id",
      };
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "mediaspawner_gdrive_tokens") {
          return JSON.stringify(tokens);
        }
        return null;
      });

      // Mock file verification to succeed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "existing-file-id",
          name: "mediaspawner-backup.json",
        }),
      });

      // Mock update to succeed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await GoogleDriveService.uploadBackup(mockConfigJson);

      expect(result.success).toBe(true);

      // Verify file was updated (PATCH method)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("existing-file-id"),
        expect.objectContaining({
          method: "PATCH",
        }),
      );
    });

    it("should query by filename when fileId is invalid", async () => {
      const tokens = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
        fileId: "invalid-file-id",
      };
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "mediaspawner_gdrive_tokens") {
          return JSON.stringify(tokens);
        }
        return null;
      });

      // Mock file verification to fail, then query to find file
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            files: [{ id: "found-file-id", name: "mediaspawner-backup.json" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const result = await GoogleDriveService.uploadBackup(mockConfigJson);

      expect(result.success).toBe(true);

      // Verify query was made (URL encoded)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("name%3D"),
        expect.any(Object),
      );
    });

    it("should return error when access token cannot be obtained", async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await GoogleDriveService.uploadBackup(mockConfigJson);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No authentication tokens found");
    });

    it("should handle upload failures", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: "Forbidden",
          json: async () => ({ error: { message: "Permission denied" } }),
        });

      const result = await GoogleDriveService.uploadBackup(mockConfigJson);

      expect(result.success).toBe(false);
      expect(result.error).toContain("File creation failed");
    });
  });

  describe("revokeAccess", () => {
    it("should revoke tokens and clear storage", async () => {
      const tokens = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      };
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "mediaspawner_gdrive_tokens") {
          return JSON.stringify(tokens);
        }
        return null;
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await GoogleDriveService.revokeAccess();

      expect(result.success).toBe(true);

      // Verify revoke API was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("revoke"),
        expect.any(Object),
      );

      // Verify storage was cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_tokens",
      );
    });

    it("should clear storage even if revoke API fails", async () => {
      const tokens = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      };
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === "mediaspawner_gdrive_tokens") {
          return JSON.stringify(tokens);
        }
        return null;
      });

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await GoogleDriveService.revokeAccess();

      // Should still succeed and clear storage
      expect(result.success).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_tokens",
      );
    });

    it("should clear storage when no tokens exist", async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await GoogleDriveService.revokeAccess();

      expect(result.success).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_tokens",
      );
    });
  });

  describe("clearTokens", () => {
    it("should clear all stored tokens and session data", () => {
      GoogleDriveService.clearTokens();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_tokens",
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_code_verifier",
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "mediaspawner_gdrive_oauth_state",
      );
    });
  });

  describe("isAuthenticated", () => {
    it("should return false when no tokens exist", () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(GoogleDriveService.isAuthenticated()).toBe(false);
    });

    it("should return true when valid tokens exist", () => {
      const tokens = {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tokens));

      expect(GoogleDriveService.isAuthenticated()).toBe(true);
    });

    it("should return false when access token is empty", () => {
      const tokens = {
        access_token: "",
        refresh_token: "test-refresh",
        expires_at: Date.now() + 3600000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tokens));

      expect(GoogleDriveService.isAuthenticated()).toBe(false);
    });
  });
});
