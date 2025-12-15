import React from "react";
import moment from "moment-timezone/builds/moment-timezone-with-data-1970-2030";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/Card";
import { Input } from "../../ui/Input";
import {
  timezoneOptions,
  dayOfWeekOptions,
  getAtDateTimeConfig,
  getDailyAtConfig,
  getEveryNMinutesConfig,
  getMinuteOfHourConfig,
  getWeeklyAtConfig,
  getMonthlyOnConfig,
} from "./triggerConfigHelpers";
import {
  getNextActivation,
  formatNextActivation,
} from "../../../utils/scheduling";
import type { Trigger } from "../../../types/spawn";
import type { TriggerValidationResult } from "../../../utils/triggerValidation";

interface TimeTriggerConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
  validation: TriggerValidationResult;
}

export const TimeTriggerConfig: React.FC<TimeTriggerConfigProps> = ({
  trigger,
  setTrigger,
  validation,
}) => {
  const next = getNextActivation(trigger);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
          Time-based Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Next activation display */}
          <div className="bg-[rgb(var(--color-muted))]/5 border border-[rgb(var(--color-border))] rounded p-2 text-sm text-[rgb(var(--color-fg))]">
            <span className="font-medium">Next activation: </span>
            {formatNextActivation(next.when, next.timezone)}
          </div>

          {/* Weekly At */}
          {trigger.type === "time.weeklyAt" && (
            <WeeklyAtConfig trigger={trigger} setTrigger={setTrigger} />
          )}

          {/* Monthly On */}
          {trigger.type === "time.monthlyOn" && (
            <MonthlyOnConfig trigger={trigger} setTrigger={setTrigger} />
          )}

          {/* At Date/Time */}
          {trigger.type === "time.atDateTime" && (
            <AtDateTimeConfig
              trigger={trigger}
              setTrigger={setTrigger}
              validation={validation}
            />
          )}

          {/* Daily At */}
          {trigger.type === "time.dailyAt" && (
            <DailyAtConfig
              trigger={trigger}
              setTrigger={setTrigger}
              validation={validation}
            />
          )}

          {/* Every N Minutes */}
          {trigger.type === "time.everyNMinutes" && (
            <EveryNMinutesConfig
              trigger={trigger}
              setTrigger={setTrigger}
              validation={validation}
            />
          )}

          {/* Minute of Hour */}
          {trigger.type === "time.minuteOfHour" && (
            <MinuteOfHourConfig
              trigger={trigger}
              setTrigger={setTrigger}
              validation={validation}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Sub-components for each time trigger type

interface WeeklyAtConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
}

const WeeklyAtConfig: React.FC<WeeklyAtConfigProps> = ({
  trigger,
  setTrigger,
}) => {
  const config = getWeeklyAtConfig(trigger);
  const daysOfWeek = config?.daysOfWeek ?? [1];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[rgb(var(--color-fg))] mb-2">
            Days of Week
          </legend>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {dayOfWeekOptions.map((d) => {
              const isChecked = daysOfWeek.includes(d.value);
              const isLastDay = daysOfWeek.length === 1 && isChecked;
              return (
                <label
                  key={d.value}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={trigger.enabled === false || isLastDay}
                    onChange={(e) => {
                      const base = config || {
                        daysOfWeek: [1],
                        time: "09:00",
                        timezone: moment.tz.guess(),
                      };
                      const currentDays = base.daysOfWeek;
                      let newDays: number[];
                      if (e.target.checked) {
                        newDays = [...currentDays, d.value];
                      } else {
                        newDays = currentDays.filter((day) => day !== d.value);
                      }
                      setTrigger({
                        ...trigger,
                        config: {
                          ...base,
                          daysOfWeek: newDays,
                        },
                      } as Trigger);
                    }}
                    className="rounded border-[rgb(var(--color-border))] text-[rgb(var(--color-accent))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-[rgb(var(--color-fg))]">
                    {d.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
      <div>
        <Input
          type="time"
          label="Time (HH:mm)"
          value={config?.time || "09:00"}
          onChange={(e) => {
            const base = config || {
              daysOfWeek: [1],
              time: "09:00",
              timezone: moment.tz.guess(),
            };
            setTrigger({
              ...trigger,
              config: { ...base, time: e.target.value },
            } as Trigger);
          }}
          disabled={trigger.enabled === false}
        />
      </div>
      <div>
        <Input
          type="select"
          label="Timezone"
          value={config?.timezone || moment.tz.guess()}
          onChange={(e) => {
            const base = config || {
              daysOfWeek: [1],
              time: "09:00",
              timezone: moment.tz.guess(),
            };
            setTrigger({
              ...trigger,
              config: { ...base, timezone: e.target.value },
            } as Trigger);
          }}
          disabled={trigger.enabled === false}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </Input>
      </div>
    </div>
  );
};

interface MonthlyOnConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
}

const MonthlyOnConfig: React.FC<MonthlyOnConfigProps> = ({
  trigger,
  setTrigger,
}) => {
  const config = getMonthlyOnConfig(trigger);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Input
          type="number"
          label="Day of Month"
          min={1}
          max={31}
          value={config?.dayOfMonth ?? 1}
          onChange={(e) => {
            const val = Math.max(1, Math.min(31, Number(e.target.value) || 1));
            const base = config || {
              dayOfMonth: 1,
              time: "09:00",
              timezone: moment.tz.guess(),
            };
            setTrigger({
              ...trigger,
              config: { ...base, dayOfMonth: val },
            } as Trigger);
          }}
          disabled={trigger.enabled === false}
        />
      </div>
      <div>
        <Input
          type="time"
          label="Time (HH:mm)"
          value={config?.time || "09:00"}
          onChange={(e) => {
            const base = config || {
              dayOfMonth: 1,
              time: "09:00",
              timezone: moment.tz.guess(),
            };
            setTrigger({
              ...trigger,
              config: { ...base, time: e.target.value },
            } as Trigger);
          }}
          disabled={trigger.enabled === false}
        />
      </div>
      <div>
        <Input
          type="select"
          label="Timezone"
          value={config?.timezone || moment.tz.guess()}
          onChange={(e) => {
            const base = config || {
              dayOfMonth: 1,
              time: "09:00",
              timezone: moment.tz.guess(),
            };
            setTrigger({
              ...trigger,
              config: { ...base, timezone: e.target.value },
            } as Trigger);
          }}
          disabled={trigger.enabled === false}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </Input>
      </div>
    </div>
  );
};

interface AtDateTimeConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
  validation: TriggerValidationResult;
}

const AtDateTimeConfig: React.FC<AtDateTimeConfigProps> = ({
  trigger,
  setTrigger,
  validation,
}) => {
  const config = getAtDateTimeConfig(trigger);

  const dateTimeValue = (() => {
    if (!config?.isoDateTime) return "";
    try {
      return moment(config.isoDateTime)
        .tz(config.timezone)
        .format("YYYY-MM-DDTHH:mm");
    } catch {
      return "";
    }
  })();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Input
          id="at-datetime"
          type="datetime-local"
          label="ISO Date-Time"
          value={dateTimeValue}
          onChange={(e) => {
            const tz = config?.timezone || moment.tz.guess();
            const iso = e.target.value
              ? moment.tz(e.target.value, "YYYY-MM-DDTHH:mm", tz).toISOString()
              : new Date().toISOString();
            const base = config || {
              isoDateTime: new Date().toISOString(),
              timezone: tz,
            };
            setTrigger({
              ...trigger,
              config: { ...base, isoDateTime: iso },
            } as Trigger);
          }}
          error={validation.fieldErrors.isoDateTime?.[0]}
        />
      </div>
      <div>
        <Input
          id="at-timezone"
          type="select"
          label="Timezone"
          value={config?.timezone || moment.tz.guess()}
          onChange={(e) => {
            const base = config || {
              isoDateTime: new Date().toISOString(),
              timezone: moment.tz.guess(),
            };
            setTrigger({
              ...trigger,
              config: { ...base, timezone: e.target.value },
            } as Trigger);
          }}
          disabled={trigger.enabled === false}
          error={validation.fieldErrors.timezone?.[0]}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </Input>
      </div>
    </div>
  );
};

interface DailyAtConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
  validation: TriggerValidationResult;
}

