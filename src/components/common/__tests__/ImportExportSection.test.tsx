import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { ImportExportSection } from "../ImportExportSection";
import { ImportExportService } from "../../../services/importExportService";
import { downloadConfiguration } from "../../../utils/fileDownload";
import { toast } from "sonner";
import type { ImportOptions } from "../../../services/importExportService";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../services/importExportService", () => ({
  ImportExportService: {
    exportConfiguration: vi.fn(),
    importConfiguration: vi.fn(),
  },
}));

vi.mock("../../../utils/fileDownload", () => ({
  downloadConfiguration: vi.fn(),
}));

vi.mock("../ImportOptionsModal", () => ({
  ImportOptionsModal: ({
    isOpen,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: ImportOptions) => void;
  }) => {
    if (!isOpen) return null;
    return React.createElement(
      "div",
      { "data-testid": "import-options-modal" },
      React.createElement(
        "button",
        {
          onClick: () =>
            onConfirm({
              profileConflictStrategy: "rename",
              assetConflictStrategy: "rename",
              updateWorkingDirectory: true,
              validateAssetReferences: true,
            }),
        },
        "Confirm Import"
      ),
      React.createElement("button", { onClick: onClose }, "Cancel")
    );
  },
}));

describe("ImportExportSection", () => {
  let OriginalFileReader: typeof FileReader;
  let exportConfigurationMock: Mock;
  let importConfigurationMock: Mock;

  beforeEach(() => {
    vi.resetAllMocks();
    exportConfigurationMock =
      ImportExportService.exportConfiguration as unknown as Mock;
    importConfigurationMock =
      ImportExportService.importConfiguration as unknown as Mock;

    OriginalFileReader = global.FileReader;
    class MockFileReader {
      public onload: ((ev: { target: { result: string } }) => void) | null =
        null;
      public onerror: ((ev: unknown) => void) | null = null;
      readAsText(file: File) {
        void file;
        setTimeout(() => {
          this.onload?.({
            target: {
              result: JSON.stringify({
                version: "1.0.0",
                profiles: [],
                assets: [],
              }),
            },
          });
        }, 0);
      }
    }
    global.FileReader = MockFileReader as unknown as typeof FileReader;
  });

  it("renders header and action buttons", () => {
    render(<ImportExportSection />);

    expect(screen.getByText("Import/Export Configuration")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export configuration/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /import configuration/i })
    ).toBeInTheDocument();
  });

  it("disables buttons during export and shows loading state", async () => {
    exportConfigurationMock.mockImplementation(
      async () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: false, error: "No data" }), 50)
        )
    );

    render(<ImportExportSection />);
    const exportBtn = screen.getByRole("button", {
      name: /export configuration/i,
    });
    const importBtn = screen.getByRole("button", {
      name: /import configuration/i,
    });

    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText("Exporting...")).toBeInTheDocument();
      expect(exportBtn).toBeDisabled();
      expect(importBtn).toBeDisabled();
    });
  });

  it("exports configuration on success and downloads file", async () => {
    exportConfigurationMock.mockResolvedValue({
      success: true,
      data: JSON.stringify({ version: "1.0.0", profiles: [], assets: [] }),
      metadata: {
        profileCount: 1,
        assetCount: 2,
        spawnCount: 3,
        exportedAt: "",
        version: "1.0.0",
      },
    });

    render(<ImportExportSection />);
    fireEvent.click(
      screen.getByRole("button", { name: /export configuration/i })
    );

    await waitFor(() => {
      expect(downloadConfiguration).toHaveBeenCalledWith(
        { version: "1.0.0", profiles: [], assets: [] },
        "mediaspawner-config"
      );
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("shows error toast when export fails", async () => {
    exportConfigurationMock.mockResolvedValue({
      success: false,
      error: "No data available",
    });

    render(<ImportExportSection />);
    fireEvent.click(
      screen.getByRole("button", { name: /export configuration/i })
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("opens modal on valid JSON selection and imports with options", async () => {
    importConfigurationMock.mockResolvedValue({
      success: true,
      metadata: { profileCount: 0, assetCount: 0 },
    });

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<ImportExportSection />);

    const file = new File(["{}"], "config.json", { type: "application/json" });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(
      await screen.findByTestId("import-options-modal")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm Import"));

    await waitFor(() => {
      expect(ImportExportService.importConfiguration).toHaveBeenCalledWith(
        expect.any(String),
        {
          profileConflictStrategy: "rename",
          assetConflictStrategy: "rename",
          updateWorkingDirectory: true,
          validateAssetReferences: true,
        }
      );
      expect(toast.success).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "mediaspawner:configuration-imported" })
      );
    });

    dispatchSpy.mockRestore();
  });

  it("rejects non-JSON files and shows error", () => {
    render(<ImportExportSection />);
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const badFile = new File(["dummy"], "image.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [badFile] } });

    expect(screen.getByText(/import error:/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
  });

  it("shows error when import fails", async () => {
    importConfigurationMock.mockResolvedValue({
      success: false,
      error: "Invalid configuration",
    });

    render(<ImportExportSection />);
    const file = new File(["{}"], "config.json", { type: "application/json" });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(
      await screen.findByTestId("import-options-modal")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm Import"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      expect(screen.getByText(/import error:/i)).toBeInTheDocument();
    });
  });

  afterEach(() => {
    if (OriginalFileReader) {
      global.FileReader = OriginalFileReader;
    }
  });
});
