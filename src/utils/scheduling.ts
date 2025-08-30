import moment from "moment-timezone";
import type { Trigger } from "../types/spawn";

const getTimezoneIfTimeBased = (trigger: Trigger): string | undefined => {
  switch (trigger.type) {
    case "time.atDateTime":
      return trigger.config.timezone;
    case "time.dailyAt":
      return trigger.config.timezone;
    case "time.weeklyAt":
      return trigger.config.timezone;
    case "time.monthlyOn":
      return trigger.config.timezone;
    case "time.everyNMinutes":
      return trigger.config.timezone;
    case "time.minuteOfHour":
      return trigger.config.timezone;
    default:
      return undefined;
  }
};

export const getNextActivation = (
  trigger: Trigger | null
): { when: Date | null; timezone?: string } => {
  if (!trigger) return { when: null };
  if (trigger.enabled === false) {
    // Respect per-trigger enabled flag; when disabled, there is no next activation
    const tz = getTimezoneIfTimeBased(trigger);
    return { when: null, timezone: tz };
  }
  if (trigger.type === "time.atDateTime") {
    const tz = trigger.config.timezone;
    const target = moment.tz(trigger.config.isoDateTime, tz);
    const now = moment.tz(tz);
    if (target.isAfter(now)) return { when: target.toDate(), timezone: tz };
    return { when: null, timezone: tz };
  }
  if (trigger.type === "time.dailyAt") {
    const tz = trigger.config.timezone;
    const [hh, mm] = (trigger.config.time || "00:00")
      .split(":")
      .map((v) => parseInt(v, 10));
    const now = moment.tz(tz);
    let next = now
      .clone()
      .hour(hh || 0)
      .minute(mm || 0)
      .second(0)
      .millisecond(0);
    if (!next.isAfter(now)) next = next.add(1, "day");
    return { when: next.toDate(), timezone: tz };
  }
  if (trigger.type === "time.weeklyAt") {
    const tz = trigger.config.timezone;
    const [hh, mm] = (trigger.config.time || "00:00")
      .split(":")
      .map((v) => parseInt(v, 10));
    const dayOfWeek = Math.max(0, Math.min(6, trigger.config.dayOfWeek));
    const now = moment.tz(tz);
    let next = now
      .clone()
      .day(dayOfWeek)
      .hour(hh || 0)
      .minute(mm || 0)
      .second(0)
      .millisecond(0);
    if (!next.isAfter(now)) next = next.add(7, "day");
    return { when: next.toDate(), timezone: tz };
  }
  if (trigger.type === "time.monthlyOn") {
    const tz = trigger.config.timezone;
    const [hh, mm] = (trigger.config.time || "00:00")
      .split(":")
      .map((v) => parseInt(v, 10));
    const targetDay = Math.max(1, Math.min(31, trigger.config.dayOfMonth));
    const now = moment.tz(tz);
    const y = now.year();
    const m = now.month(); // 0-based
    const buildCandidate = (year: number, monthZeroBased: number) => {
      const candidate = moment.tz(
        {
          year,
          month: monthZeroBased,
          day: targetDay,
          hour: hh || 0,
          minute: mm || 0,
          second: 0,
          millisecond: 0,
        },
        tz
      );
      // Valid only if month did not roll over
      if (candidate.month() !== monthZeroBased) return null;
      return candidate;
    };
    let candidate = buildCandidate(y, m);
    if (!candidate || !candidate.isAfter(now)) {
      // Find next month where target day exists and is after now
      for (let i = 1; i <= 24; i++) {
        const nextMonth = now.clone().add(i, "month");
        const cy = nextMonth.year();
        const cm = nextMonth.month();
        const c = buildCandidate(cy, cm);
        if (c && c.isAfter(now)) {
          candidate = c;
          break;
        }
      }
    }
    return { when: candidate ? candidate.toDate() : null, timezone: tz };
  }
  if (trigger.type === "time.everyNMinutes") {
    const { intervalMinutes, timezone } = trigger.config;
    const tz = timezone;
    const now = moment.tz(tz);
    const anchor = trigger.config.anchor;
    let start: moment.Moment;
    if (anchor && anchor.kind === "custom") {
      start = moment.tz(anchor.isoDateTime, anchor.timezone);
    } else {
      start = now.clone().startOf("hour");
    }
    if (now.isBefore(start)) {
      return { when: start.toDate(), timezone: tz };
    }
    const diffMin = now.diff(start, "minutes");
    const steps = Math.max(
      1,
      Math.ceil(diffMin / Math.max(1, intervalMinutes))
    );
    const next = start
      .clone()
      .add(steps * Math.max(1, intervalMinutes), "minutes");
    return { when: next.toDate(), timezone: tz };
  }
  if (trigger.type === "time.minuteOfHour") {
    const tz = trigger.config.timezone;
    const minute = Math.max(0, Math.min(59, trigger.config.minute));
    const now = moment.tz(tz);
    let next = now.clone().minute(minute).second(0).millisecond(0);
    if (!next.isAfter(now)) next = next.add(1, "hour");
    return { when: next.toDate(), timezone: tz };
  }
  return { when: null };
};

export const formatNextActivation = (
  when: Date | null,
  timezone?: string
): string => {
  if (!when) return "-";
  try {
    if (timezone) {
      return moment(when).tz(timezone).format("YYYY-MM-DD HH:mm z");
    }
    return moment(when).format("YYYY-MM-DD HH:mm");
  } catch {
    return when.toString();
  }
};
