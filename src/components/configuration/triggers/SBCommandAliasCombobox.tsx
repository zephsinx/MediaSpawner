import React from "react";
import { useStreamerbotCommands } from "../../../hooks/useStreamerbotCommands";
import { HUICombobox } from "../../common";

interface SBCommandAliasComboboxProps {
  value: string;
  onChange: (v: string) => void;
}

export const SBCommandAliasCombobox: React.FC<SBCommandAliasComboboxProps> = ({
  value,
  onChange,
}) => {
  const { commands, loading, refresh } = useStreamerbotCommands();
  const options = React.useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    (commands || []).forEach((cmd) => {
      (cmd.commands || []).forEach((a) => {
        const key = a.toLowerCase();
        if (!seen.has(key) && a.trim()) {
          seen.add(key);
          out.push({ value: a, label: cmd.name });
        }
      });
    });
    out.sort((a, b) => a.value.localeCompare(b.value));
    return out;
  }, [commands]);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1">
        <HUICombobox
          value={value}
          onChange={onChange}
          onSelect={onChange}
          options={options}
          isLoading={loading}
          placeholder="Enter command alias (e.g., scene1, alert)"
        />
      </div>
      <button
        type="button"
        onClick={() => refresh()}
        disabled={loading}
        className="text-xs text-[rgb(var(--color-accent))] hover:text-[rgb(var(--color-accent-hover))] disabled:opacity-50"
      >
        Refresh
      </button>
    </div>
  );
};
