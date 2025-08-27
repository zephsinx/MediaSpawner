import moment from "moment-timezone";
import type { Trigger } from "../types/spawn";

export const getNextActivation = (
  trigger: Trigger | null
): { when: Date | null; timezone?: string } => {
  if (!trigger) return { when: null };
  const t = trigger.type;
  if (t === "time.atDateTime") {
    const tz = trigger.config.timezone;
    const target = moment.tz(trigger.config.isoDateTime, tz);
    const now = moment.tz(tz);
    if (target.isAfter(now)) return { when: target.toDate(), timezone: tz };
    return { when: null, timezone: tz };
  }
  if (t === "time.dailyAt") {
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
  if (t === "time.everyNMinutes") {
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
  if (t === "time.minuteOfHour") {
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
