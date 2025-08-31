import React, { useMemo } from "react";
import { Combobox as HCombobox } from "@headlessui/react";

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
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-ring))] focus-visible:ring-offset-2 focus:border-indigo-500"
          />
          <HCombobox.Button
            className="absolute inset-y-0 right-0 px-2 text-gray-500 hover:text-gray-700"
            aria-label="Toggle options"
          >
            ▼
          </HCombobox.Button>
        </div>
        <HCombobox.Options className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-md max-h-56 overflow-auto py-1">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-600">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-600">
              {noResultsText}
            </div>
          ) : (
            filtered.map((opt) => (
              <HCombobox.Option
                key={opt.value}
                value={opt.value}
                className={({ active }) =>
                  `px-3 py-2 text-sm cursor-pointer ${
                    active ? "bg-blue-50" : "hover:bg-gray-50"
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
