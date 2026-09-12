import { motion, AnimatePresence } from "framer-motion";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEvents } from "@/lib/events-store";
import { useTags } from "@/lib/tags-store";
import { useTasks } from "@/lib/tasks-store";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const HOUR_H = 56;
const DAY_START = 6; // grid begins at 06:00
const HOURS = 17;

const minToLabel = (m: number) => {
  const clamped = Math.max(0, Math.min(HOURS * 60, m));
  const h = Math.floor(clamped / 60) + DAY_START;
  const mm = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const snap = (m: number) => Math.round(m / 15) * 15;

/** ticks every 30s on the client only (avoids SSR hydration mismatch) */
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function AgendaSheet({
  selected,
  setSelected,
  onEdit,
  onCreateRange,
  onEditTask,
}: {
  selected: Date;
  setSelected: (d: Date) => void;
  onEdit: (id: string) => void;
  onCreateRange?: (start: string, end: string) => void;
  onEditTask?: (id: string) => void;
}) {
  const { byDate } = useEvents();
  const { tasks } = useTasks();
  const { styleOf } = useTags();
  const [dir, setDir] = useState(0);
  const now = useNow();
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() - DAY_START * 60 : null;
  const showNow =
    now != null && nowMin != null && isSameDay(now, selected) && nowMin >= 0 && nowMin <= HOURS * 60;

  const weekStart = startOfWeek(selected, { weekStartsOn: 0 });
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayEvents = byDate(iso(selected));
  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const events = dayEvents.filter((e) => !e.allDay);
  const dayTasks = tasks.filter((t) => !t.done && (!t.due || t.due === iso(selected)));
  const floatingTasks = dayTasks;
  const hasAllDay = allDayEvents.length > 0 || floatingTasks.length > 0;
  const hours = Array.from({ length: HOURS }, (_, i) => i + DAY_START);

  const goDay = (delta: number) => {
    haptic([6, 18]);
    setDir(delta);
    setSelected(addDays(selected, delta));
  };


  /* ---- press-and-hold on a time slot to draw a new event ---- */
  const gridRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ timer: number | null; y: number; anchor: number; active: boolean } | null>(null);
  const [draft, setDraft] = useState<{ from: number; to: number } | null>(null);

  const minsFromEvent = (clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(HOURS * 60, ((clientY - rect.top) / HOUR_H) * 60));
  };

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const y = e.clientY;
    const anchor = snap(minsFromEvent(y));
    const timer = window.setTimeout(() => {
      haptic(15);
      if (press.current) press.current.active = true;
      setDraft({ from: anchor, to: anchor + 30 });
    }, 500);
    press.current = { timer, y, anchor, active: false };
  };

  const onMove = (e: React.PointerEvent) => {
    const s = press.current;
    if (!s) return;
    if (!s.active) {
      // moved before the hold completed → treat as a scroll, cancel
      if (Math.abs(e.clientY - s.y) > 10) cancelPress();
      return;
    }
    e.preventDefault();
    const cur = snap(minsFromEvent(e.clientY));
    setDraft({ from: Math.min(s.anchor, cur), to: Math.max(s.anchor + 15, cur) });
  };

  const cancelPress = () => {
    const s = press.current;
    if (s?.timer != null) window.clearTimeout(s.timer);
    press.current = null;
    setDraft(null);
  };

  const onUp = () => {
    const s = press.current;
    if (s?.active && draft) {
      haptic([10, 30, 14]);
      onCreateRange?.(minToLabel(draft.from), minToLabel(Math.max(draft.to, draft.from + 15)));
    }
    cancelPress();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="px-4"
    >
      {/* Week strip — arrows move a whole week, sweeping in from the side */}
      <div className="flex items-center gap-2 py-2">
        <ArrowBtn label="Previous day" onClick={() => goDay(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </ArrowBtn>


        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={iso(weekStart)}
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d >= 0 ? "60%" : "-60%" }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: d >= 0 ? "-60%" : "60%" }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.7 }}
              className="grid grid-cols-7 gap-1.5"
            >
              {week.map((d) => {
                const active = isSameDay(d, selected);
                const today = isSameDay(d, new Date());
                return (
                  <motion.button
                    key={iso(d)}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => { haptic([5, 12]); setDir(d > selected ? 1 : -1); setSelected(d); }}
                    className="relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5"
                    style={{
                      background: active ? "var(--clay)" : "var(--surface)",
                      color: active ? "var(--ivory)" : "var(--clay)",
                      border: `1px solid ${active ? "var(--clay)" : "var(--hairline)"}`,
                    }}
                  >
                    <span className="relative text-[9px] uppercase tracking-widest opacity-80">{format(d, "EEE")}</span>
                    <span className="relative font-serif text-lg leading-none">{format(d, "d")}</span>
                    <span
                      className="relative h-1 w-1 rounded-full"
                      style={{ background: today ? (active ? "var(--ivory)" : "var(--clay)") : "transparent" }}
                    />
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <ArrowBtn label="Next day" onClick={() => goDay(1)}>
          <ChevronRight className="h-5 w-5" />
        </ArrowBtn>

      </div>

      {/* All-day lane — untimed events and deadline-free tasks */}
      <AnimatePresence initial={false}>
        {hasAllDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-3xl bg-surface px-3 py-3" style={{ border: "1px solid var(--hairline)" }}>
              <div className="px-1 pb-2 text-[10px] uppercase tracking-[0.2em] text-clay-muted">All-day</div>
              <div className="flex flex-wrap gap-1.5">
                {allDayEvents.map((e) => {
                  const s = styleOf(e.tag);
                  return (
                    <motion.button
                      key={e.id}
                      layout
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { haptic(10); onEdit(e.id); }}
                      className="max-w-full truncate rounded-full px-3 py-1.5 text-xs"
                      style={{ background: s.bg, color: s.text, border: `1px solid ${s.ring}` }}
                    >
                      {e.title}
                    </motion.button>
                  );
                })}
                {floatingTasks.map((t) => {
                  const s = t.tag ? styleOf(t.tag) : null;
                  return (
                    <motion.button
                      key={t.id}
                      layout
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { haptic(10); onEditTask?.(t.id); }}
                      className="flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
                      style={{
                        background: "transparent",
                        color: s ? s.text : "var(--clay-soft)",
                        border: `1.5px solid ${s ? s.dot : "var(--clay-muted)"}`,
                      }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: "transparent", border: `1.5px solid ${s ? s.dot : "var(--clay-muted)"}` }}
                      />
                      <span className="truncate">{t.title}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time grid */}
      <div className="relative mt-2 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={iso(selected)}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d >= 0 ? 40 : -40 }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d >= 0 ? -40 : 40 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="rounded-3xl bg-surface p-4"
            style={{ border: "1px solid var(--hairline)" }}
          >
            <div
              className="relative select-none"
              style={{ touchAction: draft ? "none" : "pan-y" }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={cancelPress}
            >
              {/* hour rules */}
              <div className="relative" style={{ height: HOURS * HOUR_H }}>
                {hours.map((h, i) => (
                  <div key={h} className="absolute left-0 right-0 flex items-start gap-3" style={{ top: i * HOUR_H, height: HOUR_H }}>
                    <div className="w-10 text-[10px] uppercase tracking-widest text-clay-muted">
                      {h % 12 === 0 ? 12 : h % 12}{h < 12 ? "a" : "p"}
                    </div>
                    <div className="flex-1 hairline-b" />
                  </div>
                ))}

                {/* the grid surface used for measuring drags */}
                <div ref={gridRef} className="absolute inset-0" />

                {/* live current-time indicator */}
                {showNow && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, top: (nowMin! / 60) * HOUR_H }}
                    transition={{ type: "spring", stiffness: 180, damping: 26 }}
                    className="pointer-events-none absolute left-10 right-2 z-20 flex items-center"
                    style={{ top: (nowMin! / 60) * HOUR_H }}
                  >
                    <span className="relative -ml-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "var(--now, #E0402B)" }}>
                      <motion.span
                        animate={{ scale: [1, 2.2], opacity: [0.45, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full"
                        style={{ background: "var(--now, #E0402B)" }}
                      />
                    </span>
                    <span className="h-[2px] flex-1 rounded-full" style={{ background: "var(--now, #E0402B)" }} />
                  </motion.div>
                )}

                {/* draft (press & hold) block */}
                <AnimatePresence>
                  {draft && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="pointer-events-none absolute left-14 right-2 flex flex-col justify-center rounded-2xl px-3"
                      style={{
                        top: (draft.from / 60) * HOUR_H,
                        height: Math.max(28, ((draft.to - draft.from) / 60) * HOUR_H - 2),
                        background: "color-mix(in oklab, var(--clay) 12%, transparent)",
                        border: "1px dashed var(--clay-soft)",
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-widest text-clay-soft">
                        {minToLabel(draft.from)} – {minToLabel(draft.to)}
                      </div>
                      <div className="font-serif text-base leading-tight text-clay">New event</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {events.map((e, i) => {
                  const [sh, sm] = e.start.split(":").map(Number);
                  const [eh, em] = e.end.split(":").map(Number);
                  const startMin = sh * 60 + sm - DAY_START * 60;
                  const dur = (eh * 60 + em) - (sh * 60 + sm);
                  const top = (startMin / 60) * HOUR_H;
                  const height = Math.max(20, (dur / 60) * HOUR_H - 4);
                  const s = styleOf(e.tag);
                  const roomy = height >= 46;
                  const tiny = height < 28;
                  return (
                    <motion.button
                      key={e.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 220, damping: 24 }}
                      onClick={() => { haptic(10); onEdit(e.id); }}
                      className="absolute left-14 right-2 flex flex-col items-start justify-center overflow-hidden rounded-2xl px-3 text-left"
                      style={{ top, height, paddingTop: tiny ? 2 : 6, paddingBottom: tiny ? 2 : 6, background: s.bg, color: s.text, border: `1px solid ${s.dot}22` }}
                    >
                      {roomy && (
                        <div className="text-[10px] uppercase tracking-widest opacity-70">{e.start} – {e.end}</div>
                      )}
                      <div
                        className={`w-full truncate font-serif leading-tight ${roomy ? "mt-0.5 text-base" : tiny ? "text-[10px]" : "text-sm"}`}
                        style={{ color: "var(--clay)" }}
                      >
                        {e.title}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {events.length === 0 && !draft && (
                <div className="pointer-events-none absolute inset-x-0 top-8 text-center text-sm text-clay-muted">
                  Nothing on the page yet — hold a time slot to add.
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function ArrowBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-clay-soft"
      style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
    >
      {children}
    </motion.button>
  );
}
