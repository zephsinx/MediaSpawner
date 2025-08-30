import { describe, it, expect } from "vitest";
import { validateTrigger } from "../triggerValidation";

describe("validateTrigger", () => {
  it("accepts manual trigger", () => {
    const res = validateTrigger({ type: "manual", config: {}, enabled: true });
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it("validates time.dailyAt HH:mm and timezone", () => {
    const ok = validateTrigger({
      type: "time.dailyAt",
      enabled: true,
      config: { time: "09:30", timezone: "UTC" },
    });
    expect(ok.isValid).toBe(true);

    const bad = validateTrigger({
      type: "time.dailyAt",
      enabled: true,
      config: { time: "9:3", timezone: "" },
    });
    expect(bad.isValid).toBe(false);
    expect(bad.errors.join(" ")).toMatch(/Time must be HH:mm/);
  });

  it("flags atDateTime in the past with a warning", () => {
    const past = new Date(0).toISOString();
    const res = validateTrigger({
      type: "time.atDateTime",
      enabled: true,
      config: { isoDateTime: past, timezone: "UTC" },
    });
    expect(res.isValid).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it("requires channelPointReward identifier and statuses", () => {
    const bad = validateTrigger({
      type: "twitch.channelPointReward",
      enabled: true,
      config: { rewardIdentifier: "", statuses: [] },
    });
    expect(bad.isValid).toBe(false);
    expect(bad.errors.join(" ")).toMatch(/Reward identifier is required/);
    expect(bad.errors.join(" ")).toMatch(
      /Select at least one redemption status/
    );
  });
});
