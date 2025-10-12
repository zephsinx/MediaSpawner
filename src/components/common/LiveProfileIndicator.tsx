import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { CheckCircle, Circle } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";

export interface LiveProfileIndicatorProps {
  /** Whether the current profile is live */
  isLive: boolean;
  /** Callback when Set as Live button is clicked */
  onSetLive: () => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Size variant for the indicator */
  size?: "sm" | "md" | "lg";
  /** Whether to show the Set as Live button */
  showButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeConfig = {
  sm: {
    icon: "h-4 w-4",
    container: "h-6 w-6",
    text: "text-xs",
    button: "sm" as const,
  },
  md: {
    icon: "h-5 w-5",
    container: "h-8 w-8",
    text: "text-sm",
    button: "md" as const,
  },
  lg: {
    icon: "h-6 w-6",
    container: "h-10 w-10",
    text: "text-base",
    button: "lg" as const,
  },
} as const;

export function LiveProfileIndicator({
  isLive,
  onSetLive,
  disabled = false,
  size = "md",
  showButton = true,
  className,
}: LiveProfileIndicatorProps) {
  const sizeStyles = sizeConfig[size];
  const IconComponent = isLive ? CheckCircle : Circle;

  const tooltipContent = React.useMemo(() => {
    if (isLive) {
      return "This profile is currently live and being used by Streamer.bot";
    }
    return "This profile is not live. Click 'Set as Live' to make it active in Streamer.bot";
  }, [isLive]);

  const handleSetLive = React.useCallback(() => {
    if (!disabled) {
      onSetLive();
    }
  }, [disabled, onSetLive]);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className="inline-flex items-center gap-2 min-w-[80px]"
            role="status"
            aria-label={`Live status: ${isLive ? "Live" : "Not live"}`}
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-full",
                sizeStyles.container,
                isLive ? "bg-emerald-50" : "bg-gray-50",
              )}
            >
              <IconComponent
                className={cn(
                  sizeStyles.icon,
                  isLive ? "text-emerald-600" : "text-gray-500",
                )}
                aria-hidden="true"
              />
            </div>
            <span
              className={cn(
                "font-medium",
                sizeStyles.text,
                isLive ? "text-emerald-600" : "text-gray-500",
              )}
            >
              {isLive ? "Live" : "Not Live"}
            </span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-50 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] shadow-md max-w-xs"
          >
            <div className="whitespace-pre-line">{tooltipContent}</div>
            <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {showButton && (
        <Button
          variant="outline"
          size={sizeStyles.button}
          onClick={handleSetLive}
          disabled={disabled || isLive}
          className="ml-2 min-w-[100px]"
          aria-label={
            isLive ? "Profile is already live" : "Set this profile as live"
          }
        >
          {isLive ? "Live" : "Set as Live"}
        </Button>
      )}
    </div>
  );
}
