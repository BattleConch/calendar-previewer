import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTasks, type Priority } from "@/lib/tasks-store";
import { type TagColor } from "@/lib/events-store";
import { useTags } from "@/lib/tags-store";
import { haptic } from "@/lib/haptics";
import { ConfirmDelete, DetailActions, PreviewRow, TagBadge, UnsavedChanges } from "./DetailChrome";
import { RemindersField } from "./RemindersField";
import { TASK_REMINDERS } from "@/lib/notifications";



const PRIORITIES: Priority[] = ["low", "med", "high"];

export function TaskEditor({
  open,
  onClose,
  editingId,
}: {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
}) {
  const { tasks, add, update, remove } = useTasks();
  const existing = editingId ? tasks.find((t) => t.id === editingId) : null;

  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [tag, setTag] = useState<TagColor | undefined>(undefined);
  const { tags, styleOf } = useTags();
  const [priority, setPriority] = useState<Priority>("med");
  const [notes, setNotes] = useState("");
  const [reminders, setReminders] = useState<string[]>([]);

  const [mode, setMode] = useState<"preview" | "edit">("edit");
  const [confirming, setConfirming] = useState(false);
  const [warn, setWarn] = useState(false);
  const [baseline, setBaseline] = useState("");

  useEffect(() => {
    if (!open) return;
    setConfirming(false);
    setWarn(false);
    setMode(existing ? "preview" : "edit");
    if (existing) {
      setTitle(existing.title);
      setDue(existing.due ?? "");
      setTag(existing.tag);
      setPriority(existing.priority);
      setNotes(existing.notes ?? "");
      setReminders(existing.reminders ?? []);
      setBaseline(snap(existing.title, existing.due ?? "", existing.tag, existing.priority, existing.notes ?? "", existing.reminders ?? []));
    } else {
      setTitle("");
      setDue("");
      setTag(undefined);
      setPriority("med");
      setNotes("");
      setReminders([]);
      setBaseline(snap("", "", undefined, "med", "", []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);



  const dirty = mode === "edit" && snap(title, due, tag, priority, notes, reminders) !== baseline;
  const attemptClose = () => { if (dirty) setWarn(true); else onClose(); };

  const save = () => {
    if (!title.trim()) return;
    const payload = { title, due: due || undefined, tag, priority, notes, reminders: due ? reminders : [] };
    if (existing) update(existing.id, payload);
    else add(payload);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={attemptClose}
            className="fixed inset-0 z-40 bg-clay/40 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            layout
            layoutDependency={mode}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120) attemptClose(); }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] min-h-[50dvh] flex-col overflow-hidden rounded-t-[2rem] bg-ivory"
            style={{
              boxShadow: "0 -20px 60px -20px rgba(74,63,53,0.35)",
              border: warn ? "2px solid var(--tag-red)" : "2px solid transparent",
            }}
          >
            <div className="flex justify-center pt-3">
              <span className="h-1.5 w-10 rounded-full bg-hairline" />
            </div>
            <div className="flex items-center justify-between px-6 pt-3">
              <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">
                {mode === "preview" ? "Task" : existing ? "Edit task" : "New task"}
              </div>
              {mode === "preview" && existing ? (
                <DetailActions onEdit={() => setMode("edit")} onDelete={() => setConfirming(true)} onClose={onClose} />
              ) : (
                <button onClick={attemptClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>


            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
              {mode === "preview" && existing ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="pt-2"
                >
                  <h2 className="font-serif text-3xl leading-tight tracking-tight text-clay">{existing.title}</h2>
                  {existing.tag && (
                    <div className="mt-4">
                      <TagBadge {...styleOf(existing.tag)} />
                    </div>
                  )}
                  <div className="mt-5">
                    <PreviewRow label="Status" value={existing.done ? "Done" : "Open"} />
                    <PreviewRow label="Priority" value={<span className="capitalize">{existing.priority}</span>} />
                    <PreviewRow
                      label="Due"
                      value={existing.due ? format(parseISO(existing.due), "EEEE, d MMM yyyy") : "No deadline"}
                    />
                    {existing.reminders?.length ? (
                      <PreviewRow
                        label="Reminders"
                        value={existing.reminders
                          .map((r) => TASK_REMINDERS.find((o) => o.value === r)?.label ?? r)
                          .join(" · ")}
                      />
                    ) : null}
                  </div>
                  {existing.notes?.trim() ? (
                    <div className="mt-6">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-clay-soft">Notes</div>
                      <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-surface px-4 py-3 text-[15px] leading-relaxed text-clay"
                        style={{ border: "1px solid var(--hairline)" }}>
                        {existing.notes}
                      </p>
                    </div>
                  ) : null}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      haptic(12);
                      update(existing.id, { done: !existing.done });
                      onClose();
                    }}
                    className="mt-8 mb-2 flex w-full items-center justify-center gap-2 rounded-full bg-clay py-4 font-medium text-ivory shadow-sm"
                  >
                    <Check className="h-4 w-4" /> {existing.done ? "Mark as not complete" : "Mark as complete"}
                  </motion.button>
                </motion.div>
              ) : (
              <>

              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs doing?"
                className="mt-2 w-full bg-transparent pb-2 font-serif text-3xl tracking-tight placeholder:text-clay-muted focus:outline-none"
                style={{ borderBottom: "1px solid var(--hairline)", color: "var(--clay)" }}
              />

              <div className="mt-6">
                <div className="text-[10px] uppercase tracking-[0.24em] text-clay-soft">Due</div>
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-surface px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-clay/40"
                  style={{ border: "1px solid var(--hairline)", color: "var(--clay)" }}
                />
                <RemindersField
                  value={reminders}
                  onChange={setReminders}
                  options={TASK_REMINDERS}
                  disabled={!due}
                  hint="Notifications arrive while Calendry is open on this device."
                />
                {!due && <div className="mt-2 text-[11px] text-clay-muted">Pick a due date to add reminders.</div>}
              </div>

              <div className="mt-6">
                <div className="text-[10px] uppercase tracking-[0.24em] text-clay-soft">Priority</div>
                <div className="mt-2 flex gap-2">
                  {PRIORITIES.map((p) => {
                    const active = p === priority;
                    return (
                      <motion.button
                        key={p}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPriority(p)}
                        className="flex-1 rounded-full px-3 py-2 text-xs font-medium capitalize"
                        style={{
                          background: active ? "var(--clay)" : "transparent",
                          color: active ? "var(--ivory)" : "var(--clay-soft)",
                          border: `1px solid ${active ? "var(--clay)" : "var(--hairline)"}`,
                        }}
                      >
                        {p}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[10px] uppercase tracking-[0.24em] text-clay-soft">Tag</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TagChip active={!tag} onClick={() => setTag(undefined)} label="None" />
                  {tags.map((tg) => {
                    const s = styleOf(tg.id);
                    const t = tg.id;
                    const active = tag === t;
                    return (
                      <motion.button
                        key={t}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setTag(t)}
                        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
                        style={{
                          background: active ? s.bg : "transparent",
                          color: active ? s.text : "var(--clay-soft)",
                          border: `1px solid ${active ? s.ring : "var(--hairline)"}`,
                        }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                        {s.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[10px] uppercase tracking-[0.24em] text-clay-soft">Notes</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Details…"
                  className="mt-2 w-full resize-none rounded-2xl bg-surface px-4 py-3 text-[15px] leading-relaxed placeholder:text-clay-muted focus:outline-none focus:ring-1 focus:ring-clay/40"
                  style={{ border: "1px solid var(--hairline)", color: "var(--clay)" }}
                />
              </div>

              <div className="mt-8 flex items-center gap-3 pb-2">
                {existing && (
                  <button
                    onClick={() => setConfirming(true)}
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover"
                    style={{ border: "1px solid var(--hairline)" }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={save}
                  disabled={!title.trim()}
                  className="flex-1 rounded-full bg-clay py-4 text-center font-medium text-ivory shadow-sm disabled:opacity-40"
                >
                  {existing ? "Save changes" : "Add task"}
                </motion.button>
              </div>
              </>
              )}
            </div>
          </motion.div>
          <UnsavedChanges
            open={warn}
            onKeepEditing={() => setWarn(false)}
            onDiscard={() => { setWarn(false); onClose(); }}
          />
          <ConfirmDelete
            open={confirming}
            kind="task"
            name={existing?.title ?? ""}
            onCancel={() => setConfirming(false)}
            onConfirm={() => { if (existing) remove(existing.id); setConfirming(false); onClose(); }}
          />

        </>
      )}
    </AnimatePresence>
  );
}

function snap(title: string, due: string, tag: string | undefined, priority: string, notes: string, reminders: string[]) {
  return JSON.stringify([title, due, tag ?? null, priority, notes, reminders]);
}

function TagChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs font-medium"
      style={{
        background: active ? "var(--surface-hover)" : "transparent",
        color: active ? "var(--clay)" : "var(--clay-soft)",
        border: `1px solid ${active ? "var(--clay-muted)" : "var(--hairline)"}`,
      }}
    >
      {label}
    </motion.button>
  );
}
