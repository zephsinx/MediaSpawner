import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/Card";
import { Input } from "../../ui/Input";
import { getGiftSubConfig } from "./triggerConfigHelpers";
import type { Trigger } from "../../../types/spawn";

interface GiftSubTriggerConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
}

export const GiftSubTriggerConfig: React.FC<GiftSubTriggerConfigProps> = ({
  trigger,
  setTrigger,
}) => {
  const config = getGiftSubConfig(trigger);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
          Gifted Subs Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              id="gift-min-count"
              type="number"
              label="Minimum Count"
              min={1}
              value={config?.minCount ?? ""}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value) || 1);
                setTrigger({
                  ...trigger,
                  config: {
                    ...config,
                    minCount: val,
                  },
                } as Trigger);
              }}
            />
          </div>
          <div>
            <Input
              id="gift-tier"
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
        </div>
      </CardContent>
    </Card>
  );
};
