import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AssetCard } from "../AssetCard";
import type { MediaAsset } from "../../../types/media";

vi.mock("../../../services/assetService", () => ({
  AssetService: {
    updateAsset: vi.fn(),
  },
}));

const { AssetService } = await import("../../../services/assetService");

describe("AssetCard inline rename", () => {
  const asset: MediaAsset = {
    id: "a1",
    name: "Old Name",
    type: "image",
    path: "https://example.com/img.png",
    isUrl: true,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not call update while typing, only on commit (Enter)", async () => {
    vi.mocked(AssetService.updateAsset).mockReturnValue(true);
    render(<AssetCard asset={asset} variant="list" />);

    const renameBtn = screen.getByRole("button", { name: /rename asset/i });
    await act(async () => {
      fireEvent.click(renameBtn);
    });

    const input = screen.getByRole("textbox", { name: /asset name/i });
    await act(async () => {
      fireEvent.change(input, { target: { value: "New Name" } });
    });
    expect(AssetService.updateAsset).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    expect(AssetService.updateAsset).toHaveBeenCalledTimes(1);
    expect(AssetService.updateAsset).toHaveBeenCalledWith({
      ...asset,
      name: "New Name",
    });
  });

  it("cancels on Escape without updating", async () => {
    vi.mocked(AssetService.updateAsset).mockReturnValue(true);
    render(<AssetCard asset={asset} variant="list" />);

    const renameBtn = screen.getByRole("button", { name: /rename asset/i });
    await act(async () => {
      fireEvent.click(renameBtn);
    });

    const input = screen.getByRole("textbox", { name: /asset name/i });
    await act(async () => {
      fireEvent.change(input, { target: { value: "Another Name" } });
      fireEvent.keyDown(input, { key: "Escape" });
    });

    expect(AssetService.updateAsset).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox", { name: /asset name/i })).toBeNull();
  });

  it("validates empty name and shows error without calling update", async () => {
    vi.mocked(AssetService.updateAsset).mockReturnValue(true);
    render(<AssetCard asset={asset} variant="list" />);

    const renameBtn = screen.getByRole("button", { name: /rename asset/i });
    await act(async () => {
      fireEvent.click(renameBtn);
    });

    const input = screen.getByRole("textbox", { name: /asset name/i });
    await act(async () => {
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(AssetService.updateAsset).not.toHaveBeenCalled();
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });
});
