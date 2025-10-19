import * as React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  HelpCircle,
  WifiOff,
} from "lucide-react";
import { cn } from "../../utils/cn";
import type { SyncStatusInfo } from "../../types/sync";

export interface SyncStatusIndicatorProps {
  statusInfo: SyncStatusInfo;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  synced: {
    icon: CheckCircle,
    color: "text-[rgb(var(--color-success))]",
    bgColor: "bg-[rgb(var(--color-success-bg))]",
    label: "Synced",
    description: "Configuration is synchronized with Streamer.bot",
  },
  "out-of-sync": {
    icon: AlertCircle,
    color: "text-[rgb(var(--color-warning))]",
    bgColor: "bg-[rgb(var(--color-warning))]/10",
    label: "Out of sync",
    description: "Local configuration differs from Streamer.bot",
  },
  error: {
    icon: XCircle,
    color: "text-[rgb(var(--color-error))]",
    bgColor: "bg-[rgb(var(--color-error-bg))]",
    label: "Error",
    description: "Failed to check sync status",
  },
  unknown: {
    icon: HelpCircle,
    color: "text-[rgb(var(--color-muted-foreground))]",
    bgColor: "bg-[rgb(var(--color-muted))]/10",
    label: "Unknown",
    description: "Sync status not yet determined",
  },
  offline: {
    icon: WifiOff,
    color: "text-[rgb(var(--color-muted-foreground))]",
    bgColor: "bg-[rgb(var(--color-muted))]/10",
    label: "Offline",
    description: "Not connected to Streamer.bot",
  },
} as const;

const sizeConfig = {
  sm: {
    icon: "h-4 w-4",
    container: "h-6 w-6",
    text: "text-xs",
  },
  md: {
    icon: "h-5 w-5",
    container: "h-8 w-8",
    text: "text-sm",
  },
  lg: {
    icon: "h-6 w-6",
    container: "h-10 w-10",
    text: "text-base",
  },
} as const;

export function SyncStatusIndicator({
  statusInfo,
  size = "md",
  showLabel = false,
  className,
}: SyncStatusIndicatorProps) {
  const config = statusConfig[statusInfo.status];
  const sizeStyles = sizeConfig[size];
  const IconComponent = config.icon;

  const tooltipContent = React.useMemo(() => {
    const parts: string[] = [config.description];

    if (statusInfo.lastChecked) {
      const timeAgo = getTimeAgo(statusInfo.lastChecked);
      parts.push(`Last checked: ${timeAgo}`);
    }

    if (statusInfo.errorMessage) {
      parts.push(`Error: ${statusInfo.errorMessage}`);
    }

    return parts.join("\n");
  }, [config.description, statusInfo.lastChecked, statusInfo.errorMessage]);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div
          className={cn("inline-flex items-center gap-2", className)}
          role="status"
          aria-label={`Sync status: ${config.label}`}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-full",
              sizeStyles.container,
              config.bgColor,
            )}
          >
            <IconComponent
              className={cn(sizeStyles.icon, config.color)}
              aria-hidden="true"
            />
          </div>
          {showLabel && (
            <span className={cn("font-medium", sizeStyles.text, config.color)}>
              {config.label}
            </span>
          )}
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
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}
