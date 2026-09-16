import { useMemo } from "react";
import { formatTime, useTimeFormat, type TimeFormat } from "@/lib/nav-prefs";

/** Builds the full list of "HH:mm" values in 5-minute steps (00:00 → 23:55). */
const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

const inputCls =
  "w-full rounded-2xl bg-surface px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-clay/40";

export function TimeSelect({
  value,
  onChange,
  className = inputCls,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const timeFormat: TimeFormat = useTimeFormat();

  // If the stored value isn't on a 5-minute boundary, still show it as a usable
  // first option so nothing gets lost — but snap newly chosen values to slots.
  const slots = useMemo(() => {
    if (!value || TIME_SLOTS.includes(value)) return TIME_SLOTS;
    return [value, ...TIME_SLOTS];
  }, [value]);

  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{ color: "var(--clay)", border: "1px solid var(--hairline)" }}
    >
      {slots.map((slot) => (
        <option key={slot} value={slot}>
          {formatTime(slot, timeFormat)}
        </option>
      ))}
    </select>
  );
}
