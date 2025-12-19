import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/Card";
import { Input } from "../../ui/Input";
import { Switch } from "../../ui/Switch";
import { getChannelPointConfig } from "./triggerConfigHelpers";
import type { Trigger } from "../../../types/spawn";

interface ChannelPointTriggerConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
}

export const ChannelPointTriggerConfig: React.FC<
  ChannelPointTriggerConfigProps
> = ({ trigger, setTrigger }) => {
  const config = getChannelPointConfig(trigger);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
          Channel Point Reward Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Reward Identifier */}
          <div>
            <Input
              type="text"
              label="Reward Identifier"
              value={config?.rewardIdentifier || ""}
              onChange={(e) => {
                setTrigger({
                  ...trigger,
                  config: {
                    ...config,
                    rewardIdentifier: e.target.value,
                  },
                } as Trigger);
              }}
              placeholder="Enter reward name or ID (e.g., Alert, Scene1, 12345)"
              error={
                !config?.rewardIdentifier?.trim()
                  ? "Reward identifier is required"
                  : undefined
              }
              helperText="Enter the name or ID of the channel point reward from your Twitch channel"
            />
          </div>

          {/* Use Viewer Input */}
          <div>
            <div className="flex items-center gap-2">
              <Switch
                aria-label="Use viewer input in spawn configuration"
                checked={config?.useViewerInput || false}
                onCheckedChange={(checked) => {
                  setTrigger({
                    ...trigger,
                    config: {
                      ...config,
                      useViewerInput: checked,
                    },
                  } as Trigger);
                }}
              />
              <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
                Use viewer input in spawn configuration
              </label>
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
              When enabled, the viewer's message will be available for use in
              spawn settings
            </p>
          </div>

          {/* Redemption Statuses */}
          <div>
            <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-2">
              Redemption Statuses
            </label>
            <div className="space-y-2">
              {["pending", "fulfilled", "cancelled"].map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <Switch
                    aria-label={status}
                    checked={(config?.statuses || ["fulfilled"]).includes(
                      status,
                    )}
                    onCheckedChange={(checked) => {
                      const currentStatuses = config?.statuses || ["fulfilled"];
                      const newStatuses = checked
                        ? [...currentStatuses, status]
                        : currentStatuses.filter((s: string) => s !== status);
                      setTrigger({
                        ...trigger,
                        config: {
                          ...config,
                          statuses: newStatuses,
                        },
                      } as Trigger);
                    }}
                  />
                  <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer capitalize">
                    {status}
                  </label>
                </div>
              ))}
            </div>
            {(() => {
              const statuses = config?.statuses || [];
              if (statuses.length === 0) {
                return (
                  <p className="mt-1 text-xs text-[rgb(var(--color-error))]">
                    At least one redemption status must be selected
                  </p>
                );
              }
              return null;
            })()}
            <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
              Select which redemption statuses should trigger this spawn
            </p>
          </div>

          {/* Help Text */}
          <div className="bg-[rgb(var(--color-accent))]/10 border border-[rgb(var(--color-accent))]/20 rounded-lg p-3">
            <p className="text-xs text-[rgb(var(--color-accent-text))]">
              <strong>Note:</strong> Twitch handles all reward logic including
              cooldowns, usage limits, and point costs. MediaSpawner only
              configures when spawns trigger based on redemption events.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
