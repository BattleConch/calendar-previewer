import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useServerFn } from "@tanstack/react-start";
import { useEvents, type TagColor } from "@/lib/events-store";
import { useTags } from "@/lib/tags-store";
import { ConfirmDelete, DetailActions, PreviewRow, TagBadge, UnsavedChanges } from "./DetailChrome";
import { RemindersField } from "./RemindersField";
import { EVENT_REMINDERS } from "@/lib/notifications";
import { deleteGoogleEvent } from "@/lib/google-calendar.functions";
import { haptic } from "@/lib/haptics";





export function EventEditor({
  open,
  onClose,
  editingId,
  defaultDate,
  defaultStart = "09:00",
  defaultEnd = "10:00",
}: {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
  defaultDate: string;
  defaultStart?: string;
  defaultEnd?: string;
}) {
  const { events, add, update, remove } = useEvents();
  const existing = editingId ? events.find((e) => e.id === editingId) : null;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [tag, setTag] = useState<TagColor | undefined>(undefined);
  const { tags, styleOf } = useTags();
  const [notes, setNotes] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [reminders, setReminders] = useState<string[]>([]);
  const [mode, setMode] = useState<"preview" | "edit">("edit");
  const [confirming, setConfirming] = useState(false);
  const [recurOpen, setRecurOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const removeGoogle = useServerFn(deleteGoogleEvent);

  const [warn, setWarn] = useState(false);
  const [baseline, setBaseline] = useState("");

  useEffect(() => {
    if (!open) return;
    setConfirming(false);
    setWarn(false);
    setMode(existing ? "preview" : "edit");
    if (existing) {
      setTitle(existing.title);
      setDate(existing.date);
      setStart(existing.start);
      setEnd(existing.end);
      setTag(existing.tag);
      setNotes(existing.notes ?? "");
      setAllDay(!!existing.allDay);
      setReminders(existing.reminders ?? []);
      setBaseline(snap(existing.title, existing.date, existing.start, existing.end, existing.tag, existing.notes ?? "", !!existing.allDay, existing.reminders ?? []));
    } else {
      setTitle("");
      setDate(defaultDate);
      setStart(defaultStart);
      setEnd(defaultEnd);
      setTag(undefined);
      setNotes("");
      setAllDay(false);
      setReminders([]);
      setBaseline(snap("", defaultDate, defaultStart, defaultEnd, undefined, "", false, []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId, defaultDate, defaultStart, defaultEnd]);



  const dirty = mode === "edit" && snap(title, date, start, end, tag, notes, allDay, reminders) !== baseline;
  const attemptClose = () => { if (dirty) setWarn(true); else onClose(); };

  const save = () => {
    if (!title.trim()) return;
    const times = allDay ? { start: "00:00", end: "23:59" } : { start, end };
    if (existing) update(existing.id, { title, date, ...times, tag, notes, allDay, reminders });
    else add({ title, date, ...times, tag, notes, allDay, reminders });
    onClose();
  };

  const isGoogle = existing?.source === "google";
  const isRecurring = isGoogle && !!existing?.recurringEventId;

  const askDelete = () => {
    setDeleteError(null);
    if (isRecurring) setRecurOpen(true);
    else setConfirming(true);
  };

  const doDelete = async (scope: "single" | "series") => {
    if (!existing) return;
    if (isGoogle) {
      try {
        await removeGoogle({ data: { eventId: existing.id, scope } });
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "Couldn't delete from Google Calendar.");
        return;
      }
    }
    remove(existing.id);
    setRecurOpen(false);
    setConfirming(false);
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
            transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            dragTransition={{ bounceStiffness: 260, bounceDamping: 32 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) attemptClose(); }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] min-h-[50dvh] flex-col overflow-hidden rounded-t-[2rem] bg-ivory"
            style={{
              boxShadow: "0 -24px 70px -24px rgba(74,63,53,0.45)",
              border: warn ? "2px solid var(--tag-red)" : "2px solid transparent",
            }}
          >
            <div className="shrink-0">
              <div className="flex justify-center pt-3">
                <span className="h-1.5 w-10 rounded-full bg-hairline" />
              </div>
              <div className="flex items-center justify-between px-6 pt-3">
                <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">
                  {mode === "preview" ? "Event" : existing ? "Edit" : "New"}
                </div>
                {mode === "preview" && existing ? (
                  <DetailActions
                    onEdit={() => setMode("edit")}
                    onDelete={askDelete}
                    onClose={onClose}
                  />
                ) : (
                  <button onClick={attemptClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

            </div>

            <motion.div layout className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
              <AnimatePresence mode="wait" initial={false}>
              {mode === "preview" && existing ? (
                <motion.div
                  key="preview"
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
                  className="pt-2"
                >
                  <h2 className="font-serif text-3xl leading-tight tracking-tight text-clay">{existing.title}</h2>
                  {existing.tag && (
                    <div className="mt-4">
                      <TagBadge {...styleOf(existing.tag)} />
                    </div>
                  )}
                  <div className="mt-5">
                    <PreviewRow label="Date" value={format(parseISO(existing.date), "EEEE, d MMM yyyy")} />
                    <PreviewRow
                      label="Time"
                      value={existing.allDay ? "All-day" : `${existing.start} – ${existing.end}`}
                    />
                    {existing.source === "google" && !existing.isOwner && (existing.organizerName || existing.organizerEmail) ? (
                      <PreviewRow
                        label="Owner"
                        value={existing.organizerName ?? existing.organizerEmail ?? ""}
                      />
                    ) : null}
                    {existing.recurringEventId ? <PreviewRow label="Repeats" value="Part of a repeating series" /> : null}

                    {existing.reminders?.length ? (
                      <PreviewRow
                        label="Reminders"
                        value={existing.reminders
                          .map((r) => EVENT_REMINDERS.find((o) => o.value === r)?.label ?? r)
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
                </motion.div>
              ) : (
              <motion.div
                key="edit"
                layout
                initial={{ opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.985 }}
                transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
              >


              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's on the page?"
                className="mt-2 w-full bg-transparent pb-2 font-serif text-3xl tracking-tight placeholder:text-clay-muted focus:outline-none"
                style={{ borderBottom: "1px solid var(--hairline)", color: "var(--clay)" }}
              />

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </Field>
                <div />
                <AnimatePresence initial={false} mode="popLayout">
                  {!allDay && (
                    <>
                      <motion.div
                        key="starts"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                      >
                        <Field label="Starts">
                          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
                        </Field>
                      </motion.div>
                      <motion.div
                        key="ends"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                      >
                        <Field label="Ends">
                          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
                        </Field>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-3 grid grid-cols-2 items-start gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAllDay((v) => !v)}
                  className="flex w-full items-center gap-2 rounded-2xl bg-surface px-3 py-3 text-left"
                  style={{ border: "1px solid var(--hairline)" }}
                >
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-md transition-colors"
                    style={{
                      background: allDay ? "var(--clay)" : "transparent",
                      border: `1.5px solid ${allDay ? "var(--clay)" : "var(--hairline)"}`,
                    }}
                  >
                    <AnimatePresence>
                      {allDay && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: "var(--ivory)" }} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="text-[15px]">All-day</span>
                </motion.button>

                <div className="[&>div]:mt-0">
                  <RemindersField
                    value={reminders}
                    onChange={setReminders}
                    options={EVENT_REMINDERS}
                    hint="Notifications arrive while Calendry is open on this device."
                  />
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
                  placeholder="A thought, a place, a reminder…"
                  className="mt-2 w-full resize-none rounded-2xl bg-surface px-4 py-3 text-[15px] leading-relaxed placeholder:text-clay-muted focus:outline-none focus:ring-1 focus:ring-clay/40"
                  style={{ border: "1px solid var(--hairline)", color: "var(--clay)" }}
                />
              </div>

              <div className="mt-8 flex items-center gap-3 pb-2">
                {existing && (
                  <button
                    onClick={askDelete}
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
                  {existing ? "Save changes" : "Add to calendar"}
                </motion.button>
              </div>
              </motion.div>
              )}
              </AnimatePresence>
            </motion.div>

          </motion.div>
          <UnsavedChanges
            open={warn}
            onKeepEditing={() => setWarn(false)}
            onDiscard={() => { setWarn(false); onClose(); }}
          />
          <ConfirmDelete
            open={confirming}
            kind="event"
            name={existing?.title ?? ""}
            onCancel={() => setConfirming(false)}
            onConfirm={() => { void doDelete("single"); }}
          />
          <RecurringDelete
            open={recurOpen}
            onCancel={() => setRecurOpen(false)}
            onThisEvent={() => { haptic(12); void doDelete("single"); }}
            onAllEvents={() => { haptic(16); void doDelete("series"); }}
            error={deleteError}
          />

        </>
      )}
    </AnimatePresence>
  );
}

function snap(title: string, date: string, start: string, end: string, tag: string | undefined, notes: string, allDay: boolean, reminders: string[]) {
  return JSON.stringify([title, date, start, end, tag ?? null, notes, allDay, reminders]);
}

const inputCls =
  "w-full rounded-2xl bg-surface px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-clay/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.24em] text-clay-soft">{label}</span>
      <span className="[&>input]:w-full [&>input]:rounded-2xl [&>input]:bg-surface [&>input]:px-4 [&>input]:py-3 [&>input]:text-[15px] [&>input]:focus:outline-none [&>input]:focus:ring-1 [&>input]:focus:ring-clay/40" style={{}}>
        <span style={{ display: "block" }}>
          {children}
        </span>
      </span>
    </label>
  );
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

function RecurringDelete({
  open,
  onCancel,
  onThisEvent,
  onAllEvents,
  error,
}: {
  open: boolean;
  onCancel: () => void;
  onThisEvent: () => void;
  onAllEvents: () => void;
  error: string | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="rd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[60] bg-clay/60 backdrop-blur-sm"
          />
          <motion.div
            key="rd-card"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            role="alertdialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-[61] w-[min(21rem,88vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-ivory p-6 text-center"
            style={{ border: "1px solid var(--hairline)", boxShadow: "0 30px 70px -30px rgba(74,63,53,0.5)" }}
          >
            <div className="font-serif text-xl text-clay">Delete repeating event</div>
            <p className="mt-2 text-[13px] leading-relaxed text-clay-soft">
              This event repeats. What would you like to remove?
            </p>
            {error && <p className="mt-3 text-[12px] text-clay-soft">{error}</p>}
            <div className="mt-5 flex flex-col gap-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onThisEvent}
                className="w-full rounded-2xl py-3 text-[14px] text-clay"
                style={{ background: "var(--surface-hover)" }}
              >
                This event only
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onAllEvents}
                className="w-full rounded-2xl py-3 text-[14px]"
                style={{ background: "color-mix(in srgb, var(--tag-red) 16%, transparent)", color: "var(--tag-red)" }}
              >
                All repeating events
              </motion.button>
              <button onClick={onCancel} className="w-full rounded-2xl py-2.5 text-[14px] text-clay-soft">
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
