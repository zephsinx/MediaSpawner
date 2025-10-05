import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { Switch } from "../ui/Switch";
import { SettingsService } from "../../services/settingsService";
import { cn } from "../../utils/cn";

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const [isDark, setIsDark] = React.useState(false);

  // Initialize theme mode from settings
  React.useEffect(() => {
    const currentMode = SettingsService.getThemeMode();
    setIsDark(currentMode === "dark");
  }, []);

  const handleToggle = React.useCallback(() => {
    const newMode = isDark ? "light" : "dark";
    setIsDark(!isDark);

    // Update settings and apply theme
    const result = SettingsService.setThemeMode(newMode);
    if (!result.success) {
      console.error("Failed to set theme mode:", result.error);
      // Revert on error
      setIsDark(isDark);
    }
  }, [isDark]);

  const CurrentIcon = isDark ? Moon : Sun;

  return (
    <div className={cn("flex items-center gap-2 min-w-[120px]", className)}>
      <CurrentIcon className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
        size="sm"
      />
    </div>
  );
};

ThemeToggle.displayName = "ThemeToggle";
