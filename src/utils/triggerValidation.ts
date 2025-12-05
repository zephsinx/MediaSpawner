import moment from "moment-timezone/builds/moment-timezone-with-data-1970-2030";
import type { Trigger } from "../types/spawn";

export interface TriggerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldErrors: Record<string, string[]>;
}

const isValidTimezone = (tz: string | undefined): boolean => {
  if (!tz) return false;
  return moment.tz.zone(tz) !== null;
};

const isValidIsoDateTime = (iso: string | undefined): boolean => {
  if (!iso) return false;
  return moment(iso, moment.ISO_8601, true).isValid();
};

const isValidHHmm = (time: string | undefined): boolean => {
  if (!time) return false;
  return moment(time, "HH:mm", true).isValid();
};

export const validateTrigger = (
  trigger: Trigger | null,
): TriggerValidationResult => {
  const result: TriggerValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldErrors: {},
  };
  if (!trigger) return result;

  switch (trigger.type) {
    case "manual": {
      return result;
    }
    case "time.atDateTime": {
      const { isoDateTime, timezone } = trigger.config;
      if (!isValidIsoDateTime(isoDateTime)) {
        result.isValid = false;
        result.errors.push("Enter a valid ISO date-time (RFC3339)");
        (result.fieldErrors.isoDateTime ||= []).push(
          "Enter a valid ISO date-time (RFC3339)",
        );
      }
      if (!isValidTimezone(timezone)) {
        result.isValid = false;
        result.errors.push("Select a valid timezone");
        (result.fieldErrors.timezone ||= []).push("Select a valid timezone");
      }
      if (isValidIsoDateTime(isoDateTime) && isValidTimezone(timezone)) {
        const now = moment.tz(timezone);
        const target = moment.tz(isoDateTime, timezone);
        if (!target.isAfter(now)) {
          result.warnings.push(
            "The date/time is in the past; it will not trigger again",
          );
        }
      }
      return result;
    }
    case "time.dailyAt": {
      const { time, timezone } = trigger.config;
      if (!isValidHHmm(time)) {
        result.isValid = false;
        result.errors.push("Time must be HH:mm (24-hour)");
        (result.fieldErrors.time ||= []).push("Time must be HH:mm (24-hour)");
      }
      if (!isValidTimezone(timezone)) {
        result.isValid = false;
        result.errors.push("Select a valid timezone");
        (result.fieldErrors.timezone ||= []).push("Select a valid timezone");
      }
      return result;
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
          : [];
      const { time, timezone } = config;
      if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        result.isValid = false;
        result.errors.push("At least one day of week must be selected");
        (result.fieldErrors.daysOfWeek ||= []).push(
          "At least one day of week must be selected",
        );
      } else {
        const invalidDays = daysOfWeek.filter(
          (day) => !Number.isInteger(day) || day < 0 || day > 6,
        );
        if (invalidDays.length > 0) {
          result.isValid = false;
          result.errors.push(
            "Days of week must be integers from 0 (Sun) to 6 (Sat)",
          );
          (result.fieldErrors.daysOfWeek ||= []).push(
            "Days of week must be integers from 0 (Sun) to 6 (Sat)",
          );
        }
        const uniqueDays = new Set(daysOfWeek);
        if (uniqueDays.size !== daysOfWeek.length) {
          result.isValid = false;
          result.errors.push("Days of week must not contain duplicates");
          (result.fieldErrors.daysOfWeek ||= []).push(
            "Days of week must not contain duplicates",
          );
        }
      }
      if (!isValidHHmm(time)) {
        result.isValid = false;
        result.errors.push("Time must be HH:mm (24-hour)");
        (result.fieldErrors.time ||= []).push("Time must be HH:mm (24-hour)");
      }
      if (!isValidTimezone(timezone)) {
        result.isValid = false;
        result.errors.push("Select a valid timezone");
        (result.fieldErrors.timezone ||= []).push("Select a valid timezone");
      }
      return result;
    }
    case "time.monthlyOn": {
      const { dayOfMonth, time, timezone } = trigger.config as {
        dayOfMonth: number;
        time: string;
        timezone: string;
      };
      if (
        !(Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31)
      ) {
        result.isValid = false;
        result.errors.push("Day of month must be 1 to 31");
        (result.fieldErrors.dayOfMonth ||= []).push(
          "Day of month must be 1 to 31",
        );
      }
      if (!isValidHHmm(time)) {
        result.isValid = false;
        result.errors.push("Time must be HH:mm (24-hour)");
        (result.fieldErrors.time ||= []).push("Time must be HH:mm (24-hour)");
      }
      if (!isValidTimezone(timezone)) {
        result.isValid = false;
        result.errors.push("Select a valid timezone");
        (result.fieldErrors.timezone ||= []).push("Select a valid timezone");
      }
      if (dayOfMonth >= 29) {
        result.warnings.push("Selected day may be skipped in some months");
      }
      return result;
    }
    case "time.everyNMinutes": {
      const { intervalMinutes, timezone, anchor } = trigger.config;
      if (!(Number.isInteger(intervalMinutes) && intervalMinutes >= 1)) {
        result.isValid = false;
        result.errors.push("Interval must be an integer ≥ 1 minute");
        (result.fieldErrors.intervalMinutes ||= []).push(
          "Interval must be an integer ≥ 1 minute",
        );
      }
      if (!isValidTimezone(timezone)) {
        result.isValid = false;
        result.errors.push("Select a valid timezone");
        (result.fieldErrors.timezone ||= []).push("Select a valid timezone");
      }
      if (anchor && anchor.kind === "custom") {
        if (!isValidIsoDateTime(anchor.isoDateTime)) {
          result.isValid = false;
          result.errors.push("Custom anchor must be a valid ISO date-time");
          (result.fieldErrors["anchor.isoDateTime"] ||= []).push(
            "Custom anchor must be a valid ISO date-time",
          );
        }
        if (!isValidTimezone(anchor.timezone)) {
          result.isValid = false;
          result.errors.push("Custom anchor timezone must be valid");
          (result.fieldErrors["anchor.timezone"] ||= []).push(
            "Custom anchor timezone must be valid",
          );
        }
      }
      if (intervalMinutes > 1440) {
        result.warnings.push("Very long interval; ensure this is intended");
      }
      return result;
    }
    case "time.minuteOfHour": {
      const { minute, timezone } = trigger.config;
      if (!(Number.isInteger(minute) && minute >= 0 && minute <= 59)) {
        result.isValid = false;
        result.errors.push("Minute must be in 0–59");
        (result.fieldErrors.minute ||= []).push("Minute must be in 0–59");
      }
      if (!isValidTimezone(timezone)) {
        result.isValid = false;
        result.errors.push("Select a valid timezone");
        (result.fieldErrors.timezone ||= []).push("Select a valid timezone");
      }
      return result;
    }
    case "streamerbot.command": {
      const aliases = (trigger.config.aliases || []).map((a) => a.trim());
      if (aliases.length === 0 || aliases.some((a) => a.length === 0)) {
        result.isValid = false;
        result.errors.push("Add at least one non-empty command alias");
        (result.fieldErrors.aliases ||= []).push(
          "Add at least one non-empty command alias",
        );
      }
      return result;
    }
    case "twitch.cheer": {
      const { bits, bitsComparator } = trigger.config as {
        bits?: number;
        bitsComparator?: "lt" | "eq" | "gt";
      };
      if (
        (bits !== undefined && !bitsComparator) ||
        (bitsComparator && bits === undefined)
      ) {
        result.isValid = false;
        result.errors.push("Provide both bits and comparator");
        (result.fieldErrors.bits ||= []).push(
          "Provide both bits and comparator",
        );
        (result.fieldErrors.bitsComparator ||= []).push(
          "Provide both bits and comparator",
        );
      }
      if (bits !== undefined && !(Number.isInteger(bits) && bits >= 1)) {
        result.isValid = false;
        result.errors.push("Bits must be an integer ≥ 1");
        (result.fieldErrors.bits ||= []).push("Bits must be an integer ≥ 1");
      }
      return result;
    }
    case "twitch.subscription": {
      const { tier, months, monthsComparator } = trigger.config as {
        tier?: "1000" | "2000" | "3000";
        months?: number;
        monthsComparator?: "lt" | "eq" | "gt";
      };
      if (tier && tier !== "1000" && tier !== "2000" && tier !== "3000") {
        result.isValid = false;
        result.errors.push("Tier must be 1000, 2000, or 3000");
        (result.fieldErrors.tier ||= []).push(
          "Tier must be 1000, 2000, or 3000",
        );
      }
      if (
        (months !== undefined && !monthsComparator) ||
        (monthsComparator && months === undefined)
      ) {
        result.isValid = false;
        result.errors.push("Provide both months and comparator");
        (result.fieldErrors.months ||= []).push(
          "Provide both months and comparator",
        );
        (result.fieldErrors.monthsComparator ||= []).push(
          "Provide both months and comparator",
        );
      }
      if (months !== undefined && !(Number.isInteger(months) && months >= 1)) {
        result.isValid = false;
        result.errors.push("Months must be an integer ≥ 1");
        (result.fieldErrors.months ||= []).push(
          "Months must be an integer ≥ 1",
        );
      }
      return result;
    }
    case "twitch.giftSub": {
      const { minCount, tier } = trigger.config;
      if (
        minCount !== undefined &&
        !(Number.isInteger(minCount) && minCount >= 1)
      ) {
        result.isValid = false;
        result.errors.push("Minimum count must be ≥ 1");
        (result.fieldErrors.minCount ||= []).push("Minimum count must be ≥ 1");
      }
      if (tier && tier !== "1000" && tier !== "2000" && tier !== "3000") {
        result.isValid = false;
        result.errors.push("Tier must be 1000, 2000, or 3000");
        (result.fieldErrors.tier ||= []).push(
          "Tier must be 1000, 2000, or 3000",
        );
      }
      return result;
    }
    case "twitch.channelPointReward": {
      const { rewardIdentifier, statuses } = trigger.config;
      if (!rewardIdentifier || rewardIdentifier.trim().length === 0) {
        result.isValid = false;
        result.errors.push("Reward identifier is required");
        (result.fieldErrors.rewardIdentifier ||= []).push(
          "Reward identifier is required",
        );
      }
      if (!Array.isArray(statuses) || statuses.length === 0) {
        result.isValid = false;
        result.errors.push("Select at least one redemption status");
        (result.fieldErrors.statuses ||= []).push(
          "Select at least one redemption status",
        );
      }
      return result;
    }
    default:
      return result;
  }
};
