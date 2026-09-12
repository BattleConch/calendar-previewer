import { AnimatePresence, motion, Reorder, useDragControls } from "framer-motion";
import { useMemo, useState } from "react";
import { ChevronDown, Check, GripVertical } from "lucide-react";
import { useTasks, type Task } from "@/lib/tasks-store";
import { useTags } from "@/lib/tags-store";
import { TagFilter, useTagFilter } from "./TagFilter";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { haptic } from "@/lib/haptics";

function dueLabel(d?: string) {
  if (!d) return null;
  const dt = parseISO(d);
  if (isToday(dt)) return "Today";
  if (isTomorrow(dt)) return "Tomorrow";
  return format(dt, "EEE, MMM d");
}

export function TasksPage({ onEdit }: { onEdit: (id: string | null) => void }) {
  const { tasks, toggle, reorder } = useTasks();
  const [showDone, setShowDone] = useState(false);
  const { selected, setSelected, matches } = useTagFilter("calendry.tasks.tagfilter.v1");
  const { styleOf } = useTags();

  const { pending, done, hidden } = useMemo(() => ({
    pending: tasks.filter((t) => !t.done && matches(t.tag)),
    done: tasks.filter((t) => t.done && matches(t.tag)),
    hidden: tasks.filter((t) => !matches(t.tag)),
  }), [tasks, selected]);

  const onReorder = (next: Task[]) => {
    reorder([...next.map((t) => t.id), ...done.map((t) => t.id), ...hidden.map((t) => t.id)]);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="px-5"
    >
      <div className="flex items-start justify-between gap-2 pt-1 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">To do</div>
          <p className="mt-1 text-sm text-clay-soft">
            {pending.length} open · {done.length} done · hold to drag
          </p>
        </div>
        <TagFilter selected={selected} onChange={setSelected} />
      </div>

      <Reorder.Group axis="y" values={pending} onReorder={onReorder} className="space-y-2">
        {pending.map((t) => (
          <TaskRow key={t.id} t={t} onToggle={() => toggle(t.id)} onEdit={() => onEdit(t.id)} />
        ))}
      </Reorder.Group>

      {pending.length === 0 && (
        <div className="mt-4 rounded-3xl bg-surface px-6 py-10 text-center text-sm text-clay-muted"
          style={{ border: "1px solid var(--hairline)" }}>
          All caught up. A quiet afternoon awaits.
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-3xl bg-surface" style={{ border: "1px solid var(--hairline)" }}>
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-sm text-clay-soft"
          >
            <span>Completed ({done.length})</span>
            <motion.span animate={{ rotate: showDone ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showDone && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <ul className="space-y-2 px-3 pb-3">
                  {done.map((t) => (
                    <motion.li
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3"
                      style={{ border: "1px solid var(--hairline)", borderLeft: `4px solid ${t.tag ? styleOf(t.tag).dot : "var(--hairline)"}` }}
                    >
                      <TaskCheck done={t.done} onToggle={() => toggle(t.id)} />
                      <button onClick={() => onEdit(t.id)} className="min-w-0 flex-1 text-left">
                        <div className="truncate text-[15px] text-clay-muted line-through">{t.title}</div>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  );
}

function TaskCheck({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.86 }}
      onClick={() => { haptic(done ? 6 : 12); onToggle(); }}
      aria-label={done ? "Mark incomplete" : "Mark complete"}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors"
      style={{
        background: done ? "var(--olive)" : "transparent",
        border: `1.5px solid ${done ? "var(--olive)" : "var(--hairline)"}`,
      }}
    >
      <AnimatePresence>
        {done && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Check className="h-3.5 w-3.5 text-ivory" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function TaskRow({ t, onToggle, onEdit }: { t: Task; onToggle: () => void; onEdit: () => void }) {
  const { styleOf } = useTags();
  const s = t.tag ? styleOf(t.tag) : null;
  const label = dueLabel(t.due);
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={t}
      dragListener={false}
      dragControls={controls}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileDrag={{ scale: 1.02, boxShadow: "0 20px 40px -20px rgba(74,63,53,0.35)" }}
      transition={{ duration: 0.22 }}
      className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-3"
      style={{ border: "1px solid var(--hairline)", borderLeft: `4px solid ${s ? s.dot : "var(--hairline)"}` }}
    >
      <button
        onPointerDown={(e) => { haptic(15); controls.start(e); }}
        aria-label="Drag to reorder"
        className="grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center text-clay-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <TaskCheck done={t.done} onToggle={onToggle} />

      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className={`truncate text-[15px] ${t.done ? "text-clay-muted line-through" : "text-clay"}`}>
          {t.title}
        </div>
        {(label || s) && (
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-clay-soft">
            {label && <span>{label}</span>}
            {label && s && <span className="h-1 w-1 rounded-full bg-clay-muted" />}
            {s && <span>{s.label}</span>}
          </div>
        )}
      </button>

      {t.priority === "high" && !t.done && (
        <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest"
          style={{ background: "#F5E4E6", color: "#A35C65" }}>
          High
        </span>
      )}
    </Reorder.Item>
  );
}
