import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Filter } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useTags } from "@/lib/tags-store";

export const NO_TAG = "__none__";

/** Empty selection means "All". */
export function useTagFilter(storageKey: string) {
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setSelected(JSON.parse(raw) as string[]);
    } catch { /* ignore */ }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(storageKey, JSON.stringify(selected)); } catch { /* ignore */ }
  }, [selected, hydrated, storageKey]);

  const matches = (tag?: string) =>
    selected.length === 0 || selected.includes(tag ? tag : NO_TAG);

  return { selected, setSelected, matches };
}

export function TagFilter({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const { tags, styleOf } = useTags();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = (id: string) => {
    haptic(8);
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const label =
    selected.length === 0
      ? "All tags"
      : selected.length === 1
        ? (selected[0] === NO_TAG ? "No tag" : styleOf(selected[0]).label)
        : `${selected.length} tags`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { haptic(8); setOpen((v) => !v); }}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-clay-soft"
        style={{ border: "1px solid var(--hairline)" }}
      >
        <Filter className="h-3.5 w-3.5" /> {label}
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-30 mt-2 max-h-72 w-52 overflow-y-auto rounded-2xl bg-surface p-1.5 shadow-lg"
            style={{ border: "1px solid var(--hairline)" }}
          >
            <Option
              label="All"
              checked={selected.length === 0}
              onClick={() => { haptic(8); onChange([]); }}
            />
            <div className="my-1 h-px" style={{ background: "var(--hairline)" }} />
            {tags.map((t) => (
              <Option
                key={t.id}
                label={t.label}
                dot={`var(--tag-${t.color})`}
                checked={selected.includes(t.id)}
                onClick={() => toggle(t.id)}
              />
            ))}
            <Option
              label="No tag"
              dot="var(--clay-muted)"
              checked={selected.includes(NO_TAG)}
              onClick={() => toggle(NO_TAG)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Option({
  label, dot, checked, onClick,
}: { label: string; dot?: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="checkbox"
      aria-checked={checked}
      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-surface-hover"
    >
      <span
        className="grid h-4 w-4 shrink-0 place-items-center rounded-[6px]"
        style={{
          border: `1.5px solid ${checked ? "var(--clay)" : "var(--hairline)"}`,
          background: checked ? "var(--clay)" : "transparent",
        }}
      >
        {checked && <Check className="h-3 w-3" style={{ color: "var(--ivory)" }} strokeWidth={3} />}
      </span>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />}
      <span className="truncate text-clay">{label}</span>
    </button>
  );
}
