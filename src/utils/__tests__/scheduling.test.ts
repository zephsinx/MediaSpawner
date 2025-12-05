import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getNextActivation } from "../scheduling";
import type { Trigger } from "../../types/spawn";

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
      config: { daysOfWeek: [1], time: "12:00", timezone: "UTC" },
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
      config: { daysOfWeek: [1], time: "12:00", timezone: "UTC" },
    };
    const next = getNextActivation(trigger);
    expect(next!.when!.toISOString()).toBe("2025-01-13T12:00:00.000Z");
  });

  it("computes next activation for weeklyAt with multiple days", () => {
    // Monday 2025-01-06 10:00:00 UTC (Monday = 1)
    vi.setSystemTime(new Date("2025-01-06T10:00:00.000Z"));
    const trigger = {
      type: "time.weeklyAt" as const,
      enabled: true,
      config: { daysOfWeek: [1, 3, 5], time: "12:00", timezone: "UTC" }, // Mon, Wed, Fri
    };
    const next = getNextActivation(trigger);
    expect(next.timezone).toBe("UTC");
    expect(next.when).not.toBeNull();
    // Should be Monday (same day) at 12:00
    expect(next!.when!.toISOString()).toBe("2025-01-06T12:00:00.000Z");
  });

  it("rolls weeklyAt to next matching day when time passed", () => {
    // Monday 2025-01-06 13:00:00 UTC (Monday = 1, but time passed)
    vi.setSystemTime(new Date("2025-01-06T13:00:00.000Z"));
    const trigger = {
      type: "time.weeklyAt" as const,
      enabled: true,
      config: { daysOfWeek: [1, 3, 5], time: "12:00", timezone: "UTC" }, // Mon, Wed, Fri
    };
    const next = getNextActivation(trigger);
    expect(next.timezone).toBe("UTC");
    expect(next.when).not.toBeNull();
    // Should be Wednesday (next matching day) at 12:00
    expect(next!.when!.toISOString()).toBe("2025-01-08T12:00:00.000Z");
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

  it("handles old dayOfWeek format by migrating to daysOfWeek array", () => {
    // Monday 2025-01-06 10:00:00 UTC
    vi.setSystemTime(new Date("2025-01-06T10:00:00.000Z"));
    // Old format with dayOfWeek (singular) instead of daysOfWeek (array)
    // Cast through unknown to simulate legacy data
    const trigger = {
      type: "time.weeklyAt",
      enabled: true,
      config: { dayOfWeek: 1, time: "12:00", timezone: "UTC" },
    } as unknown as Trigger;
    const next = getNextActivation(trigger);
    expect(next.timezone).toBe("UTC");
    expect(next.when).not.toBeNull();
    expect(next!.when!.toISOString()).toBe("2025-01-06T12:00:00.000Z");
  });
});
