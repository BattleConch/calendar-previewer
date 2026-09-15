import { motion } from "framer-motion";
import { CalendarDays, CheckSquare, StickyNote } from "lucide-react";
import { haptic } from "@/lib/haptics";

export type CreateKind = "event" | "task" | "note";

const OPTIONS: { id: CreateKind; label: string; icon: React.ReactNode }[] = [
  { id: "event", label: "Event", icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { id: "task", label: "Task", icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { id: "note", label: "Note", icon: <StickyNote className="h-3.5 w-3.5" /> },
];

/** Segmented Event / Task / Note picker styled like the bottom tab bar. */
export function KindSwitch({
  value,
  onChange,
  showNote = true,
}: {
  value: CreateKind;
  onChange: (kind: CreateKind) => void;
  showNote?: boolean;
}) {
  const options = showNote ? OPTIONS : OPTIONS.filter((o) => o.id !== "note");
  return (
    <div
      role="tablist"
      aria-label="What to create"
      className="flex flex-1 items-center gap-1 rounded-full p-1"
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => { if (!active) { haptic(8); onChange(o.id); } }}
            className="relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ color: active ? "var(--clay)" : "var(--clay-soft)" }}
          >
            {active && (
              <motion.span
                layoutId="kind-pill"
                className="absolute inset-0 rounded-full bg-ivory shadow-sm"
                style={{ border: "1px solid var(--hairline)" }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">{o.icon}{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