const DailyAtConfig: React.FC<DailyAtConfigProps> = ({
  trigger,
  setTrigger,
  validation,
}) => {
  const config = getDailyAtConfig(trigger);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Input
          id="daily-time"
          type="time"
          label="Time (HH:mm)"
          value={config?.time || "09:00"}
          onChange={(e) => {
            const base = config || {
              time: "09:00",
              timezone: "UTC",
            };
            setTrigger({
              ...trigger,
              config: { ...base, time: e.target.value },
            } as Trigger);
          }}
          error={validation.fieldErrors.time?.[0]}
        />
      </div>
      <div>
        <Input
          id="daily-timezone"
          type="select"
          label="Timezone"
          value={config?.timezone || moment.tz.guess()}
          onChange={(e) => {
            const base = config || {
              time: "09:00",
              timezone: moment.tz.guess(),
            };
            setTrigger({
              ...trigger,
              config: { ...base, timezone: e.target.value },
            } as Trigger);
          }}
          disabled={trigger.enabled === false}
          error={validation.fieldErrors.timezone?.[0]}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </Input>
      </div>
    </div>
  );
};

interface EveryNMinutesConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
  validation: TriggerValidationResult;
}

const EveryNMinutesConfig: React.FC<EveryNMinutesConfigProps> = ({
  trigger,
  setTrigger,
  validation,
}) => {
  const config = getEveryNMinutesConfig(trigger);
  const anchor = config?.anchor;
  const anchorKind = anchor?.kind === "custom" ? "custom" : "topOfHour";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Input
            id="every-interval"
            type="number"
            label="Interval (minutes)"
            min={1}
            value={config?.intervalMinutes ?? 15}
            onChange={(e) => {
              const val = Math.max(1, Number(e.target.value) || 1);
              const base = config || {
                intervalMinutes: 15,
                timezone: "UTC",
              };
              setTrigger({
                ...trigger,
                config: { ...base, intervalMinutes: val },
              } as Trigger);
            }}
            error={validation.fieldErrors.intervalMinutes?.[0]}
          />
        </div>
        <div>
          <Input
            id="every-timezone"
            type="select"
            label="Timezone"
            value={config?.timezone || moment.tz.guess()}
            onChange={(e) => {
              const base = config || {
                intervalMinutes: 15,
                timezone: moment.tz.guess(),
              };
              setTrigger({
                ...trigger,
                config: { ...base, timezone: e.target.value },
              } as Trigger);
            }}
            disabled={trigger.enabled === false}
            error={validation.fieldErrors.timezone?.[0]}
          >
            {timezoneOptions.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Input>
        </div>
        <div>
          <Input
            id="every-anchor"
            type="select"
            label="Anchor"
            value={anchorKind}
            onChange={(e) => {
              const kind = e.target.value === "custom" ? "custom" : "topOfHour";
              const existing = config || {
                intervalMinutes: 15,
                timezone: "UTC",
              };
              const nextAnchor =
                kind === "topOfHour"
                  ? { kind: "topOfHour" as const }
                  : {
                      kind: "custom" as const,
                      isoDateTime: new Date().toISOString(),
                      timezone: existing.timezone,
                    };
              setTrigger({
                ...trigger,
                config: { ...existing, anchor: nextAnchor },
              } as Trigger);
            }}
          >
            <option value="topOfHour">Top of hour</option>
            <option value="custom">Custom</option>
          </Input>
        </div>
      </div>

      {anchor?.kind === "custom" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              id="every-custom-iso"
              type="datetime-local"
              label="Custom Anchor"
              value={(() => {
                if (!anchor || anchor.kind !== "custom" || !anchor.isoDateTime)
                  return "";
                try {
                  return moment(anchor.isoDateTime)
                    .tz(anchor.timezone)
                    .format("YYYY-MM-DDTHH:mm");
                } catch {
                  return "";
                }
              })()}
              onChange={(e) => {
                const existing = config || {
                  intervalMinutes: 15,
                  timezone: "UTC",
                };
                if (!anchor || anchor.kind !== "custom") return;
                const tz = anchor.timezone || moment.tz.guess();
                const iso = e.target.value
                  ? moment
                      .tz(e.target.value, "YYYY-MM-DDTHH:mm", tz)
                      .toISOString()
                  : new Date().toISOString();
                setTrigger({
                  ...trigger,
                  config: {
                    ...existing,
                    anchor: { ...anchor, isoDateTime: iso },
                  },
                } as Trigger);
              }}
              error={validation.fieldErrors["anchor.isoDateTime"]?.[0]}
            />
          </div>
          <div>
            <Input
              id="every-custom-tz"
              type="select"
              label="Anchor Timezone"
              value={
                anchor.kind === "custom" ? anchor.timezone : moment.tz.guess()
              }
              onChange={(e) => {
                const existing = config || {
                  intervalMinutes: 15,
                  timezone: moment.tz.guess(),
                };
                if (!anchor || anchor.kind !== "custom") return;
                const newTimezone = e.target.value;
                const oldTimezone = anchor.timezone;
                let newIsoDateTime = anchor.isoDateTime;
                if (
                  anchor.isoDateTime &&
                  oldTimezone &&
                  newTimezone !== oldTimezone
                ) {
                  try {
                    const wallClockTime = moment(anchor.isoDateTime).tz(
                      oldTimezone,
                    );
                    newIsoDateTime = moment
                      .tz(
                        wallClockTime.format("YYYY-MM-DDTHH:mm:ss"),
                        "YYYY-MM-DDTHH:mm:ss",
                        newTimezone,
                      )
                      .toISOString();
                  } catch {
                    newIsoDateTime = anchor.isoDateTime;
                  }
                }
                setTrigger({
                  ...trigger,
                  config: {
                    ...existing,
                    anchor: {
                      ...anchor,
                      timezone: newTimezone,
                      isoDateTime: newIsoDateTime,
                    },
                  },
                } as Trigger);
              }}
              disabled={trigger.enabled === false}
              error={validation.fieldErrors["anchor.timezone"]?.[0]}
            >
              {timezoneOptions.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </Input>
          </div>
        </div>
      )}
    </div>
  );
};

