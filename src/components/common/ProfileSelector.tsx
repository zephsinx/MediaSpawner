import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";
import type { SpawnProfile } from "../../types/spawn";

export interface ProfileSelectorProps {
  profiles: SpawnProfile[];
  selectedProfileId: string | undefined;
  onProfileChange: (profileId: string) => void;
  className?: string;
}

export function ProfileSelector({
  profiles,
  selectedProfileId,
  onProfileChange,
  className,
}: ProfileSelectorProps) {
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between min-w-[150px]", className)}
          aria-label={`Select profile. Current: ${selectedProfile?.name || "None"}`}
          aria-haspopup="menu"
          aria-expanded="false"
        >
          <span className="truncate">
            {selectedProfile?.name || "Select profile"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[200px] bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] rounded-md shadow-lg p-1 z-50",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          )}
          sideOffset={4}
          role="menu"
          aria-label="Profile selection options"
        >
          {profiles.map((profile) => {
            const isSelected = selectedProfileId === profile.id;
            return (
              <DropdownMenu.Item
                key={profile.id}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors",
                  // Radix keyboard navigation highlight - use darker background in dark mode for better contrast
                  "data-[highlighted]:bg-[rgb(var(--color-muted))] dark:data-[highlighted]:bg-[rgb(var(--color-border))] data-[highlighted]:text-[rgb(var(--color-fg))]",
                  // Hover state
                  "hover:bg-[rgb(var(--color-muted))] dark:hover:bg-[rgb(var(--color-border))] hover:text-[rgb(var(--color-fg))]",
                  // Focus state (fallback)
                  "focus:bg-[rgb(var(--color-muted))] dark:focus:bg-[rgb(var(--color-border))] focus:text-[rgb(var(--color-fg))] focus:outline-none",
                  // Selected state
                  isSelected &&
                    "bg-[rgb(var(--color-accent))]/10 text-[rgb(var(--color-accent))]",
                )}
                onSelect={() => onProfileChange(profile.id)}
                role="menuitemradio"
                aria-checked={isSelected}
                aria-label={`Select ${profile.name}${profile.description ? ` - ${profile.description}` : ""}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{profile.name}</div>
                    {profile.description && (
                      <div className="text-xs text-[rgb(var(--color-muted-foreground))] truncate">
                        {profile.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check
                      className="h-4 w-4 ml-2 flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
