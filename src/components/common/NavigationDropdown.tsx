import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link } from "react-router-dom";
import { ChevronDown, FolderOpen } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";

export interface NavigationDropdownProps {
  /** Optional className for additional styling */
  className?: string;
}

interface NavigationAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  href: string;
}

export function NavigationDropdown({ className }: NavigationDropdownProps) {
  const navigationActions: NavigationAction[] = [
    {
      id: "assets",
      label: "Edit Assets",
      icon: FolderOpen,
      href: "/assets",
    },
  ];

  const primaryAction = navigationActions[0]; // "Edit Assets"
  const dropdownActions = navigationActions.slice(1); // Empty array (no dropdown items)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Primary Action Button */}
      <Button
        variant="outline"
        size="md"
        asChild
        className="min-w-[140px]"
        aria-label={primaryAction.label}
      >
        <Link to={primaryAction.href} className="flex items-center">
          <primaryAction.icon className="h-4 w-4 mr-2" aria-hidden={true} />
          {primaryAction.label}
        </Link>
      </Button>

      {/* Dropdown Menu */}
      {dropdownActions.length > 0 && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              variant="outline"
              size="md"
              className="px-2"
              aria-label="Additional navigation options"
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
              aria-label="Navigation options"
            >
              {/* Action Items */}
              {dropdownActions.map((action) => {
                const Icon = action.icon;

                return (
                  <DropdownMenu.Item
                    key={action.id}
                    className={cn(
                      "flex items-center w-full px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors",
                      // Radix keyboard navigation highlight - use darker background in dark mode for better contrast
                      "data-[highlighted]:bg-[rgb(var(--color-muted))] dark:data-[highlighted]:bg-[rgb(var(--color-border))] data-[highlighted]:text-[rgb(var(--color-fg))]",
                      // Hover state
                      "hover:bg-[rgb(var(--color-muted))] dark:hover:bg-[rgb(var(--color-border))] hover:text-[rgb(var(--color-fg))]",
                      // Focus state (fallback)
                      "focus:bg-[rgb(var(--color-muted))] dark:focus:bg-[rgb(var(--color-border))] focus:text-[rgb(var(--color-fg))] focus:outline-none",
                    )}
                    asChild
                  >
                    <Link
                      to={action.href}
                      className="flex items-center space-x-2 w-full"
                      role="menuitem"
                      aria-label={action.label}
                    >
                      <Icon className="h-4 w-4" aria-hidden={true} />
                      <span>{action.label}</span>
                    </Link>
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
}
