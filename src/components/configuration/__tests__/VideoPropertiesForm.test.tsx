import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VideoPropertiesForm } from "../VideoPropertiesForm";
import type { MediaAsset } from "../../../types/media";

const makeVideoAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
  id: overrides.id || "vid-1",
  type: "video",
  name: overrides.name || "Video One",
  path: overrides.path || "https://example.com/video.mp4",
  isUrl: overrides.isUrl ?? true,
  properties: {
    dimensions: { width: 100, height: 100 },
    position: { x: 0, y: 0 },
    volume: 0.5,
    loop: false,
    autoplay: false,
    muted: false,
    ...(overrides.properties || {}),
  },
});

describe("VideoPropertiesForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dimensions, position, volume, playback options, and reset", () => {
    const asset = makeVideoAsset();
    const onChange = vi.fn();
    render(<VideoPropertiesForm asset={asset} onChange={onChange} />);

    // Headings and sections
    expect(screen.getByText("Video Properties")).toBeInTheDocument();
    expect(screen.getByText("Playback options")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();

    // Volume label reflects 50% (prefer more specific label text query to avoid footer text)
    const volLabels = screen.getAllByText(/Volume:\s*50%/);
    expect(volLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("updates numeric fields (dimensions and position) and calls onChange", async () => {
    const asset = makeVideoAsset();
    const onChange = vi.fn();
    render(<VideoPropertiesForm asset={asset} onChange={onChange} />);

    const width = screen.getByLabelText("Width (px)") as HTMLInputElement;
    const height = screen.getByLabelText("Height (px)") as HTMLInputElement;
    const x = screen.getByLabelText("X Position (px)") as HTMLInputElement;
    const y = screen.getByLabelText("Y Position (px)") as HTMLInputElement;

    await act(async () => {
      fireEvent.change(width, { target: { value: "320" } });
      fireEvent.change(height, { target: { value: "240" } });
      fireEvent.change(x, { target: { value: "10" } });
      fireEvent.change(y, { target: { value: "20" } });
    });

    const last = onChange.mock.calls.at(-1)![0] as MediaAsset;
    expect(last.properties.dimensions?.width).toBe(320);
    expect(last.properties.dimensions?.height).toBe(240);
    expect(last.properties.position?.x).toBe(10);
    expect(last.properties.position?.y).toBe(20);
  });

  it("updates volume and toggles (loop, autoplay, muted)", async () => {
    const asset = makeVideoAsset();
    const onChange = vi.fn();
    render(<VideoPropertiesForm asset={asset} onChange={onChange} />);

    const slider = screen.getByLabelText(/Volume:/i) as HTMLInputElement;
    const loop = screen.getByLabelText("Loop") as HTMLInputElement;
    const autoplay = screen.getByLabelText("Autoplay") as HTMLInputElement;
    const muted = screen.getByLabelText("Muted") as HTMLInputElement;

    await act(async () => {
      fireEvent.change(slider, { target: { value: "25" } });
      fireEvent.click(loop);
      fireEvent.click(autoplay);
      fireEvent.click(muted);
    });

    const last = onChange.mock.calls.at(-1)![0] as MediaAsset;
    expect(last.properties.volume).toBeCloseTo(0.25, 5);
    expect(last.properties.loop).toBe(true);
    expect(last.properties.autoplay).toBe(true);
    expect(last.properties.muted).toBe(true);
  });

  it("reset restores defaults for all fields", async () => {
    const asset = makeVideoAsset({
      properties: {
        dimensions: { width: 640, height: 480 },
        position: { x: 5, y: 6 },
        volume: 0.9,
        loop: true,
        autoplay: true,
        muted: true,
      },
    });
    const onChange = vi.fn();
    render(<VideoPropertiesForm asset={asset} onChange={onChange} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    });

    // Defaults: width/height 100, x/y 0, volume 50%, toggles false
    expect(
      (screen.getByLabelText("Width (px)") as HTMLInputElement).value
    ).toBe("100");
    expect(
      (screen.getByLabelText("Height (px)") as HTMLInputElement).value
    ).toBe("100");
    expect(
      (screen.getByLabelText("X Position (px)") as HTMLInputElement).value
    ).toBe("0");
    expect(
      (screen.getByLabelText("Y Position (px)") as HTMLInputElement).value
    ).toBe("0");
    expect(screen.getAllByText(/Volume:\s*50%/).length).toBeGreaterThanOrEqual(
      1
    );

    const last = onChange.mock.calls.at(-1)![0] as MediaAsset;
    expect(last.properties.dimensions?.width).toBe(100);
    expect(last.properties.dimensions?.height).toBe(100);
    expect(last.properties.position?.x).toBe(0);
    expect(last.properties.position?.y).toBe(0);
    expect(last.properties.volume).toBeCloseTo(0.5, 5);
    expect(last.properties.loop).toBe(false);
    expect(last.properties.autoplay).toBe(false);
    expect(last.properties.muted).toBe(false);
  });

  it("syncs when asset changes (id change)", async () => {
    const onChange = vi.fn();
    const a1 = makeVideoAsset({ id: "v1" });
    const a2 = makeVideoAsset({
      id: "v2",
      properties: {
        dimensions: { width: 200, height: 150 },
        position: { x: 7, y: 9 },
        volume: 0.2,
        loop: true,
        autoplay: true,
        muted: true,
      },
    });
    const view = render(<VideoPropertiesForm asset={a1} onChange={onChange} />);

    await act(async () => {
      view.rerender(<VideoPropertiesForm asset={a2} onChange={onChange} />);
    });

    expect(
      (screen.getByLabelText("Width (px)") as HTMLInputElement).value
    ).toBe("200");
    expect(
      (screen.getByLabelText("Height (px)") as HTMLInputElement).value
    ).toBe("150");
    expect(
      (screen.getByLabelText("X Position (px)") as HTMLInputElement).value
    ).toBe("7");
    expect(
      (screen.getByLabelText("Y Position (px)") as HTMLInputElement).value
    ).toBe("9");
    expect(screen.getAllByText(/Volume:\s*20%/).length).toBeGreaterThanOrEqual(
      1
    );
    expect((screen.getByLabelText("Loop") as HTMLInputElement).checked).toBe(
      true
    );
    expect(
      (screen.getByLabelText("Autoplay") as HTMLInputElement).checked
    ).toBe(true);
    expect((screen.getByLabelText("Muted") as HTMLInputElement).checked).toBe(
      true
    );
  });
});