interface MinuteOfHourConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
  validation: TriggerValidationResult;
}

const MinuteOfHourConfig: React.FC<MinuteOfHourConfigProps> = ({
  trigger,
  setTrigger,
  validation,
}) => {
  const config = getMinuteOfHourConfig(trigger);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Input
          id="minute-minute"
          type="number"
          label="Minute (0-59)"
          min={0}
          max={59}
          value={config?.minute ?? 0}
          onChange={(e) => {
            const val = Math.max(0, Math.min(59, Number(e.target.value) || 0));
            const base = config || {
              minute: 0,
              timezone: "UTC",
            };
            setTrigger({
              ...trigger,
              config: { ...base, minute: val },
            } as Trigger);
          }}
          error={validation.fieldErrors.minute?.[0]}
        />
      </div>
      <div>
        <Input
          id="minute-timezone"
          type="select"
          label="Timezone"
          value={config?.timezone || moment.tz.guess()}
          onChange={(e) => {
            const base = config || {
              minute: 0,
              timezone: moment.tz.guess(),
            };
            setTrigger({
              ...trigger,
              config: { ...base, timezone: e.target.value },
            } as Trigger);
          }}
          disabled={trigger.enabled === false}
          error={validation.fieldErrors.timezone?.[0]}
        >
          {timezoneOptions.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </Input>
      </div>
    </div>
  );
};
