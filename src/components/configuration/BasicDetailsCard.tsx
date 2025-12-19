import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { Switch } from "../ui/Switch";
import type { TriggerValidationResult } from "../../utils/triggerValidation";

interface BasicDetailsCardProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  duration: number;
  setDuration: (duration: number) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  trimmedName: string;
  isNameValid: boolean;
  validation: TriggerValidationResult;
}

export const BasicDetailsCard: React.FC<BasicDetailsCardProps> = ({
  name,
  setName,
  description,
  setDescription,
  duration,
  setDuration,
  enabled,
  setEnabled,
  trimmedName,
  isNameValid,
  validation,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))]">
            Basic Details
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="spawn-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="Enabled"
            />
            <label
              htmlFor="spawn-enabled"
              className="text-sm text-[rgb(var(--color-fg))] cursor-pointer"
            >
              Enabled
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-center gap-2 text-xs">
          {validation.errors.length > 0 ? (
            <span className="px-2 py-0.5 rounded bg-[rgb(var(--color-error-bg))] text-[rgb(var(--color-error))]">
              Invalid
            </span>
          ) : validation.warnings.length > 0 ? (
            <span className="px-2 py-0.5 rounded bg-[rgb(var(--color-warning))]/10 text-[rgb(var(--color-warning))]">
              Warning
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-[rgb(var(--color-success))]/10 text-[rgb(var(--color-success))]">
              Valid
            </span>
          )}
          {validation.warnings.length > 0 && (
            <span className="text-[rgb(var(--color-muted-foreground))]">
              {validation.warnings[0]}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              id="spawn-name"
              type="text"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={
                !trimmedName
                  ? "Name is required"
                  : !isNameValid
                    ? "Name must be unique"
                    : undefined
              }
            />
          </div>

          <div>
            <Input
              id="spawn-duration"
              type="number"
              label="Duration (ms)"
              value={duration}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDuration(val >= 0 ? val : 0);
              }}
              min={0}
              error={duration < 0 ? "Duration must be non-negative" : undefined}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              id="spawn-description"
              type="text"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
