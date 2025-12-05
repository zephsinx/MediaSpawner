import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Spawn, Trigger } from "../../types/spawn";
import {
  getTriggerTypeLabel,
  getTriggerAbbrev,
  getTriggerTooltip,
  getTriggerScheduleLabel,
  getOverallStatusLabel,
} from "../triggerDisplay";

describe("triggerDisplay helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2025-01-01T00:00:00Z as baseline
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const makeSpawn = (trigger: Trigger, enabled = true): Spawn => ({
    id: "s1",
    name: "S",
    description: "",
    enabled,
    trigger,
    duration: 1000,
    assets: [],
    lastModified: Date.now(),
    order: 0,
  });

  it("labels types correctly", () => {
    expect(
      getTriggerTypeLabel({ type: "manual", enabled: true, config: {} }),
    ).toBe("Manual");
    expect(
      getTriggerTypeLabel({
        type: "streamerbot.command",
        enabled: true,
        config: {},
      }),
    ).toBe("Cmd");
    expect(
      getTriggerTypeLabel({
        type: "time.dailyAt",
        enabled: true,
        config: { time: "09:00", timezone: "UTC" },
      }),
    ).toBe("Daily");
  });

  it("builds abbrev strings", () => {
    expect(
      getTriggerAbbrev({ type: "manual", enabled: true, config: {} }),
    ).toBe("Manual");
    expect(
      getTriggerAbbrev({
        type: "streamerbot.command",
        enabled: true,
        config: { aliases: ["go"] },
      }),
    ).toBe("Cmd: go");
    expect(
      getTriggerAbbrev({
        type: "time.minuteOfHour",
        enabled: true,
        config: { minute: 5, timezone: "UTC" },
      }),
    ).toBe("At :05 each hour");
  });

  it("builds tooltip from type and abbrev", () => {
    const t = { type: "twitch.follow", enabled: true, config: {} } as const;
    expect(getTriggerTooltip(t)).toBe("Follow — Follow");
  });

  it("returns schedule label for time-based triggers", () => {
    const t = {
      type: "time.dailyAt",
      enabled: true,
      config: { time: "09:00", timezone: "UTC" },
    } as const;
    const label = getTriggerScheduleLabel(t);
    expect(label?.startsWith("Scheduled ")).toBe(true);
  });

  it("overall status reflects spawn and trigger enabled flags", () => {
    const trig = { type: "manual", enabled: true, config: {} } as const;
    expect(getOverallStatusLabel(makeSpawn(trig, true))).toBe("Active");
    expect(getOverallStatusLabel(makeSpawn(trig, false))).toBe("Inactive");
    const trigOff = { type: "manual", enabled: false, config: {} } as const;
    expect(getOverallStatusLabel(makeSpawn(trigOff, true))).toBe("Trigger off");
  });

  it("handles old dayOfWeek format in weeklyAt trigger", () => {
    // Old format with dayOfWeek (singular) instead of daysOfWeek (array)
    const trigger = {
      type: "time.weeklyAt" as const,
      enabled: true,
      config: { dayOfWeek: 1, time: "09:00", timezone: "UTC" } as {
        dayOfWeek: number;
        time: string;
        timezone: string;
      },
    };
    // getTriggerScheduleLabel returns a date-based label, not the trigger abbrev
    // So we test getTriggerAbbrev instead which uses the display logic
    const abbrev = getTriggerAbbrev(trigger);
    expect(abbrev).toContain("Weekly");
    expect(abbrev).toContain("Mon");
    expect(abbrev).toContain("09:00");
    expect(abbrev).toContain("UTC");
  });
});
