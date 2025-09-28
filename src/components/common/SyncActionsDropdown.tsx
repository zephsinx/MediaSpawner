import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Upload, RefreshCw, CheckCircle } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";
import { StreamerbotService } from "../../services/streamerbotService";
import type { SyncStatusInfo } from "../../types/sync";
import { toast } from "sonner";

export interface SyncActionsDropdownProps {
  syncStatus: SyncStatusInfo;
  onSyncStatusChange?: (status: SyncStatusInfo) => void;
  className?: string;
}

interface SyncAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  action: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

export function SyncActionsDropdown({
  syncStatus,
  onSyncStatusChange,
  className,
}: SyncActionsDropdownProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const getStatusLabel = (status: SyncStatusInfo["status"]) => {
    switch (status) {
      case "synced":
        return "Synced";
      case "out-of-sync":
        return "Out of sync";
      case "error":
        return "Error";
      case "offline":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  // Subscribe to sync status changes
  React.useEffect(() => {
    const unsubscribe = StreamerbotService.subscribeToSyncStatus((status) => {
      onSyncStatusChange?.(status);
    });

    return unsubscribe;
  }, [onSyncStatusChange]);

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
        const statusLabel = getStatusLabel(status as SyncStatusInfo["status"]);
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
      // Force a fresh status check
      const result = await StreamerbotService.checkConfigSyncStatus();

      if (result.success) {
        const status = result.statusInfo?.status || "unknown";
        const statusLabel = getStatusLabel(status as SyncStatusInfo["status"]);
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

  const syncActions: SyncAction[] = [
    {
      id: "sync",
      label: "Sync config",
      icon: Upload,
      action: handleSyncConfig,
      disabled: isLoading || syncStatus.status === "offline",
      loading: actionLoading === "sync",
    },
    {
      id: "check",
      label: "Check status",
      icon: CheckCircle,
      action: handleCheckStatus,
      disabled: isLoading,
      loading: actionLoading === "check",
    },
    {
      id: "refresh",
      label: "Refresh",
      icon: RefreshCw,
      action: handleRefresh,
      disabled: isLoading,
      loading: actionLoading === "refresh",
    },
  ];

  const primaryAction = syncActions[0]; // "Sync config"
  const dropdownActions = syncActions.slice(1); // "Check status" and "Refresh"

  const getStatusColor = (status: SyncStatusInfo["status"]) => {
    switch (status) {
      case "synced":
        return "text-emerald-600";
      case "out-of-sync":
        return "text-amber-600";
      case "error":
        return "text-red-600";
      case "offline":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Primary Action Button */}
      <Button
        variant="primary"
        size="md"
        onClick={primaryAction.action}
        disabled={primaryAction.disabled || primaryAction.loading}
        className="min-w-[120px]"
        aria-label={`${primaryAction.label}. Current status: ${getStatusLabel(
          syncStatus.status
        )}`}
      >
        {primaryAction.loading ? (
          <RefreshCw className="h-4 w-4 animate-spin mr-2" aria-hidden={true} />
        ) : (
          <primaryAction.icon className="h-4 w-4 mr-2" aria-hidden={true} />
        )}
        {primaryAction.label}
      </Button>

      {/* Dropdown Menu */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="outline"
            size="md"
            disabled={isLoading}
            className="px-2"
            aria-label="Additional sync actions"
            aria-haspopup="menu"
            aria-expanded="false"
          >
            <ChevronDown className="h-4 w-4" aria-hidden={true} />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={cn(
              "min-w-[160px] bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] rounded-md shadow-lg p-1 z-50",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            )}
            sideOffset={4}
            role="menu"
            aria-label="Sync action options"
          >
            {/* Status Display */}
            <div className="px-3 py-2 text-xs text-[rgb(var(--color-muted-foreground))] border-b border-[rgb(var(--color-border))] mb-1">
              <div className="flex items-center gap-2">
                <div
                  className={cn("w-2 h-2 rounded-full", {
                    "bg-emerald-500": syncStatus.status === "synced",
                    "bg-amber-500": syncStatus.status === "out-of-sync",
                    "bg-red-500": syncStatus.status === "error",
                    "bg-gray-400":
                      syncStatus.status === "offline" ||
                      syncStatus.status === "unknown",
                  })}
                  aria-hidden={true}
                />
                <span
                  className={cn(
                    "font-medium",
                    getStatusColor(syncStatus.status)
                  )}
                >
                  {getStatusLabel(syncStatus.status)}
                </span>
              </div>
              {syncStatus.lastChecked && (
                <div className="text-xs text-[rgb(var(--color-muted-foreground))] mt-1">
                  Last checked:{" "}
                  {new Date(syncStatus.lastChecked).toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Action Items */}
            {dropdownActions.map((action) => {
              const Icon = action.icon;
              const isActionLoading = action.loading;

              return (
                <DropdownMenu.Item
                  key={action.id}
                  className={cn(
                    "flex items-center w-full px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors",
                    "focus:bg-[rgb(var(--color-muted))] focus:text-[rgb(var(--color-fg))] focus:outline-none",
                    "hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-fg))]",
                    action.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!action.disabled && !isActionLoading) {
                      action.action();
                    }
                  }}
                  role="menuitem"
                  aria-label={action.label}
                  disabled={action.disabled}
                >
                  <div className="flex items-center space-x-2">
                    {isActionLoading ? (
                      <RefreshCw
                        className="h-4 w-4 animate-spin"
                        aria-hidden={true}
                      />
                    ) : (
                      <Icon className="h-4 w-4" aria-hidden={true} />
                    )}
                    <span>{action.label}</span>
                  </div>
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
