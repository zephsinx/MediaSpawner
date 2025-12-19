import moment from "moment-timezone/builds/moment-timezone-with-data-1970-2030";
import type { Trigger } from "../../../types/spawn";

export const buildTimezoneOptions = () => {
  const now = Date.now();
  return moment.tz
    .names()
    .map((zone) => {
      const offsetMin = moment.tz(now, zone).utcOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
      const mm = String(Math.abs(offsetMin) % 60).padStart(2, "0");
      return {
        value: zone,
        label: `(UTC${sign}${hh}:${mm}) ${zone}`,
        offset: offsetMin,
      };
    })
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label));
};

export const timezoneOptions = buildTimezoneOptions();

export const dayOfWeekOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const getCommandConfig = (trigger: Trigger | null) => {
  if (trigger?.type === "streamerbot.command") {
    return trigger.config;
  }
  return null;
};

export const getChannelPointConfig = (trigger: Trigger | null) => {
  if (trigger?.type === "twitch.channelPointReward") {
    return trigger.config;
  }
  return null;
};

export const getSubscriptionConfig = (trigger: Trigger | null) =>
  trigger?.type === "twitch.subscription" ? trigger.config : null;

export const getGiftSubConfig = (trigger: Trigger | null) =>
  trigger?.type === "twitch.giftSub" ? trigger.config : null;

export const getCheerConfig = (trigger: Trigger | null) =>
  trigger?.type === "twitch.cheer" ? trigger.config : null;

export const getAtDateTimeConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.atDateTime" ? trigger.config : null;

export const getDailyAtConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.dailyAt" ? trigger.config : null;

export const getEveryNMinutesConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.everyNMinutes" ? trigger.config : null;

export const getMinuteOfHourConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.minuteOfHour" ? trigger.config : null;

export const getWeeklyAtConfig = (trigger: Trigger | null) => {
  if (trigger?.type !== "time.weeklyAt") return null;
  const config = trigger.config as {
    daysOfWeek?: number[];
    dayOfWeek?: number;
    time: string;
    timezone: string;
  };
  // Handle old config format (dayOfWeek) by migrating to daysOfWeek array
  const daysOfWeek = Array.isArray(config.daysOfWeek)
    ? config.daysOfWeek
    : typeof config.dayOfWeek === "number"
      ? [config.dayOfWeek]
      : [1]; // Default to Monday if neither exists
  return {
    daysOfWeek,
    time: config.time,
    timezone: config.timezone,
  };
};

export const getMonthlyOnConfig = (trigger: Trigger | null) =>
  trigger?.type === "time.monthlyOn"
    ? (trigger.config as { dayOfMonth: number; time: string; timezone: string })
    : null;
