import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  HelpCircle,
  WifiOff,
  Wifi,
  Server,
  RefreshCw,
  Upload,
  Eye,
  RotateCw,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";
import { StreamerbotService } from "../../services/streamerbotService";
import type { StreamerbotConnectionStatus } from "../../services/streamerbotService";
import type { SyncStatusInfo } from "../../types/sync";
import { toast } from "sonner";
import { ConfigViewerModal } from "./ConfigViewerModal";

export interface CombinedStatusBadgeProps {
  connectionStatus: StreamerbotConnectionStatus;
  syncStatus: SyncStatusInfo;
  onSyncStatusChange?: (status: SyncStatusInfo) => void;
  className?: string;
}

const connectionConfig = {
  connected: {
    icon: Server,
    color: "text-[rgb(var(--color-success))]",
    bgColor: "bg-[rgb(var(--color-success))]",
    label: "Connected",
    description: "Connected to Streamer.bot",
  },
  connecting: {
    icon: Wifi,
    color: "text-[rgb(var(--color-warning))]",
    bgColor: "bg-[rgb(var(--color-warning))]",
    label: "Connecting",
    description: "Connecting to Streamer.bot",
  },
  disconnected: {
    icon: WifiOff,
    color: "text-[rgb(var(--color-error))]",
    bgColor: "bg-[rgb(var(--color-error))]",
    label: "Disconnected",
    description: "Not connected to Streamer.bot",
  },
  error: {
    icon: XCircle,
    color: "text-[rgb(var(--color-error))]",
    bgColor: "bg-[rgb(var(--color-error))]",
    label: "Error",
    description: "Connection error",
  },
} as const;

