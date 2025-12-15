import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Switch";
import type { Trigger, TriggerType } from "../../types/spawn";
import { getDefaultTrigger } from "../../types/spawn";

interface TriggerTypeSelectorProps {
  trigger: Trigger | null;
  setTrigger: (trigger: Trigger) => void;
  onTriggerTypeChange: (nextType: TriggerType) => void;
}

const getTriggerDescription = (triggerType: string): React.ReactNode => {
  switch (triggerType) {
    case "manual":
      return (
        <p>
          Manual triggers are activated outside of MediaSpawner. No
          configuration required.
        </p>
      );
    case "time.atDateTime":
    case "time.dailyAt":
    case "time.everyNMinutes":
    case "time.minuteOfHour":
    case "time.weeklyAt":
    case "time.monthlyOn":
      return <p>Schedule triggers based on timezone-aware date/time rules.</p>;
    case "streamerbot.command":
      return (
        <p>
          Streamer.bot command: configure command aliases and platform sources.
        </p>
      );
    case "twitch.channelPointReward":
      return (
        <p>
          Twitch Channel Point reward redemption. Configure reward details in a
          later story.
        </p>
      );
    case "twitch.subscription":
      return <p>Configure subscription tier or minimum months.</p>;
    case "twitch.giftSub":
      return <p>Configure gifted sub count and optional tier.</p>;
    case "twitch.cheer":
      return <p>Configure minimum bits required to trigger.</p>;
    case "twitch.follow":
      return <p>Twitch follow events. No additional configuration required.</p>;
    default:
      return null;
  }
};

export const TriggerTypeSelector: React.FC<TriggerTypeSelectorProps> = ({
  trigger,
  setTrigger,
  onTriggerTypeChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))]">
            Trigger
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              checked={trigger?.enabled !== false}
              onCheckedChange={(checked) => {
                if (!trigger) return;
                setTrigger({ ...trigger, enabled: checked });
              }}
              aria-label="Trigger Enabled"
            />
            <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
              Trigger Enabled
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              id="trigger-type"
              type="select"
              label="Trigger Type"
              value={trigger?.type || "manual"}
              onChange={(e) => {
                const nextType = e.target.value as TriggerType;
                if (!trigger) {
                  setTrigger(getDefaultTrigger(nextType));
                  return;
                }
                if (nextType === trigger.type) return;
                onTriggerTypeChange(nextType);
              }}
            >
              <option value="manual">Manual</option>
              <option value="time.atDateTime">Time: At Date/Time</option>
              <option value="time.dailyAt">Time: Daily At</option>
              <option value="time.everyNMinutes">Time: Every N Minutes</option>
              <option value="time.weeklyAt">Time: Weekly At</option>
              <option value="time.monthlyOn">Time: Monthly On</option>
              <option value="time.minuteOfHour">Time: Minute Of Hour</option>
              <option value="streamerbot.command">Streamer.bot Command</option>
              <option value="twitch.channelPointReward">
                Twitch: Channel Point Reward
              </option>
              <option value="twitch.subscription">Twitch: Subscription</option>
              <option value="twitch.giftSub">Twitch: Gifted Subs</option>
              <option value="twitch.cheer">Twitch: Cheer</option>
              <option value="twitch.follow">Twitch: Follow</option>
            </Input>
          </div>
          <div className="md:col-span-2 text-xs text-[rgb(var(--color-muted-foreground))]">
            {getTriggerDescription(trigger?.type || "manual")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
