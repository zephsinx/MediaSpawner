import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

interface FieldTooltipProps {
  content: string;
}

export function FieldTooltip({ content }: FieldTooltipProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex items-center justify-center ml-1.5 text-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-fg))] transition-colors"
          aria-label="More information"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] shadow-md max-w-xs"
        >
          {content}
          <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