const syncConfig = {
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

export function CombinedStatusBadge({
  connectionStatus,
  syncStatus,
  onSyncStatusChange,
  className,
}: CombinedStatusBadgeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = React.useState(false);

  // Subscribe to sync status changes
  React.useEffect(() => {
    const unsubscribe = StreamerbotService.subscribeToSyncStatus((status) => {
      onSyncStatusChange?.(status);
    });

    return unsubscribe;
  }, [onSyncStatusChange]);

  const connectionState = connectionStatus.state;
  const connectionInfo = connectionConfig[connectionState];

  const syncInfo = syncConfig[syncStatus.status];
  const SyncIcon = syncInfo.icon;

  const handleReconnect = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setActionLoading("reconnect");

    try {
      StreamerbotService.connectIfNeeded();
      toast.info("Reconnecting", {
        description: "Attempting to reconnect to Streamer.bot",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error("Reconnect failed", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      setActionLoading(null);
    }
  };

  const handleSyncConfig = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setActionLoading("sync");

    try {
      const result = await StreamerbotService.pushConfiguration();

      if (result.success) {
        toast.success("Configuration synced successfully", {
          description:
            "Your MediaSpawner configuration has been pushed to Streamer.bot",
        });
      } else {
        toast.error("Sync failed", {
          description: result.error || "An unknown error occurred",
          action: syncStatus.canRetry
            ? {
                label: "Retry",
                onClick: () => handleSyncConfig(),
              }
            : undefined,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error("Sync failed", {
        description: errorMessage,
        action: {
          label: "Retry",
          onClick: () => handleSyncConfig(),
        },
      });
    } finally {
      setIsLoading(false);
      setActionLoading(null);
    }
  };

  const handleCheckStatus = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setActionLoading("check");

    try {
      const result = await StreamerbotService.checkConfigSyncStatus();

      if (result.success) {
        const status = result.statusInfo?.status || "unknown";
        const statusLabel =
          syncConfig[status as SyncStatusInfo["status"]].label;
        toast.info("Status checked", {
          description: `Current sync status: ${statusLabel}`,
        });
      } else {
        toast.error("Status check failed", {
          description: result.error || "An unknown error occurred",
          action: {
            label: "Retry",
            onClick: () => handleCheckStatus(),
          },
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error("Status check failed", {
        description: errorMessage,
        action: {
          label: "Retry",
          onClick: () => handleCheckStatus(),
        },
      });
    } finally {
      setIsLoading(false);
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setActionLoading("refresh");

    try {
      const result = await StreamerbotService.checkConfigSyncStatus();

      if (result.success) {
        const status = result.statusInfo?.status || "unknown";
        const statusLabel =
          syncConfig[status as SyncStatusInfo["status"]].label;
        toast.info("Status refreshed", {
          description: `Sync status updated: ${statusLabel}`,
        });
      } else {
        toast.error("Refresh failed", {
          description: result.error || "An unknown error occurred",
          action: {
            label: "Retry",
            onClick: () => handleRefresh(),
          },
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error("Refresh failed", {
        description: errorMessage,
        action: {
          label: "Retry",
          onClick: () => handleRefresh(),
        },
      });
    } finally {
      setIsLoading(false);
      setActionLoading(null);
    }
  };

  const getSyncStatusColor = (status: SyncStatusInfo["status"]) => {
    switch (status) {
      case "synced":
        return "text-[rgb(var(--color-success))]";
      case "out-of-sync":
        return "text-[rgb(var(--color-warning))]";
      case "error":
        return "text-[rgb(var(--color-error))]";
      case "offline":
        return "text-[rgb(var(--color-muted-foreground))]";
      default:
        return "text-[rgb(var(--color-muted-foreground))]";
    }
  };

  return (
    <>
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--color-surface-2))] px-2 py-1 text-xs text-[rgb(var(--color-muted-foreground))]",
              "focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2",
              "hover:bg-[rgb(var(--color-muted))]/20",
              "transition-colors",
              className,
            )}
            aria-label="Streamer.bot connection and sync status"
            role="button"
            type="button"
          >
            {/* Primary connection indicator */}
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full",
                connectionInfo.bgColor,
                connectionState === "connecting" && "animate-pulse",
              )}
              aria-hidden="true"
            />
            {/* Secondary sync indicator */}
            <SyncIcon
              className={cn("h-3 w-3", syncInfo.color)}
              aria-hidden="true"
            />
            <span className="font-medium">SB</span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className={cn(
              "z-50 w-80 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] shadow-md p-2",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            )}
            sideOffset={6}
          >
            <div className="space-y-3">
              {/* Connection Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[rgb(var(--color-fg))]">
                    Connection
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        connectionInfo.bgColor,
                        connectionState === "connecting" && "animate-pulse",
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        connectionInfo.color,
                      )}
                    >
                      {connectionInfo.label}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                  {connectionStatus.host}:{connectionStatus.port}
                </div>
                {connectionStatus.errorMessage && (
                  <div className="text-xs text-[rgb(var(--color-error))]">
                    {connectionStatus.errorMessage}
                  </div>
                )}
                {(connectionState === "disconnected" ||
                  connectionState === "error") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReconnect}
                    disabled={isLoading || actionLoading === "reconnect"}
                    className="w-full"
                  >
                    {actionLoading === "reconnect" ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Reconnecting...
                      </>
                    ) : (
                      <>
                        <RotateCw className="h-3 w-3 mr-2" />
                        Reconnect
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-[rgb(var(--color-border))]" />

              {/* Sync Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[rgb(var(--color-fg))]">
                    Sync Status
                  </h3>
                  <div className="flex items-center gap-2">
                    <SyncIcon
                      className={cn("h-4 w-4", syncInfo.color)}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        getSyncStatusColor(syncStatus.status),
                      )}
                    >
                      {syncInfo.label}
                    </span>
                  </div>
                </div>
                {syncStatus.lastChecked && (
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    Last checked: {getTimeAgo(syncStatus.lastChecked)}
                  </div>
                )}
                {syncStatus.errorMessage && (
                  <div className="text-xs text-[rgb(var(--color-error))]">
                    {syncStatus.errorMessage}
                  </div>
                )}

                {/* Sync Actions */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSyncConfig}
                    disabled={
                      isLoading ||
                      actionLoading === "sync" ||
                      syncStatus.status === "offline"
                    }
                    className="w-full"
                  >
                    {actionLoading === "sync" ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-2" />
                        Sync config
                      </>
                    )}
                  </Button>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckStatus}
                      disabled={isLoading || actionLoading === "check"}
                      className="flex-1"
                    >
                      {actionLoading === "check" ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1.5" />
                          Check
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isLoading || actionLoading === "refresh"}
                      className="flex-1"
                    >
                      {actionLoading === "refresh" ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1.5" />
                          Refresh
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConfigModal(true)}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <Popover.Arrow className="fill-[rgb(var(--color-bg))]" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Config Viewer Modal */}
      <ConfigViewerModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </>
  );
}
