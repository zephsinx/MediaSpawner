import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/Card";
import { Switch } from "../../ui/Switch";
import { SBCommandAliasCombobox } from "./SBCommandAliasCombobox";
import { getCommandConfig } from "./triggerConfigHelpers";
import type { Trigger } from "../../../types/spawn";

interface CommandTriggerConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
}

export const CommandTriggerConfig: React.FC<CommandTriggerConfigProps> = ({
  trigger,
  setTrigger,
}) => {
  const config = getCommandConfig(trigger);
  const aliases = config?.aliases || [""];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
          Command Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Command Aliases */}
          <div>
            <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-2">
              Command Aliases
            </label>
            <div className="space-y-2">
              {aliases.map((alias: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <SBCommandAliasCombobox
                    value={alias}
                    onChange={(v) => {
                      const newAliases = [...aliases];
                      newAliases[index] = typeof v === "string" ? v : "";
                      setTrigger({
                        ...trigger,
                        config: {
                          ...config,
                          aliases: newAliases,
                        },
                      } as Trigger);
                    }}
                  />
                  {aliases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newAliases = aliases.filter(
                          (_: string, i: number) => i !== index,
                        );
                        setTrigger({
                          ...trigger,
                          config: {
                            ...config,
                            aliases: newAliases,
                          },
                        } as Trigger);
                      }}
                      className="px-2 py-1 text-[rgb(var(--color-error))] hover:text-[rgb(var(--color-error-hover))] hover:bg-[rgb(var(--color-error-bg))] rounded"
                      aria-label="Remove command alias"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newAliases = [...aliases, ""];
                  setTrigger({
                    ...trigger,
                    config: {
                      ...config,
                      aliases: newAliases,
                    },
                  } as Trigger);
                }}
                className="px-3 py-1 text-sm text-[rgb(var(--color-accent))] hover:text-[rgb(var(--color-accent-hover))] hover:bg-[rgb(var(--color-accent))]/10 rounded border border-[rgb(var(--color-accent))]/20"
              >
                + Add Alias
              </button>
            </div>
            {(() => {
              const hasEmptyAlias = aliases.some((a: string) => !a.trim());
              if (!aliases.length || hasEmptyAlias) {
                return (
                  <p className="mt-1 text-xs text-[rgb(var(--color-error))]">
                    At least one command alias is required
                  </p>
                );
              }
              return null;
            })()}
          </div>

          {/* Case Sensitivity */}
          <div>
            <div className="flex items-center gap-2">
              <Switch
                aria-label="Case sensitive"
                checked={config?.caseSensitive || false}
                onCheckedChange={(checked) => {
                  setTrigger({
                    ...trigger,
                    config: {
                      ...config,
                      caseSensitive: checked,
                    },
                  } as Trigger);
                }}
              />
              <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
                Case sensitive
              </label>
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
              When enabled, command matching will be case-sensitive
            </p>
          </div>

          {/* Filtering Options */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <Switch
                  aria-label="Ignore internal messages"
                  checked={config?.ignoreInternal !== false}
                  onCheckedChange={(checked) => {
                    setTrigger({
                      ...trigger,
                      config: {
                        ...config,
                        ignoreInternal: checked,
                      },
                    } as Trigger);
                  }}
                />
                <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
                  Ignore internal messages
                </label>
              </div>
              <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                Skip messages from internal/system sources
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Switch
                  aria-label="Ignore bot account messages"
                  checked={config?.ignoreBotAccount !== false}
                  onCheckedChange={(checked) => {
                    setTrigger({
                      ...trigger,
                      config: {
                        ...config,
                        ignoreBotAccount: checked,
                      },
                    } as Trigger);
                  }}
                />
                <label className="text-sm text-[rgb(var(--color-fg))] cursor-pointer">
                  Ignore bot account messages
                </label>
              </div>
              <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                Skip messages from the bot account to avoid loops
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
