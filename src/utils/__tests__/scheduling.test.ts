import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getNextActivation } from "../scheduling";

describe("scheduling getNextActivation - weekly/monthly and enabled flag", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes next activation for weeklyAt later same day", () => {
    // Monday 2025-01-06 10:00:00 UTC
    vi.setSystemTime(new Date("2025-01-06T10:00:00.000Z"));
    const trigger = {
      type: "time.weeklyAt" as const,
      enabled: true,
      config: { dayOfWeek: 1, time: "12:00", timezone: "UTC" },
    };
    const next = getNextActivation(trigger);
    expect(next.timezone).toBe("UTC");
    expect(next.when).not.toBeNull();
    expect(next!.when!.toISOString()).toBe("2025-01-06T12:00:00.000Z");
  });

  it("rolls weeklyAt to next week if time passed", () => {
    // Monday 2025-01-06 13:00:00 UTC
    vi.setSystemTime(new Date("2025-01-06T13:00:00.000Z"));
    const trigger = {
      type: "time.weeklyAt" as const,
      enabled: true,
      config: { dayOfWeek: 1, time: "12:00", timezone: "UTC" },
    };
    const next = getNextActivation(trigger);
    expect(next!.when!.toISOString()).toBe("2025-01-13T12:00:00.000Z");
  });

  it("computes next activation for monthlyOn, rolling to a month that has the day", () => {
    // 2025-02-15 08:00:00 UTC (February has no 31st)
    vi.setSystemTime(new Date("2025-02-15T08:00:00.000Z"));
    const trigger = {
      type: "time.monthlyOn" as const,
      enabled: true,
      config: { dayOfMonth: 31, time: "09:00", timezone: "UTC" },
    };
    const next = getNextActivation(trigger);
    expect(next.timezone).toBe("UTC");
    expect(next!.when!.toISOString()).toBe("2025-03-31T09:00:00.000Z");
  });

  it("returns null when trigger is disabled", () => {
    vi.setSystemTime(new Date("2025-01-06T10:00:00.000Z"));
    const trigger = {
      type: "time.dailyAt" as const,
      enabled: false,
      config: { time: "12:00", timezone: "UTC" },
    };
    const next = getNextActivation(trigger);
    expect(next.when).toBeNull();
    expect(next.timezone).toBe("UTC");
  });
});
