import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/Card";
import { Input } from "../../ui/Input";
import { getCheerConfig } from "./triggerConfigHelpers";
import type { Trigger } from "../../../types/spawn";
import type { TriggerValidationResult } from "../../../utils/triggerValidation";

interface CheerTriggerConfigProps {
  trigger: Trigger;
  setTrigger: (trigger: Trigger) => void;
  validation: TriggerValidationResult;
}

export const CheerTriggerConfig: React.FC<CheerTriggerConfigProps> = ({
  trigger,
  setTrigger,
  validation,
}) => {
  const config = getCheerConfig(trigger);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
          Cheer Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              id="cheer-bits-comparator"
              type="select"
              label="Bits Comparator"
              value={config?.bitsComparator ?? ""}
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
                    bitsComparator: v,
                  },
                } as Trigger);
              }}
              error={validation.fieldErrors.bitsComparator?.[0]}
            >
              <option value="">- Select -</option>
              <option value="lt">Less than</option>
              <option value="eq">Equal to</option>
              <option value="gt">Greater than</option>
            </Input>
          </div>
          <div>
            <Input
              id="cheer-bits"
              type="number"
              label="Bits"
              min={1}
              value={config?.bits ?? ""}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value) || 1);
                setTrigger({
                  ...trigger,
                  config: {
                    ...config,
                    bits: val,
                  },
                } as Trigger);
              }}
              error={validation.fieldErrors.bits?.[0]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
