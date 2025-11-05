/**
 * Tests for GoogleDriveBackupSection component
 */

import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { GoogleDriveBackupSection } from "../GoogleDriveBackupSection";
import { GoogleDriveService } from "../../../services/googleDriveService";
import { SettingsService } from "../../../services/settingsService";
import { ImportExportService } from "../../../services/importExportService";
import { toast } from "sonner";
import { renderWithAllProviders } from "../../layout/__tests__/testUtils";

// Mock services
vi.mock("../../../services/googleDriveService");
vi.mock("../../../services/settingsService");
vi.mock("../../../services/importExportService");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock document.visibilityState
Object.defineProperty(document, "visibilityState", {
  writable: true,
  value: "visible",
});

describe("GoogleDriveBackupSection", () => {
  let getAuthStatusMock: Mock;
  let authenticateMock: Mock;
  let uploadBackupMock: Mock;
  let revokeAccessMock: Mock;
  let getSettingsMock: Mock;
  let updateSettingsMock: Mock;
  let exportConfigurationMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup localStorage and sessionStorage mocks
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });

    // Setup service mocks
    getAuthStatusMock = vi.fn();
    authenticateMock = vi.fn();
    uploadBackupMock = vi.fn();
    revokeAccessMock = vi.fn();
    getSettingsMock = vi.fn();
    updateSettingsMock = vi.fn();
    exportConfigurationMock = vi.fn();

    vi.mocked(GoogleDriveService).getAuthStatus = getAuthStatusMock;
    vi.mocked(GoogleDriveService).authenticate = authenticateMock;
    vi.mocked(GoogleDriveService).uploadBackup = uploadBackupMock;
    vi.mocked(GoogleDriveService).revokeAccess = revokeAccessMock;
    vi.mocked(SettingsService).getSettings = getSettingsMock;
    vi.mocked(SettingsService).updateSettings = updateSettingsMock;
    vi.mocked(ImportExportService).exportConfiguration =
      exportConfigurationMock;

    // Default mock implementations - must be set before any renders
    getAuthStatusMock.mockResolvedValue({
      authenticated: false,
      needsRefresh: false,
    });
    getSettingsMock.mockReturnValue({
      googleDriveBackup: undefined,
    });
    updateSettingsMock.mockReturnValue({
      success: true,
      settings: {},
    });
    revokeAccessMock.mockResolvedValue({
      success: true,
      data: { message: "Access revoked" },
    });

    // Reset localStorage mocks
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render with default disabled state", async () => {
      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("switch", { name: /enable google drive backup/i }),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/connected to google drive/i),
      ).not.toBeInTheDocument();
    });

    it("should show connection status when enabled and authenticated", async () => {
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      // Enable the toggle
      await waitFor(() => {
        expect(
          screen.getByRole("switch", { name: /enable google drive backup/i }),
        ).toBeInTheDocument();
      });
      const toggle = screen.getByRole("switch", {
        name: /enable google drive backup/i,
      });
      await act(async () => {
        fireEvent.click(toggle);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/connected to google drive/i),
        ).toBeInTheDocument();
      });
    });

    it("should show manual backup button when authenticated", async () => {
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: false,
          backupFrequency: "daily",
        },
      });
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByRole("button", {
              name: /create manual backup to google drive/i,
            }),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should show auto-backup settings when enabled", async () => {
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: true,
          backupFrequency: "daily",
        },
      });
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByLabelText(/backup frequency/i),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should display last backup status indicator", async () => {
      const lastBackupTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: false,
          backupFrequency: "daily",
          lastBackupTime,
          lastBackupStatus: "success",
        },
      });
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(screen.getByText(/last backup:/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("enable/disable toggle", () => {
    it("should trigger OAuth flow when enabling and not authenticated", async () => {
      authenticateMock.mockResolvedValue(undefined);

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("switch", { name: /enable google drive backup/i }),
        ).toBeInTheDocument();
      });
      const toggle = screen.getByRole("switch", {
        name: /enable google drive backup/i,
      });
      await act(async () => {
        fireEvent.click(toggle);
      });

      await waitFor(() => {
        expect(authenticateMock).toHaveBeenCalled();
      });
    });

    it("should enable directly when already authenticated", async () => {
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("switch", { name: /enable google drive backup/i }),
        ).toBeInTheDocument();
      });
      const toggle = screen.getByRole("switch", {
        name: /enable google drive backup/i,
      });
      await act(async () => {
        fireEvent.click(toggle);
      });

      await waitFor(() => {
        expect(updateSettingsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            googleDriveBackup: expect.objectContaining({
              enabled: true,
            }),
          }),
        );
      });
    });

    it("should revoke access when disabling", async () => {
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: false,
          backupFrequency: "daily",
        },
      });
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("switch", { name: /enable google drive backup/i }),
        ).toBeInTheDocument();
      });
      const toggle = screen.getByRole("switch", {
        name: /enable google drive backup/i,
      });
      await act(async () => {
        fireEvent.click(toggle);
      });

      await waitFor(() => {
        expect(revokeAccessMock).toHaveBeenCalled();
      });
    });

    it("should show error on authentication failure", async () => {
      authenticateMock.mockRejectedValue(new Error("Auth failed"));

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(() => {
        expect(
          screen.getByRole("switch", { name: /enable google drive backup/i }),
        ).toBeInTheDocument();
      });
      const toggle = screen.getByRole("switch", {
        name: /enable google drive backup/i,
      });
      await act(async () => {
        fireEvent.click(toggle);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Google Drive authentication failed: Auth failed",
        );
      });
    });
  });

  describe("manual backup", () => {
    beforeEach(() => {
      // Mock getSettings to return consistent values on multiple calls
      const mockSettings = {
        googleDriveBackup: {
          enabled: true,
          autoBackup: false,
          backupFrequency: "daily",
        },
      };
      getSettingsMock.mockReturnValue(mockSettings);
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });
    });

    it("should trigger backup on button click", async () => {
      exportConfigurationMock.mockResolvedValue({
        success: true,
        data: JSON.stringify({ version: "1.0.0", profiles: [] }),
      });
      uploadBackupMock.mockResolvedValue({
        success: true,
        data: { message: "Backup uploaded successfully" },
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      // Wait for auth check to complete and button to appear
      await waitFor(
        () => {
          expect(
            screen.getByRole("button", {
              name: /create manual backup to google drive/i,
            }),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const backupButton = screen.getByRole("button", {
        name: /create manual backup to google drive/i,
      });
      await act(async () => {
        fireEvent.click(backupButton);
      });

      await waitFor(
        () => {
          expect(exportConfigurationMock).toHaveBeenCalled();
          expect(uploadBackupMock).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );
    });

    it("should show loading state during backup", async () => {
      let resolveExport: (value: unknown) => void;
      const exportPromise = new Promise((resolve) => {
        resolveExport = resolve;
      });

      exportConfigurationMock.mockImplementation(() => exportPromise);
      uploadBackupMock.mockResolvedValue({
        success: true,
        data: { message: "Backup uploaded successfully" },
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByRole("button", {
              name: /create manual backup to google drive/i,
            }),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const backupButton = screen.getByRole("button", {
        name: /create manual backup to google drive/i,
      });
      await act(async () => {
        fireEvent.click(backupButton);
      });

      await waitFor(
        () => {
          expect(screen.getByText(/backing up.../i)).toBeInTheDocument();
          expect(backupButton).toBeDisabled();
        },
        { timeout: 3000 },
      );

      // Resolve the export promise
      await act(async () => {
        resolveExport!({
          success: true,
          data: JSON.stringify({ version: "1.0.0", profiles: [] }),
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(
        () => {
          expect(screen.queryByText(/backing up.../i)).not.toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should update settings on successful backup", async () => {
      exportConfigurationMock.mockResolvedValue({
        success: true,
        data: JSON.stringify({ version: "1.0.0", profiles: [] }),
      });
      uploadBackupMock.mockResolvedValue({
        success: true,
        data: { message: "Backup uploaded successfully" },
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByRole("button", {
              name: /create manual backup to google drive/i,
            }),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const backupButton = screen.getByRole("button", {
        name: /create manual backup to google drive/i,
      });
      await act(async () => {
        fireEvent.click(backupButton);
      });

      await waitFor(
        () => {
          expect(updateSettingsMock).toHaveBeenCalledWith(
            expect.objectContaining({
              googleDriveBackup: expect.objectContaining({
                lastBackupTime: expect.any(String),
                lastBackupStatus: "success",
              }),
            }),
          );
        },
        { timeout: 3000 },
      );
    });

    it("should show toast on successful backup", async () => {
      exportConfigurationMock.mockResolvedValue({
        success: true,
        data: JSON.stringify({ version: "1.0.0", profiles: [] }),
      });
      uploadBackupMock.mockResolvedValue({
        success: true,
        data: { message: "Backup uploaded successfully" },
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByRole("button", {
              name: /create manual backup to google drive/i,
            }),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const backupButton = screen.getByRole("button", {
        name: /create manual backup to google drive/i,
      });
      await act(async () => {
        fireEvent.click(backupButton);
      });

      await waitFor(
        () => {
          expect(toast.success).toHaveBeenCalledWith(
            "Backup uploaded to Google Drive successfully",
          );
        },
        { timeout: 3000 },
      );
    });

    it("should handle backup errors", async () => {
      exportConfigurationMock.mockResolvedValue({
        success: false,
        error: "Export failed",
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByRole("button", {
              name: /create manual backup to google drive/i,
            }),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const backupButton = screen.getByRole("button", {
        name: /create manual backup to google drive/i,
      });
      await act(async () => {
        fireEvent.click(backupButton);
      });

      await waitFor(
        () => {
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining("Backup failed"),
          );
        },
        { timeout: 3000 },
      );
    });

    it("should not backup when not authenticated", async () => {
      getAuthStatusMock.mockResolvedValue({
        authenticated: false,
        needsRefresh: false,
        error: "Not authenticated",
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      // Should not show backup button when not authenticated
      expect(
        screen.queryByRole("button", {
          name: /create manual backup to google drive/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe("auto-backup settings", () => {
    beforeEach(() => {
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: false,
          backupFrequency: "daily",
        },
      });
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });
    });

    it("should toggle auto-backup on/off", async () => {
      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByLabelText(/automatic backups/i),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const autoBackupToggle = screen.getByLabelText(/automatic backups/i);
      await act(async () => {
        fireEvent.click(autoBackupToggle);
      });

      await waitFor(
        () => {
          expect(updateSettingsMock).toHaveBeenCalledWith(
            expect.objectContaining({
              googleDriveBackup: expect.objectContaining({
                autoBackup: true,
              }),
            }),
          );
        },
        { timeout: 3000 },
      );
    });

    it("should change backup frequency", async () => {
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: true,
          backupFrequency: "daily",
        },
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByLabelText(/backup frequency/i),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const frequencySelect = screen.getByLabelText(/backup frequency/i);
      await act(async () => {
        fireEvent.change(frequencySelect, { target: { value: "weekly" } });
      });

      await waitFor(
        () => {
          expect(updateSettingsMock).toHaveBeenCalledWith(
            expect.objectContaining({
              googleDriveBackup: expect.objectContaining({
                backupFrequency: "weekly",
              }),
            }),
          );
        },
        { timeout: 3000 },
      );
    });
  });

  describe("error handling", () => {
    it("should display error messages", async () => {
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: false,
          backupFrequency: "daily",
        },
      });
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });
      exportConfigurationMock.mockResolvedValue({
        success: false,
        error: "Export configuration failed",
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByRole("button", {
              name: /create manual backup to google drive/i,
            }),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const backupButton = screen.getByRole("button", {
        name: /create manual backup to google drive/i,
      });
      await act(async () => {
        fireEvent.click(backupButton);
      });

      await waitFor(
        () => {
          expect(screen.getByText(/error:/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should update last backup status on error", async () => {
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: false,
          backupFrequency: "daily",
        },
      });
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });
      uploadBackupMock.mockResolvedValue({
        success: false,
        error: "Upload failed",
      });
      exportConfigurationMock.mockResolvedValue({
        success: true,
        data: JSON.stringify({ version: "1.0.0", profiles: [] }),
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(
            screen.getByRole("button", {
              name: /create manual backup to google drive/i,
            }),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const backupButton = screen.getByRole("button", {
        name: /create manual backup to google drive/i,
      });
      await act(async () => {
        fireEvent.click(backupButton);
      });

      await waitFor(
        () => {
          expect(updateSettingsMock).toHaveBeenCalledWith(
            expect.objectContaining({
              googleDriveBackup: expect.objectContaining({
                lastBackupStatus: "error",
                lastBackupError: expect.any(String),
              }),
            }),
          );
        },
        { timeout: 3000 },
      );
    });
  });

  describe("status indicator", () => {
    it("should show success status with check icon", async () => {
      const lastBackupTime = new Date(Date.now() - 60000).toISOString();
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: false,
          backupFrequency: "daily",
          lastBackupTime,
          lastBackupStatus: "success",
        },
      });
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(screen.getByText(/last backup:/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should show error status with error icon", async () => {
      const lastBackupTime = new Date(Date.now() - 60000).toISOString();
      getSettingsMock.mockReturnValue({
        googleDriveBackup: {
          enabled: true,
          autoBackup: false,
          backupFrequency: "daily",
          lastBackupTime,
          lastBackupStatus: "error",
        },
      });
      getAuthStatusMock.mockResolvedValue({
        authenticated: true,
        needsRefresh: false,
      });

      await act(async () => {
        renderWithAllProviders(<GoogleDriveBackupSection />);
      });

      await waitFor(
        () => {
          expect(screen.getByText(/last backup failed:/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });
});
