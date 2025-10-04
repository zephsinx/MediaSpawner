import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { buttonVariants } from "../ui/variants";
import { cn } from "../../utils/cn";

export interface SettingsButtonProps {
  /** Optional className for additional styling */
  className?: string;
}

export function SettingsButton({ className }: SettingsButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Link
          to="/settings"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-8 w-8 p-0 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-fg))]",
            className
          )}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] shadow-md"
        >
          <div>Settings</div>
          <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

SettingsButton.displayName = "SettingsButton";
