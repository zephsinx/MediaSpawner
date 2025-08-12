import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AudioPropertiesForm } from "../AudioPropertiesForm";
import type { MediaAsset } from "../../../types/media";

const makeAudioAsset = (overrides: Partial<MediaAsset> = {}): MediaAsset => ({
  id: overrides.id || "aud-1",
  type: "audio",
  name: overrides.name || "Audio One",
  path: overrides.path || "https://example.com/audio.mp3",
  isUrl: overrides.isUrl ?? true,
  properties: {
    volume: 0.5,
    loop: false,
    autoplay: false,
    muted: false,
    ...(overrides.properties || {}),
  },
});

describe("AudioPropertiesForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders volume, playback options, and reset controls", () => {
    const asset = makeAudioAsset();
    const onChange = vi.fn();
    render(<AudioPropertiesForm asset={asset} onChange={onChange} />);

    expect(screen.getByText("Audio Properties")).toBeInTheDocument();
    // Volume label reflects percentage (avoid ambiguity by allowing multiple matches)
    expect(screen.getAllByText(/Volume:\s*50%/).length).toBeGreaterThan(0);
    // Playback options legend
    expect(screen.getByText("Playback options")).toBeInTheDocument();
    // Reset button
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("updates volume from slider and number input and calls onChange with normalized volume", async () => {
    const asset = makeAudioAsset();
    const onChange = vi.fn();
    render(<AudioPropertiesForm asset={asset} onChange={onChange} />);

    const slider = screen.getByLabelText(/Volume:/i) as HTMLInputElement;
    const number = screen.getByRole("spinbutton") as HTMLInputElement;

    await act(async () => {
      fireEvent.change(slider, { target: { value: "80" } });
    });
    expect(onChange).toHaveBeenCalled();
    const last1 = onChange.mock.calls.at(-1)![0] as MediaAsset;
    expect(last1.properties.volume).toBeCloseTo(0.8, 5);
    // number input should reflect 80
    expect(number.value).toBe("80");

    await act(async () => {
      fireEvent.change(number, { target: { value: "65" } });
    });
    const last2 = onChange.mock.calls.at(-1)![0] as MediaAsset;
    expect(last2.properties.volume).toBeCloseTo(0.65, 5);
  });

  it("toggles loop, autoplay, and muted and calls onChange with updated booleans", async () => {
    const asset = makeAudioAsset({
      properties: { loop: false, autoplay: false, muted: false },
    });
    const onChange = vi.fn();
    render(<AudioPropertiesForm asset={asset} onChange={onChange} />);

    const loop = screen.getByLabelText("Loop") as HTMLInputElement;
    const autoplay = screen.getByLabelText("Autoplay") as HTMLInputElement;
    const muted = screen.getByLabelText("Muted") as HTMLInputElement;

    await act(async () => {
      fireEvent.click(loop);
      fireEvent.click(autoplay);
      fireEvent.click(muted);
    });

    const last = onChange.mock.calls.at(-1)![0] as MediaAsset;
    expect(last.properties.loop).toBe(true);
    expect(last.properties.autoplay).toBe(true);
    expect(last.properties.muted).toBe(true);
  });

  it("reset restores defaults and calls onChange", async () => {
    const asset = makeAudioAsset({
      properties: { volume: 0.7, loop: true, autoplay: true, muted: true },
    });
    const onChange = vi.fn();
    render(<AudioPropertiesForm asset={asset} onChange={onChange} />);

    const reset = screen.getByRole("button", { name: "Reset" });
    await act(async () => {
      fireEvent.click(reset);
    });

    expect(screen.getAllByText(/Volume:\s*50%/).length).toBeGreaterThan(0);

    const last = onChange.mock.calls.at(-1)![0] as MediaAsset;
    expect(last.properties.volume).toBeCloseTo(0.5, 5);
    expect(last.properties.loop).toBe(false);
    expect(last.properties.autoplay).toBe(false);
    expect(last.properties.muted).toBe(false);
  });

  it("syncs local state when incoming asset changes", async () => {
    const onChange = vi.fn();
    const a1 = makeAudioAsset({
      id: "aud-1",
      properties: { volume: 0.5, loop: false, autoplay: false, muted: false },
    });
    const a2 = makeAudioAsset({
      id: "aud-2",
      properties: { volume: 0.2, loop: true, autoplay: true, muted: true },
    });
    const view = render(<AudioPropertiesForm asset={a1} onChange={onChange} />);

    // Rerender with new asset id and properties
    await act(async () => {
      view.rerender(<AudioPropertiesForm asset={a2} onChange={onChange} />);
    });

    // Volume label reflects 20%
    expect(screen.getAllByText(/Volume:\s*20%/).length).toBeGreaterThanOrEqual(
      1
    );
    // Toggles reflect true
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
