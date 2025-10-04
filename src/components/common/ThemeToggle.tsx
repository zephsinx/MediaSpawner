import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Switch } from "../ui/Switch";
import { SettingsService } from "../../services/settingsService";
import { cn } from "../../utils/cn";

export interface ThemeToggleProps {
  className?: string;
}

type ThemeMode = "light" | "dark" | "system";

const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_LABELS = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const [currentModeIndex, setCurrentModeIndex] = React.useState(0);

  // Initialize theme mode from settings
  React.useEffect(() => {
    const currentMode = SettingsService.getThemeMode();
    const modeIndex = THEME_MODES.indexOf(currentMode);
    setCurrentModeIndex(modeIndex >= 0 ? modeIndex : 0);
  }, []);

  const handleToggle = React.useCallback(() => {
    const nextIndex = (currentModeIndex + 1) % THEME_MODES.length;
    const nextMode = THEME_MODES[nextIndex];

    setCurrentModeIndex(nextIndex);

    // Update settings and apply theme
    const result = SettingsService.setThemeMode(nextMode);
    if (!result.success) {
      console.error("Failed to set theme mode:", result.error);
      // Revert on error
      setCurrentModeIndex(currentModeIndex);
    }
  }, [currentModeIndex]);

  const currentMode = THEME_MODES[currentModeIndex];
  const CurrentIcon = THEME_ICONS[currentMode];
  const currentLabel = THEME_LABELS[currentMode];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CurrentIcon className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
      <Switch
        checked={currentModeIndex > 0}
        onCheckedChange={handleToggle}
        aria-label={`Switch theme. Current: ${currentLabel}`}
        size="sm"
      />
      <span className="text-sm text-[rgb(var(--color-muted-foreground))]">
        {currentLabel}
      </span>
    </div>
  );
};

ThemeToggle.displayName = "ThemeToggle";
