/**
 * Service for Google Drive OAuth and backup file operations
 *
 * Implements OAuth 2.0 PKCE flow using Fetch API only (no external libraries).
 * Handles token storage, refresh, and file upload/update operations.
 */

/**
 * Google OAuth client ID
 */
const GOOGLE_CLIENT_ID =
  (import.meta as unknown as { env: { VITE_GOOGLE_CLIENT_ID?: string } }).env
    .VITE_GOOGLE_CLIENT_ID ||
  "312818501517-i2ad4uttagfi0fnpe4llnr657k11760i.apps.googleusercontent.com";

/**
 * Google OAuth redirect URI
 * Must match the redirect URI configured in Google Cloud Console
 */
const REDIRECT_URI = `${window.location.origin}/oauth-callback`;

/**
 * Google OAuth scopes for Drive API
 */
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

/**
 * Storage keys
 */
const TOKEN_STORAGE_KEY = "mediaspawner_gdrive_tokens";
const CODE_VERIFIER_STORAGE_KEY = "mediaspawner_gdrive_code_verifier";
const OAUTH_STATE_STORAGE_KEY = "mediaspawner_gdrive_oauth_state";

/**
 * Backup filename
 */
const BACKUP_FILENAME = "mediaspawner-backup.json";

/**
 * Token refresh threshold (5 minutes before expiration)
 */
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Stored token data structure
 */
interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in milliseconds
  fileId?: string; // Google Drive file ID for the backup file
}

/**
 * OAuth token response from Google
 */
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // Seconds
  token_type: string;
  scope?: string;
}

/**
 * Google Drive file metadata
 */
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

/**
 * Google Drive API list response
 */
interface DriveFileListResponse {
  files: DriveFile[];
}

/**
 * Service result type
 */
export interface GoogleDriveServiceResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Service for managing Google Drive OAuth and backup operations
 */
export class GoogleDriveService {
  /**
   * Generate PKCE code verifier and challenge
   */
  private static async generatePKCE(): Promise<{
    codeVerifier: string;
    codeChallenge: string;
  }> {
    // Generate random code verifier (43-128 characters, URL-safe)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 128);

    // Generate code challenge (SHA256 hash, base64url encoded)
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeChallenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return { codeVerifier, codeChallenge };
  }

