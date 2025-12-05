import moment from "moment-timezone/builds/moment-timezone-with-data-1970-2030";
import type { Spawn, Trigger } from "../types/spawn";
import { getNextActivation, formatNextActivation } from "./scheduling";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const getTriggerTypeLabel = (
  trigger: Trigger | null | undefined,
): string => {
  if (!trigger) return "-";
  switch (trigger.type) {
    case "manual":
      return "Manual";
    case "time.atDateTime":
      return "At";
    case "time.dailyAt":
      return "Daily";
    case "time.weeklyAt":
      return "Weekly";
    case "time.monthlyOn":
      return "Monthly";
    case "time.everyNMinutes":
      return "Interval";
    case "time.minuteOfHour":
      return "Hourly";
    case "streamerbot.command":
      return "Cmd";
    case "twitch.channelPointReward":
      return "CP Reward";
    case "twitch.subscription":
      return "Sub";
    case "twitch.giftSub":
      return "Gift Subs";
    case "twitch.cheer":
      return "Cheer";
    case "twitch.follow":
      return "Follow";
    default:
      return "-";
  }
};

export const getTriggerAbbrev = (
  trigger: Trigger | null | undefined,
): string => {
  if (!trigger) return "-";
  switch (trigger.type) {
    case "manual":
      return "Manual";
    case "time.atDateTime": {
      const { isoDateTime, timezone } = trigger.config;
      try {
        return `At ${moment.tz(isoDateTime, timezone).format("YYYY-MM-DD HH:mm z")}`;
      } catch {
        return "At -";
      }
    }
    case "time.dailyAt": {
      const { time, timezone } = trigger.config;
      return `Daily ${time} ${timezone}`;
    }
    case "time.weeklyAt": {
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
      const { time, timezone } = config;
      if (daysOfWeek.length === 1) {
        const day = dayNames[Math.max(0, Math.min(6, daysOfWeek[0]))];
        return `Weekly ${day} ${time} ${timezone}`;
      }
      const dayLabels = daysOfWeek
        .map((d) => dayNames[Math.max(0, Math.min(6, d))])
        .join(", ");
      return `Weekly ${dayLabels} ${time} ${timezone}`;
    }
    case "time.monthlyOn": {
      const { dayOfMonth, time, timezone } = trigger.config;
      return `Monthly ${dayOfMonth} ${time} ${timezone}`;
    }
    case "time.everyNMinutes": {
      const { intervalMinutes } = trigger.config;
      return `Every ${Math.max(1, intervalMinutes)} min`;
    }
    case "time.minuteOfHour": {
      const { minute } = trigger.config;
      const mm = String(Math.max(0, Math.min(59, minute))).padStart(2, "0");
      return `At :${mm} each hour`;
    }
    case "streamerbot.command": {
      const { aliases, commandId } = trigger.config;
      const first =
        (aliases && aliases.find((a) => a && a.trim().length > 0)) || commandId;
      return first ? `Cmd: ${first}` : "Cmd";
    }
    case "twitch.channelPointReward": {
      const { rewardIdentifier } = trigger.config;
      return rewardIdentifier
        ? `CP: ${rewardIdentifier}`
        : "Channel Point Reward";
    }
    case "twitch.subscription":
      return "Subscription";
    case "twitch.giftSub":
      return "Gifted Subs";
    case "twitch.cheer": {
      const { bits, bitsComparator } = trigger.config as {
        bits?: number;
        bitsComparator?: "lt" | "eq" | "gt";
      };
      if (bits && bitsComparator) return `Cheer ${bitsComparator} ${bits}`;
      if (bits) return `Cheer ${bits}`;
      return "Cheer";
    }
    case "twitch.follow":
      return "Follow";
    default:
      return "-";
  }
};

export const getTriggerTooltip = (
  trigger: Trigger | null | undefined,
): string => {
  if (!trigger) return "-";
  const type = getTriggerTypeLabel(trigger);
  const info = getTriggerAbbrev(trigger);
  return `${type} — ${info}`;
};

export const getTriggerScheduleLabel = (
  trigger: Trigger | null | undefined,
): string | null => {
  if (!trigger) return null;
  if (
    trigger.type === "time.atDateTime" ||
    trigger.type === "time.dailyAt" ||
    trigger.type === "time.weeklyAt" ||
    trigger.type === "time.monthlyOn" ||
    trigger.type === "time.everyNMinutes" ||
    trigger.type === "time.minuteOfHour"
  ) {
    const next = getNextActivation(trigger);
    return `Scheduled ${formatNextActivation(next.when, next.timezone)}`;
  }
  return null;
};

export const getOverallStatusLabel = (spawn: Spawn): string => {
  if (!spawn.enabled) return "Inactive";
  if (spawn.trigger?.enabled === false) return "Trigger off";
  return "Active";
};
