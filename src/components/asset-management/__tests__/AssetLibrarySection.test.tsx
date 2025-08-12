import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { LayoutProvider } from "../../layout";
import AssetManagementPanel from "../AssetManagementPanel";

// Mock AssetService
vi.mock("../../../services/assetService", () => ({
  AssetService: {
    getAssets: vi.fn(),
    addAsset: vi.fn(),
  },
}));

import { AssetService } from "../../../services/assetService";

import type { MediaAsset } from "../../../types/media";

const makeAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
  id: overrides.id || Math.random().toString(36).slice(2),
  type: overrides.type || "image",
  name: overrides.name || "Sample",
  path: overrides.path || "https://example.com/sample.png",
  isUrl: overrides.isUrl ?? true,
  properties: overrides.properties || {},
});

describe("AssetLibrarySection (MS-34)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header count and empty state", () => {
    vi.mocked(AssetService.getAssets).mockReturnValue([]);
    render(
      <LayoutProvider>
        <AssetManagementPanel />
      </LayoutProvider>
    );
    expect(screen.getByText("Asset Library")).toBeInTheDocument();
    expect(screen.getByText("(0)")).toBeInTheDocument();
    expect(screen.getByText("No assets in library")).toBeInTheDocument();
  });

  it("renders assets with name, type badge, and source indicator", () => {
    vi.mocked(AssetService.getAssets).mockReturnValue([
      makeAsset({ id: "a1", type: "image", name: "Img" }),
      makeAsset({ id: "a2", type: "video", name: "Vid", isUrl: false }),
      makeAsset({ id: "a3", type: "audio", name: "Aud" }),
    ]);

    render(
      <LayoutProvider>
        <AssetManagementPanel />
      </LayoutProvider>
    );

    // Count
    expect(screen.getByText("(3)")).toBeInTheDocument();

    // Names
    expect(screen.getByText("Img")).toBeInTheDocument();
    expect(screen.getByText("Vid")).toBeInTheDocument();
    expect(screen.getByText("Aud")).toBeInTheDocument();

    // Type badges
    expect(screen.getByText("image")).toBeInTheDocument();
    expect(screen.getByText("video")).toBeInTheDocument();
    expect(screen.getByText("audio")).toBeInTheDocument();

    // Source indicators
    expect(screen.getAllByText("🌐").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("📁").length).toBeGreaterThanOrEqual(1);
  });

  it("adds a URL asset with format validation and updates count", async () => {
    // In-memory library to simulate AssetService behavior
    const library: MediaAsset[] = [];
    vi.mocked(AssetService.getAssets).mockImplementation(() => library);
    vi.mocked(AssetService.addAsset).mockImplementation(
      (type: MediaAsset["type"], name: string, path: string) => {
        const created = makeAsset({ id: "n1", type, name, path, isUrl: true });
        library.push(created);
        return created;
      }
    );

    render(
      <LayoutProvider>
        <AssetManagementPanel />
      </LayoutProvider>
    );

    // Open add URL
    await act(async () => {
      screen.getByRole("button", { name: "Add URL Asset" }).click();
    });

    // Invalid format
    const input = screen.getByLabelText("Asset URL") as HTMLInputElement;
    input.focus();
    await act(async () => {
      fireEvent.change(input, { target: { value: "notaurl" } });
    });
    await act(async () => {
      screen.getByText("Add").click();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid URL format");

    // Valid add
    await act(async () => {
      fireEvent.change(input, {
        target: { value: "https://example.com/file.png" },
      });
      screen.getByText("Add").click();
    });

    expect(AssetService.addAsset).toHaveBeenCalled();
    // Count updates to (1)
    await waitFor(() => {
      const headerAfter = screen.getByLabelText("Asset Library")
        .previousElementSibling as HTMLElement | null;
      expect(headerAfter?.textContent || "").toMatch(/\(1\)|\(\s*1\s*\)/);
    });
  });

  it("refreshes when mediaspawner:assets-updated is dispatched", async () => {
    vi.mocked(AssetService.getAssets)
      .mockReturnValueOnce([])
      .mockReturnValueOnce([makeAsset({ id: "x1" })]);

    const { container } = render(
      <LayoutProvider>
        <AssetManagementPanel />
      </LayoutProvider>
    );
    expect(screen.getByText("(0)")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new Event(
          "mediaspawner:assets-updated" as unknown as keyof WindowEventMap
        )
      );
    });

    // The count is rendered as two separate text nodes inside parentheses; match flexibly
    const header = container.querySelector(
      "[aria-label='Asset Library']"
    )?.previousElementSibling;
    expect(header?.textContent).toContain("(1)");
  });
});
