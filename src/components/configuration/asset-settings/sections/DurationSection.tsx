interface DurationSectionProps {
  value: number;
  onChange: (value: number) => void;
  onUnsavedChange: () => void;
  getInputClassName: () => string;
}

export function DurationSection({
  value,
  onChange,
  onUnsavedChange,
  getInputClassName,
}: DurationSectionProps) {
  return (
    <section className="bg-[rgb(var(--color-surface-1))] border border-[rgb(var(--color-border))] rounded-lg shadow-md p-4">
      <h3 className="text-base font-semibold text-[rgb(var(--color-fg))] mb-3">
        Duration
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[rgb(var(--color-fg))] mb-1">
            Duration (ms)
          </label>
          <input
            type="number"
            min={0}
            value={value}
            onChange={(e) => {
              const val = Math.max(0, Number(e.target.value) || 0);
              onChange(val);
              onUnsavedChange();
            }}
            className={getInputClassName()}
          />
        </div>
      </div>
    </section>
  );
}
