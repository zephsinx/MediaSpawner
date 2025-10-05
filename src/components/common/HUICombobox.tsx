import React, { useMemo } from "react";
import { Combobox as HCombobox } from "@headlessui/react";
import { comboboxVariants } from "../ui/variants";
import { cn } from "../../utils/cn";

export interface HUIComboboxOption {
  value: string;
  label?: string;
}

export interface HUIComboboxProps {
  value: string;
  onChange: (next: string) => void;
  onSelect: (next: string) => void;
  options: HUIComboboxOption[];
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  noResultsText?: string;
  className?: string;
}

export const HUICombobox: React.FC<HUIComboboxProps> = ({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  isLoading,
  disabled,
  noResultsText = "No results",
  className = "",
}) => {
  const [query, setQuery] = React.useState("");

  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const v = o.value.toLowerCase();
      const l = (o.label || o.value).toLowerCase();
      return v.includes(q) || l.includes(q);
    });
  }, [query, options]);

  return (
    <HCombobox
      value={value}
      onChange={(selected: unknown) => {
        const next = typeof selected === "string" ? selected : "";
        onSelect(next);
        onChange(next);
      }}
      disabled={disabled}
    >
      <div className={`relative ${className}`}>
        <div className="relative">
          <HCombobox.Input
            displayValue={() => value}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              onChange(next);
            }}
            placeholder={placeholder}
            className={cn(comboboxVariants({ variant: "default" }))}
          />
          <HCombobox.Button
            className="absolute inset-y-0 right-0 px-2 text-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-fg))]"
            aria-label="Toggle options"
          >
            ▼
          </HCombobox.Button>
        </div>
        <HCombobox.Options className="absolute z-10 mt-1 w-full rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] shadow-md max-h-56 overflow-auto py-1">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-[rgb(var(--color-muted-foreground))]">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[rgb(var(--color-muted-foreground))]">
              {noResultsText}
            </div>
          ) : (
            filtered.map((opt) => (
              <HCombobox.Option
                key={opt.value}
                value={opt.value}
                className={({ active }) =>
                  `px-3 py-2 text-sm cursor-pointer ${
                    active
                      ? "bg-[rgb(var(--color-accent))]/10"
                      : "hover:bg-[rgb(var(--color-muted))]/5"
                  }`
                }
              >
                {opt.label || opt.value}
              </HCombobox.Option>
            ))
          )}
        </HCombobox.Options>
      </div>
    </HCombobox>
  );
};

export default HUICombobox;
