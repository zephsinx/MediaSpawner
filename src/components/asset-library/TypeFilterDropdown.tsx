import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Image, Video, Music, FileText } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";

export type AssetTypeFilter = "all" | "image" | "video" | "audio";

export interface TypeFilterDropdownProps {
  currentFilter: AssetTypeFilter;
  onFilterChange: (filter: AssetTypeFilter) => void;
  typeCounts: {
    all: number;
    image: number;
    video: number;
    audio: number;
  };
  className?: string;
}

const filterOptions = [
  {
    value: "all" as const,
    label: "All",
    icon: FileText,
    getCount: (counts: TypeFilterDropdownProps["typeCounts"]) => counts.all,
  },
  {
    value: "image" as const,
    label: "Images",
    icon: Image,
    getCount: (counts: TypeFilterDropdownProps["typeCounts"]) => counts.image,
  },
  {
    value: "video" as const,
    label: "Videos",
    icon: Video,
    getCount: (counts: TypeFilterDropdownProps["typeCounts"]) => counts.video,
  },
  {
    value: "audio" as const,
    label: "Audio",
    icon: Music,
    getCount: (counts: TypeFilterDropdownProps["typeCounts"]) => counts.audio,
  },
];

export function TypeFilterDropdown({
  currentFilter,
  onFilterChange,
  typeCounts,
  className,
}: TypeFilterDropdownProps) {
  const currentOption = filterOptions.find(
    (option) => option.value === currentFilter,
  );
  const CurrentIcon = currentOption?.icon || FileText;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between min-w-[140px] h-9 px-3", className)}
          aria-label={`Filter assets by type. Current: ${currentOption?.label}`}
          aria-haspopup="menu"
          aria-expanded="false"
        >
          <div className="flex items-center space-x-2">
            <CurrentIcon className="h-4 w-4" aria-hidden="true" />
            <span>{currentOption?.label}</span>
          </div>
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
          aria-label="Asset type filter options"
        >
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const count = option.getCount(typeCounts);
            const isSelected = currentFilter === option.value;

            return (
              <DropdownMenu.Item
                key={option.value}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors",
                  "focus:bg-[rgb(var(--color-muted))] focus:text-[rgb(var(--color-fg))] focus:outline-none",
                  "hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-fg))]",
                  isSelected &&
                    "bg-[rgb(var(--color-accent))]/10 text-[rgb(var(--color-accent))]",
                )}
                onSelect={() => onFilterChange(option.value)}
                role="menuitemradio"
                aria-checked={isSelected}
                aria-label={`Filter by ${option.label} (${count} assets)`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{option.label}</span>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    isSelected
                      ? "bg-[rgb(var(--color-accent))] text-[rgb(var(--color-accent-foreground))]"
                      : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]",
                  )}
                  aria-label={`${count} assets`}
                >
                  {count}
                </span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