  /**
   * Initiate OAuth 2.0 authentication flow using popup window
   */
  static async authenticate(): Promise<GoogleDriveServiceResult> {
    return new Promise((resolve) => {
      try {
        // Generate PKCE
        this.generatePKCE()
          .then(({ codeVerifier, codeChallenge }) => {
            // Generate state for CSRF protection
            const state = crypto.randomUUID();

            // Store code verifier and state in sessionStorage
            sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, codeVerifier);
            sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, state);

            // Build OAuth URL
            const params = new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              redirect_uri: REDIRECT_URI,
              response_type: "code",
              scope: SCOPES.join(" "),
              code_challenge: codeChallenge,
              code_challenge_method: "S256",
              state: state,
              access_type: "offline", // Required to get refresh token
              prompt: "consent", // Force consent screen to get refresh token
            });

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

            // Open popup window
            const popup = window.open(
              authUrl,
              "oauth-popup",
              "width=500,height=600,scrollbars=yes,resizable=yes",
            );

            // Check if popup was blocked
            if (!popup || popup.closed || typeof popup.closed === "undefined") {
              return resolve({
                success: false,
                error:
                  "Popup blocked. Please allow popups for this site and try again.",
              });
            }

            // Set up message listener for OAuth callback
            const messageHandler = (event: MessageEvent) => {
              // Verify origin for security
              if (event.origin !== window.location.origin) {
                return;
              }

              // Check if message is from OAuth callback
              if (event.data && event.data.type === "oauth-callback") {
                // Remove listener
                window.removeEventListener("message", messageHandler);

                // Clear intervals
                if (popupCheckInterval) {
                  clearInterval(popupCheckInterval);
                }
                if (timeoutId) {
                  clearTimeout(timeoutId);
                }

                // Close popup if still open
                if (popup && !popup.closed) {
                  popup.close();
                }

                // Resolve or reject based on result
                if (event.data.success) {
                  resolve({
                    success: true,
                    data: { message: "Authentication successful" },
                  });
                } else {
                  resolve({
                    success: false,
                    error: event.data.error || "Authentication failed",
                  });
                }
              }
            };

            window.addEventListener("message", messageHandler);

            // Monitor popup for manual closure
            const popupCheckInterval = setInterval(() => {
              if (popup.closed) {
                // Remove listener
                window.removeEventListener("message", messageHandler);

                // Clear timeout
                if (timeoutId) {
                  clearTimeout(timeoutId);
                }

                // Clear interval
                if (popupCheckInterval) {
                  clearInterval(popupCheckInterval);
                }

                // Reject with user cancellation message
                resolve({
                  success: false,
                  error:
                    "Authentication cancelled. The popup window was closed.",
                });
              }
            }, 500); // Check every 500ms

            // Set timeout (5 minutes)
            const timeoutId = setTimeout(
              () => {
                // Remove listener
                window.removeEventListener("message", messageHandler);

                // Clear interval
                if (popupCheckInterval) {
                  clearInterval(popupCheckInterval);
                }

                // Close popup if still open
                if (popup && !popup.closed) {
                  popup.close();
                }

                // Reject with timeout error
                resolve({
                  success: false,
                  error: "Authentication timeout. Please try again.",
                });
              },
              5 * 60 * 1000,
            ); // 5 minutes
          })
          .catch((error) => {
            console.error("Failed to initiate OAuth authentication:", error);
            resolve({
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to initiate authentication",
            });
          });
      } catch (error) {
        console.error("Failed to initiate OAuth authentication:", error);
        resolve({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to initiate authentication",
        });
      }
    });
  }

  /**
   * Handle OAuth callback and exchange authorization code for tokens
   */
  static async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<GoogleDriveServiceResult> {
    try {
      // Verify state
      const storedState = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY);
      if (!storedState || storedState !== state) {
        return {
          success: false,
          error: "Invalid OAuth state parameter",
        };
      }

      // Get code verifier
      const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY);
      if (!codeVerifier) {
        return {
          success: false,
          error: "Code verifier not found. Please restart authentication.",
        };
      }

      // Exchange code for tokens
      const tokenUrl = "https://oauth2.googleapis.com/token";
      const tokenParams = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenParams.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `Token exchange failed: ${errorData.error || response.statusText}`,
        };
      }

      const tokenData: TokenResponse = await response.json();

      // Calculate expiration time
      const expiresAt = Date.now() + tokenData.expires_in * 1000;

      // refresh_token may not be provided if user previously authorized
      // In that case, we'll need to re-authenticate with prompt=consent
      if (!tokenData.refresh_token) {
        return {
          success: false,
          error:
            "No refresh token received. Please re-authenticate and ensure you grant all permissions.",
        };
      }

      const storedTokens: TokenData = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      };

      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(storedTokens));

      // Clean up sessionStorage
      sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
      sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY);

      return {
        success: true,
        data: { message: "Authentication successful" },
      };
    } catch (error) {
      console.error("OAuth callback handling failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "OAuth callback failed",
      };
    }
  }

  /**
   * Get stored tokens
   */
  private static getStoredTokens(): TokenData | null {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored) as TokenData;
    } catch {
      return null;
    }
  }

  /**
   * Store tokens
   */
  private static storeTokens(tokens: TokenData): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }

  /**
   * Refresh access token using refresh token
   */
  private static async refreshAccessToken(): Promise<GoogleDriveServiceResult> {
    try {
      const tokens = this.getStoredTokens();
      if (!tokens || !tokens.refresh_token) {
        return {
          success: false,
          error: "No refresh token available. Please re-authenticate.",
        };
      }

      const tokenUrl = "https://oauth2.googleapis.com/token";
      const tokenParams = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenParams.toString(),
      });

      if (!response.ok) {
        // If refresh fails, clear tokens and require re-authentication
        this.clearTokens();
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `Token refresh failed: ${errorData.error || response.statusText}. Please re-authenticate.`,
        };
      }

      const tokenData: TokenResponse = await response.json();

      // Calculate new expiration time
      const expiresAt = Date.now() + tokenData.expires_in * 1000;

      // Update tokens (preserve existing refresh_token and fileId)
      const updatedTokens: TokenData = {
        access_token: tokenData.access_token,
        refresh_token: tokens.refresh_token, // Refresh token doesn't change
        expires_at: expiresAt,
        fileId: tokens.fileId,
      };

      this.storeTokens(updatedTokens);

      return {
        success: true,
        data: updatedTokens,
      };
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.clearTokens();
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Token refresh failed. Please re-authenticate.",
      };
    }
  }

  /**
   * Check if token needs refresh and refresh if needed
   * This is called before all API operations
   */
  private static async refreshAccessTokenIfNeeded(): Promise<GoogleDriveServiceResult> {
    const tokens = this.getStoredTokens();
    if (!tokens) {
      return {
        success: false,
        error: "No authentication tokens found. Please authenticate first.",
      };
    }

    // Check if token expires within threshold
    const timeUntilExpiry = tokens.expires_at - Date.now();
    if (timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD_MS) {
      return await this.refreshAccessToken();
    }

    return { success: true };
  }

  /**
   * Get access token (refreshes if needed)
   */
  private static async getAccessToken(): Promise<string | null> {
    // Refresh if needed
    const refreshResult = await this.refreshAccessTokenIfNeeded();
    if (!refreshResult.success) {
      return null;
    }

    const tokens = this.getStoredTokens();
    return tokens?.access_token || null;
  }

  /**
   * Find file ID by filename (privacy-first: only queries known filename)
   */
  private static async getFileId(): Promise<string | null> {
    try {
      const tokens = this.getStoredTokens();
      if (tokens?.fileId) {
        // Verify file still exists
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
          return null;
        }

        const verifyUrl = `https://www.googleapis.com/drive/v3/files/${tokens.fileId}?fields=id,name`;
        const verifyResponse = await fetch(verifyUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (verifyResponse.ok) {
          return tokens.fileId;
        }
      }

      // File ID not found or invalid, query by name
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return null;
      }

      // Privacy-first: only query for the specific known filename
      // Google Drive API query format: name='filename' (quotes are literal)
      const query = `name='${BACKUP_FILENAME}'`;
      const queryUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`;
      const queryResponse = await fetch(queryUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!queryResponse.ok) {
        return null;
      }

      const data: DriveFileListResponse = await queryResponse.json();
      if (data.files && data.files.length > 0) {
        const fileId = data.files[0].id;

        // Store fileId for future use
        const updatedTokens = this.getStoredTokens();
        if (updatedTokens) {
          updatedTokens.fileId = fileId;
          this.storeTokens(updatedTokens);
        }

        return fileId;
      }

      return null;
    } catch (error) {
      console.error("Failed to get file ID:", error);
      return null;
    }
  }

  /**
   * Upload or update backup file to Google Drive
   */
  static async uploadBackup(
    configJson: string,
  ): Promise<GoogleDriveServiceResult> {
    try {
      // Refresh token if needed
      const refreshResult = await this.refreshAccessTokenIfNeeded();
      if (!refreshResult.success) {
        return refreshResult;
      }

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: "Failed to obtain access token. Please re-authenticate.",
        };
      }

      // Try to get existing file ID
      const fileId = await this.getFileId();

      if (fileId) {
        // Update existing file
        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        const boundary = `----WebKitFormBoundary${Date.now()}`;
        const metadata = JSON.stringify({
          name: BACKUP_FILENAME,
          mimeType: "application/json",
        });

        const body = [
          `--${boundary}`,
          'Content-Disposition: form-data; name="metadata"',
          "Content-Type: application/json",
          "",
          metadata,
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"',
          "Content-Type: application/json",
          "",
          configJson,
          `--${boundary}--`,
        ].join("\r\n");

        const updateResponse = await fetch(updateUrl, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: body,
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          return {
            success: false,
            error: `File update failed: ${errorData.error?.message || updateResponse.statusText}`,
          };
        }

        return {
          success: true,
          data: { message: "Backup updated successfully" },
        };
      } else {
        // Create new file
        const createUrl =
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
        const boundary = `----WebKitFormBoundary${Date.now()}`;
        const metadata = JSON.stringify({
          name: BACKUP_FILENAME,
          mimeType: "application/json",
        });

        const body = [
          `--${boundary}`,
          'Content-Disposition: form-data; name="metadata"',
          "Content-Type: application/json",
          "",
          metadata,
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"',
          "Content-Type: application/json",
          "",
          configJson,
          `--${boundary}--`,
        ].join("\r\n");

        const createResponse = await fetch(createUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: body,
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          return {
            success: false,
            error: `File creation failed: ${errorData.error?.message || createResponse.statusText}`,
          };
        }

        const fileData: DriveFile = await createResponse.json();

        // Store fileId
        const tokens = this.getStoredTokens();
        if (tokens) {
          tokens.fileId = fileData.id;
          this.storeTokens(tokens);
        }

        return {
          success: true,
          data: {
            message: "Backup uploaded successfully",
            fileId: fileData.id,
          },
        };
      }
    } catch (error) {
      console.error("Backup upload failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Backup upload failed",
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return tokens !== null && tokens.access_token !== "";
  }

  /**
   * Get authentication status
   */
  static async getAuthStatus(): Promise<{
    authenticated: boolean;
    needsRefresh: boolean;
    error?: string;
  }> {
    const tokens = this.getStoredTokens();
    if (!tokens) {
      return { authenticated: false, needsRefresh: false };
    }

    const timeUntilExpiry = tokens.expires_at - Date.now();
    const needsRefresh = timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD_MS;

    // Try to refresh if needed
    if (needsRefresh) {
      const refreshResult = await this.refreshAccessTokenIfNeeded();
      if (!refreshResult.success) {
        return {
          authenticated: false,
          needsRefresh: true,
          error: refreshResult.error,
        };
      }
    }

    return {
      authenticated: true,
      needsRefresh: false,
    };
  }

  /**
   * Revoke access and clear all stored tokens
   */
  static async revokeAccess(): Promise<GoogleDriveServiceResult> {
    try {
      const tokens = this.getStoredTokens();
      if (tokens?.access_token) {
        // Revoke token at Google
        const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`;
        await fetch(revokeUrl, {
          method: "POST",
        }).catch(() => {
          // Ignore errors - we'll clear local tokens anyway
        });
      }

      // Clear all stored data
      this.clearTokens();

      return {
        success: true,
        data: { message: "Access revoked successfully" },
      };
    } catch (error) {
      console.error("Failed to revoke access:", error);
      // Still clear local tokens even if revocation fails
      this.clearTokens();
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to revoke access",
      };
    }
  }

  /**
   * Clear all stored tokens and data
   */
  static clearTokens(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY);
  }
}
