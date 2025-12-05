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
      /Select at least one redemption status/,
    );
  });

  describe("time.weeklyAt validation", () => {
    it("accepts valid weeklyAt with single day", () => {
      const res = validateTrigger({
        type: "time.weeklyAt",
        enabled: true,
        config: { daysOfWeek: [1], time: "09:00", timezone: "UTC" },
      });
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it("accepts valid weeklyAt with multiple days", () => {
      const res = validateTrigger({
        type: "time.weeklyAt",
        enabled: true,
        config: { daysOfWeek: [1, 3, 5], time: "09:00", timezone: "UTC" },
      });
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it("rejects empty daysOfWeek array", () => {
      const res = validateTrigger({
        type: "time.weeklyAt",
        enabled: true,
        config: { daysOfWeek: [], time: "09:00", timezone: "UTC" },
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.join(" ")).toMatch(
        /At least one day of week must be selected/,
      );
    });

    it("rejects invalid day numbers (< 0)", () => {
      const res = validateTrigger({
        type: "time.weeklyAt",
        enabled: true,
        config: { daysOfWeek: [-1, 1], time: "09:00", timezone: "UTC" },
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.join(" ")).toMatch(
        /Days of week must be integers from 0 \(Sun\) to 6 \(Sat\)/,
      );
    });

    it("rejects invalid day numbers (> 6)", () => {
      const res = validateTrigger({
        type: "time.weeklyAt",
        enabled: true,
        config: { daysOfWeek: [1, 7], time: "09:00", timezone: "UTC" },
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.join(" ")).toMatch(
        /Days of week must be integers from 0 \(Sun\) to 6 \(Sat\)/,
      );
    });

    it("rejects duplicate days", () => {
      const res = validateTrigger({
        type: "time.weeklyAt",
        enabled: true,
        config: { daysOfWeek: [1, 1, 3], time: "09:00", timezone: "UTC" },
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.join(" ")).toMatch(
        /Days of week must not contain duplicates/,
      );
    });

    it("validates time format", () => {
      const bad = validateTrigger({
        type: "time.weeklyAt",
        enabled: true,
        config: { daysOfWeek: [1], time: "9:3", timezone: "UTC" },
      });
      expect(bad.isValid).toBe(false);
      expect(bad.errors.join(" ")).toMatch(/Time must be HH:mm/);
    });

    it("validates timezone", () => {
      const bad = validateTrigger({
        type: "time.weeklyAt",
        enabled: true,
        config: { daysOfWeek: [1], time: "09:00", timezone: "" },
      });
      expect(bad.isValid).toBe(false);
      expect(bad.errors.join(" ")).toMatch(/Select a valid timezone/);
    });
  });
});
