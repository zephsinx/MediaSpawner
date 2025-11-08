import { useEffect, useState } from "react";
import { GoogleDriveService } from "../../services/googleDriveService";

/**
 * OAuth Callback component that runs in a popup window
 *
 * Handles the OAuth callback from Google, exchanges the authorization code
 * for tokens, and communicates the result back to the parent window.
 */
export function OAuthCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract code and state from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");

        if (!code || !state) {
          const error = "Missing authorization code or state parameter";
          setStatus("error");
          setErrorMessage(error);
          sendMessageToParent(false, error);
          return;
        }

        // Handle OAuth callback
        const result = await GoogleDriveService.handleOAuthCallback(
          code,
          state,
        );

        if (result.success) {
          setStatus("success");
          sendMessageToParent(true);
          // Close popup after a brief delay to show success message
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          setStatus("error");
          const error = result.error || "Authentication failed";
          setErrorMessage(error);
          sendMessageToParent(false, error);
          // Keep popup open so user can see the error
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unexpected error occurred";
        setStatus("error");
        setErrorMessage(errorMsg);
        sendMessageToParent(false, errorMsg);
      }
    };

    handleCallback();
  }, []);

  /**
   * Send message to parent window with OAuth result
   */
  const sendMessageToParent = (success: boolean, error?: string) => {
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "oauth-callback",
          success,
          error,
        },
        window.location.origin,
      );
    } else {
      // If opener is null, popup was blocked or parent window closed
      console.warn("Cannot send message to parent: window.opener is null");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[rgb(var(--color-bg))] p-8">
      <div className="max-w-md w-full text-center">
        {status === "processing" && (
          <>
            <div className="mb-4">
              <div className="inline-block w-8 h-8 border-4 border-[rgb(var(--color-accent))] border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-lg font-semibold text-[rgb(var(--color-fg))] mb-2">
              Completing authentication...
            </h1>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              Please wait while we complete your Google Drive authentication.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-4">
              <div className="inline-block w-12 h-12 rounded-full bg-[rgb(var(--color-success))]/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[rgb(var(--color-success))]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-lg font-semibold text-[rgb(var(--color-fg))] mb-2">
              Authentication successful!
            </h1>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              This window will close automatically.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-4">
              <div className="inline-block w-12 h-12 rounded-full bg-[rgb(var(--color-error-bg))] flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[rgb(var(--color-error))]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-lg font-semibold text-[rgb(var(--color-error))] mb-2">
              Authentication failed
            </h1>
            <p className="text-sm text-[rgb(var(--color-error))] mb-4">
              {errorMessage || "An error occurred during authentication."}
            </p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-foreground))] rounded-md hover:bg-[rgb(var(--color-accent-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
