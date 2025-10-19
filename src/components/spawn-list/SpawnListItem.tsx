import React from "react";
import type { Spawn } from "../../types/spawn";
import {
  getTriggerTypeLabel,
  getTriggerAbbrev,
  getTriggerTooltip,
  getTriggerScheduleLabel,
  getOverallStatusLabel,
} from "../../utils/triggerDisplay";
import { Switch } from "../ui/Switch";
import { Button } from "../ui/Button";
import { StreamerbotService } from "../../services/streamerbotService";
import { toast } from "sonner";
import * as Tooltip from "@radix-ui/react-tooltip";

/**
 * Props for the spawn list item component
 */
export interface SpawnListItemProps {
  /** The spawn to display */
  spawn: Spawn;
  /** Whether this spawn is currently selected */
  isSelected?: boolean;
  /** Callback when spawn is clicked */
  onClick?: (spawn: Spawn) => void;
  /** Callback when spawn toggle is clicked */
  onToggle?: (spawn: Spawn) => void;
  /** Whether the toggle is currently processing (deprecated - kept for compatibility) */
  isToggleProcessing?: boolean;
  /** Optional className for additional styling */
  className?: string;
  /** Optional ref to the root element for keyboard focus management */
  itemRef?: React.Ref<HTMLDivElement>;
}

/**
 * Individual spawn item component for the spawn list
 */
const SpawnListItem: React.FC<SpawnListItemProps> = ({
  spawn,
  isSelected = false,
  onClick,
  onToggle,
  isToggleProcessing = false,
  className = "",
  itemRef,
}) => {
  const [isTesting, setIsTesting] = React.useState(false);

  const handleClick = () => {
    onClick?.(spawn);
  };

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onToggle?.(spawn);
  };

  const handleToggleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle(e);
    }
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isTesting) return;

    setIsTesting(true);

    try {
      const success = await StreamerbotService.testSpawn(spawn.id);

      if (success) {
        toast.success(`Successfully tested spawn: ${spawn.name}`);
      } else {
        toast.error(`Failed to test spawn: ${spawn.name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Error testing spawn: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      ref={itemRef}
      className={`p-3 border-b border-[rgb(var(--color-border))] cursor-pointer transition-colors hover:bg-[rgb(var(--color-muted))]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 ${
        isSelected
          ? "bg-[rgb(var(--color-accent))]/5 border-[rgb(var(--color-accent))]"
          : ""
      } ${!spawn.enabled ? "opacity-60" : ""} ${className}`}
      onClick={handleClick}
      role="option"
      tabIndex={isSelected ? 0 : -1}
      aria-selected={isSelected}
      aria-label={`Spawn: ${spawn.name}. ${
        spawn.enabled ? "Enabled" : "Disabled"
      }. ${spawn.assets.length} asset${
        spawn.assets.length !== 1 ? "s" : ""
      }. ${getTriggerTypeLabel(spawn.trigger)} trigger.`}
      aria-describedby={`spawn-${spawn.id}-description`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Spawn Name and Toggle */}
      <div className="flex items-center justify-between mb-1">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <h3 className="font-medium text-[rgb(var(--color-fg))] truncate flex-1 cursor-default">
              {spawn.name}
            </h3>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              sideOffset={6}
              className="z-50 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] shadow-md max-w-xs"
            >
              <div className="whitespace-pre-line">{spawn.name}</div>
              <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
        <div className="flex items-center gap-2 ml-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isTesting}
            loading={isTesting}
            aria-label="Test spawn"
          >
            Test
          </Button>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div
                onClick={handleToggle}
                onKeyDown={handleToggleKeyDown}
                className="cursor-pointer"
                tabIndex={0}
                aria-label={`Toggle enabled state for ${spawn.name} (opens editor)`}
                aria-describedby={`spawn-${spawn.id}-toggle-description`}
              >
                <Switch checked={spawn.enabled} disabled={false} size="md" />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={6}
                className="z-50 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] shadow-md"
              >
                <div>Click to edit enabled state for {spawn.name}</div>
                <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </div>

      {/* Spawn Description */}
      {spawn.description && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))] truncate mb-2 cursor-default">
              {spawn.description}
            </p>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              sideOffset={6}
              className="z-50 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] shadow-md max-w-xs"
            >
              <div className="whitespace-pre-line">{spawn.description}</div>
              <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}

      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="flex items-center text-xs text-[rgb(var(--color-muted))] cursor-default">
            {/* Type badge */}
            <span className="mr-2 inline-flex items-center px-1.5 py-0.5 rounded bg-[rgb(var(--color-muted))]/10 text-[rgb(var(--color-fg))] border border-[rgb(var(--color-border))]">
              {getTriggerTypeLabel(spawn.trigger)}
            </span>
            {/* Abbreviated info */}
            <span className="mr-3 truncate max-w-[40%]">
              {getTriggerAbbrev(spawn.trigger)}
            </span>
            {/* Scheduled label if applicable */}
            {getTriggerScheduleLabel(spawn.trigger) && (
              <span className="mr-3 text-[rgb(var(--color-muted-foreground))]">
                {getTriggerScheduleLabel(spawn.trigger)}
              </span>
            )}
            {/* Assets count */}
            <span className="mr-3">
              {spawn.assets.length} asset{spawn.assets.length !== 1 ? "s" : ""}
            </span>
            {/* Overall status */}
            <span>{getOverallStatusLabel(spawn)}</span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-50 rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] px-3 py-2 text-sm text-[rgb(var(--color-fg))] shadow-md max-w-xs"
          >
            <div className="whitespace-pre-line">
              {getTriggerTooltip(spawn.trigger)}
            </div>
            <Tooltip.Arrow className="fill-[rgb(var(--color-bg))]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* Screen reader descriptions */}
      <div id={`spawn-${spawn.id}-description`} className="sr-only">
        {spawn.description && `Description: ${spawn.description}. `}
        Trigger: {getTriggerTooltip(spawn.trigger)}. Status:{" "}
        {getOverallStatusLabel(spawn)}.
      </div>
      <div id={`spawn-${spawn.id}-toggle-description`} className="sr-only">
        Toggle to {spawn.enabled ? "disable" : "enable"} this spawn.
        {isToggleProcessing && "Processing request..."}
      </div>
    </div>
  );
};

export default SpawnListItem;
