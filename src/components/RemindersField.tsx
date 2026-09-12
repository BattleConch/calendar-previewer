import { AnimatePresence, motion } from "framer-motion";
import { Bell, Plus, X } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { requestNotificationPermission, type ReminderOption } from "@/lib/notifications";

export function RemindersField({
  value,
  onChange,
  options,
  disabled,
  hint,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: ReminderOption[];
  disabled?: boolean;
  hint?: string;
}) {
  const reminders = value ?? [];

  const addReminder = async () => {
    if (reminders.length >= 2 || disabled) return;
    haptic(10);
    void requestNotificationPermission(true);
    const next = options.find((o) => !reminders.includes(o.value)) ?? options[0];
    onChange([...reminders, next.value]);
  };

  return (
    <div className="mt-3">
      <AnimatePresence initial={false}>
        {reminders.map((r, i) => (
          <motion.div
            key={`${i}-${r}`}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mb-2 flex items-center gap-2 rounded-2xl bg-surface px-3 py-2"
            style={{ border: "1px solid var(--hairline)" }}
          >
            <Bell className="h-4 w-4 shrink-0 text-clay-soft" />
            <select
              aria-label={`Reminder ${i + 1}`}
              value={r}
              onChange={(e) => onChange(reminders.map((v, j) => (j === i ? e.target.value : v)))}
              className="min-w-0 flex-1 bg-transparent py-1 text-[15px] focus:outline-none"
              style={{ color: "var(--clay)" }}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              type="button"
              aria-label={`Remove reminder ${i + 1}`}
              onClick={() => { haptic(8); onChange(reminders.filter((_, j) => j !== i)); }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {reminders.length < 2 && (
        <motion.button
          layout
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={addReminder}
          disabled={disabled}
          className="flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left text-[15px] text-clay disabled:opacity-40"
          style={{ border: "1px solid var(--hairline)" }}
        >
          {reminders.length === 0 ? <Bell className="h-4 w-4 text-clay-soft" /> : <Plus className="h-4 w-4 text-clay-soft" />}
          {reminders.length === 0 ? "Reminder" : "Add another reminder"}
        </motion.button>
      )}

      {hint && reminders.length > 0 && (
        <div className="mt-2 text-[11px] text-clay-muted">{hint}</div>
      )}
    </div>
  );
}
