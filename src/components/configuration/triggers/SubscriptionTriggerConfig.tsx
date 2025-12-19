import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/Card";
import { Input } from "../../ui/Input";
import { getSubscriptionConfig } from "./triggerConfigHelpers";
import type { Trigger } from "../../../types/spawn";
import type { TriggerValidationResult } from "../../../utils/triggerValidation";

interface SubscriptionTriggerConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
  validation: TriggerValidationResult;
}

export const SubscriptionTriggerConfig: React.FC<
  SubscriptionTriggerConfigProps
> = ({ trigger, setTrigger, validation }) => {
  const config = getSubscriptionConfig(trigger);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
          Subscription Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              id="sub-tier"
              type="select"
              label="Tier"
              value={config?.tier ?? ""}
              onChange={(e) => {
                const v = (e.target.value || undefined) as
                  | "1000"
                  | "2000"
                  | "3000"
                  | undefined;
                setTrigger({
                  ...trigger,
                  config: {
                    ...config,
                    tier: v,
                  },
                } as Trigger);
              }}
            >
              <option value="">Any</option>
              <option value="1000">Tier 1</option>
              <option value="2000">Tier 2</option>
              <option value="3000">Tier 3</option>
            </Input>
          </div>
          <div>
            <Input
              id="sub-months-comparator"
              type="select"
              label="Months Comparator"
              value={config?.monthsComparator ?? ""}
              onChange={(e) => {
                const v = (e.target.value || undefined) as
                  | "lt"
                  | "eq"
                  | "gt"
                  | undefined;
                setTrigger({
                  ...trigger,
                  config: {
                    ...config,
                    monthsComparator: v,
                  },
                } as Trigger);
              }}
              error={validation.fieldErrors.monthsComparator?.[0]}
            >
              <option value="">- Select -</option>
              <option value="lt">Less than</option>
              <option value="eq">Equal to</option>
              <option value="gt">Greater than</option>
            </Input>
          </div>
          <div>
            <Input
              id="sub-months"
              type="number"
              label="Months"
              min={1}
              value={config?.months ?? ""}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value) || 1);
                setTrigger({
                  ...trigger,
                  config: {
                    ...config,
                    months: val,
                  },
                } as Trigger);
              }}
              error={validation.fieldErrors.months?.[0]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
