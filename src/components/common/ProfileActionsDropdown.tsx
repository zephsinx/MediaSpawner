import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Plus, Edit, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";

export interface ProfileActionsDropdownProps {
  /** Whether a profile is currently selected */
  hasActiveProfile: boolean;
  /** Callback for creating a new profile */
  onCreateProfile: () => void;
  /** Callback for editing the active profile */
  onEditProfile: () => void;
  /** Callback for deleting the active profile */
  onDeleteProfile: () => void;
  /** Optional className for additional styling */
  className?: string;
}

interface ProfileAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  action: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "destructive";
}

export function ProfileActionsDropdown({
  hasActiveProfile,
  onCreateProfile,
  onEditProfile,
  onDeleteProfile,
  className,
}: ProfileActionsDropdownProps) {
  const profileActions: ProfileAction[] = [
    {
      id: "create",
      label: "Create Profile",
      icon: Plus,
      action: onCreateProfile,
      disabled: false,
      variant: "primary",
    },
    {
      id: "edit",
      label: "Edit Profile",
      icon: Edit,
      action: onEditProfile,
      disabled: !hasActiveProfile,
      variant: "secondary",
    },
    {
      id: "delete",
      label: "Delete Profile",
      icon: Trash2,
      action: onDeleteProfile,
      disabled: !hasActiveProfile,
      variant: "destructive",
    },
  ];

  const primaryAction = profileActions[0]; // "Create Profile"
  const dropdownActions = profileActions.slice(1); // "Edit Profile" and "Delete Profile"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Primary Action Button */}
      <Button
        variant="primary"
        size="md"
        onClick={primaryAction.action}
        disabled={primaryAction.disabled}
        className="min-w-[120px]"
        aria-label={primaryAction.label}
      >
        <primaryAction.icon className="h-4 w-4 mr-2" aria-hidden={true} />
        {primaryAction.label}
      </Button>

      {/* Dropdown Menu */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="outline"
            size="md"
            className="px-2"
            aria-label="Additional profile actions"
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
              "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            )}
            sideOffset={4}
            role="menu"
            aria-label="Profile action options"
          >
            {/* Action Items */}
            {dropdownActions.map((action) => {
              const Icon = action.icon;

              return (
                <DropdownMenu.Item
                  key={action.id}
                  className={cn(
                    "flex items-center w-full px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors",
                    "focus:bg-[rgb(var(--color-muted))] focus:text-[rgb(var(--color-fg))] focus:outline-none",
                    "hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-fg))]",
                    action.disabled && "opacity-50 cursor-not-allowed",
                    action.variant === "destructive" &&
                      "text-[rgb(var(--color-error))] hover:text-[rgb(var(--color-error))] hover:bg-[rgb(var(--color-error-bg))]",
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!action.disabled) {
                      action.action();
                    }
                  }}
                  role="menuitem"
                  aria-label={action.label}
                  disabled={action.disabled}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" aria-hidden={true} />
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
