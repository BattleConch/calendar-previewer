import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { addMonths, addDays, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, endOfMonth, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEvents } from "@/lib/events-store";
import { useTags } from "@/lib/tags-store";
import { useTasks } from "@/lib/tasks-store";
import { DaySheet, SwipeHint } from "./DaySheet";
import { EventEditor } from "./EventEditor";
import { TasksPage } from "./TasksPage";
import { NotesPage } from "./NotesPage";
import { HomePage } from "./HomePage";
import { TaskEditor } from "./TaskEditor";
import { NoteEditor } from "./NoteEditor";
import { SettingsPage } from "./SettingsPage";
import { BottomNav, type Tab } from "./BottomNav";
import { SyncStatus } from "./SyncStatus";
import { UndoToast } from "./UndoToast";
import { Onboarding } from "./Onboarding";
import { useReminderScheduler } from "@/lib/notifications";

import { haptic } from "@/lib/haptics";

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarApp() {
  const { styleOf } = useTags();
  const [tab, setTab] = useState<Tab>("home");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftTimes, setDraftTimes] = useState<{ start: string; end: string } | null>(null);
  const dayDrag = useDragControls();
  const { events, byDate } = useEvents();
  const { tasks } = useTasks();
  const [hintSeen, setHintSeen] = useState(true);

  useReminderScheduler(events, tasks);

  useEffect(() => {
    try { setHintSeen(localStorage.getItem("calendry.swipeHint.seen") === "1"); } catch { setHintSeen(false); }
  }, []);

  const openDaySheet = () => {
    setDaySheetOpen(true);
    if (!hintSeen) {
      setHintSeen(true);
      try { localStorage.setItem("calendry.swipeHint.seen", "1"); } catch { /* ignore */ }
    }
  };




  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    const out: Date[] = [];
    let d = start;
    while (d <= end) { out.push(d); d = addDays(d, 1); }
    return out;
  }, [cursor]);

  type Dot = { color: string; hollow: boolean };
  const dayHasEvents = useMemo(() => {
    const set = new Map<string, Dot[]>();
    const push = (date: string, dot: Dot) => {
      const arr = set.get(date) ?? [];
      arr.push(dot);
      set.set(date, arr);
    };
    for (const e of events) push(e.date, { color: styleOf(e.tag).dot, hollow: false });
    // tasks read as hollow rings so they never look like events
    for (const t of tasks) {
      if (!t.due || t.done) continue;
      push(t.due, { color: styleOf(t.tag).dot, hollow: true });
    }
    return set;
  }, [events, tasks]);

  const selectedEvents = byDate(iso(selected));

  const openNew = () => { setDraftTimes(null); setEditingId(null); setEditorOpen(true); };
  const openRange = (start: string, end: string) => { setDraftTimes({ start, end }); setEditingId(null); setEditorOpen(true); };
  const openEdit = (id: string) => { setDraftTimes(null); setEditingId(id); setEditorOpen(true); };

  const openNewTask = () => { setEditingTaskId(null); setTaskEditorOpen(true); };
  const openEditTask = (id: string | null) => { setEditingTaskId(id); setTaskEditorOpen(true); };
  const openNewNote = () => { setEditingNoteId(null); setNoteEditorOpen(true); };
  const openEditNote = (id: string | null) => { setEditingNoteId(id); setNoteEditorOpen(true); };

  const fabAction =
    tab === "tasks" ? openNewTask : tab === "notes" ? openNewNote : openNew;
  const fabLabel =
    tab === "tasks" ? "New task" : tab === "notes" ? "New note" : "New event";
  const fabHidden = daySheetOpen || tab === "settings";



  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-ivory pb-28">
      <SyncStatus />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-ivory/80 px-6 pt-12 pb-4 backdrop-blur-md">
        <AnimatePresence mode="wait">
          {tab === "calendar" ? (
            <motion.div
              key="cal-head"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="flex items-center justify-between"
            >
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">{format(cursor, "yyyy")}</div>
                <motion.h1
                  key={format(cursor, "MMM")}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="font-serif text-4xl tracking-tight"
                >
                  {format(cursor, "MMMM")}
                </motion.h1>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn onClick={() => setCursor(addMonths(cursor, -1))} label="Previous month">
                  <ChevronLeft className="h-5 w-5" />
                </IconBtn>
                <IconBtn onClick={() => { const t = new Date(); setCursor(t); setSelected(t); }} label="Today">
                  <span className="h-2 w-2 rounded-full bg-clay" />
                </IconBtn>
                <IconBtn onClick={() => setCursor(addMonths(cursor, 1))} label="Next month">
                  <ChevronRight className="h-5 w-5" />
                </IconBtn>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`${tab}-head`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">
                {format(new Date(), "EEEE, MMM d")}
              </div>
              <h1 className="font-serif text-4xl tracking-tight">
                {tab === "tasks" ? "Tasks" : tab === "notes" ? "Notes" : tab === "settings" ? "Settings" : "Calendry"}
              </h1>

            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait">
        {tab === "home" && (
          <HomePage
            key="home"
            goToTab={setTab}
            onNewEvent={openNew}
            onNewTask={openNewTask}
            onEditEvent={openEdit}
            onEditTask={openEditTask}
            onEditNote={openEditNote}
            onSelectDay={(d) => { setSelected(d); setCursor(d); }}
          />
        )}
        {tab === "calendar" && (

          <motion.section
            key="month"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="px-4"
          >
            <div className="grid grid-cols-7 px-2 pt-2 pb-3 text-center text-[10px] uppercase tracking-[0.2em] text-clay-muted">
              {WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <motion.div
              key={format(cursor, "yyyy-MM")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-7 gap-1"
            >
              {days.map((d) => {
                const inMonth = isSameMonth(d, cursor);
                const isSel = isSameDay(d, selected);
                const isTodayD = isSameDay(d, new Date());
                const dots = dayHasEvents.get(iso(d)) ?? [];
                return (
                  <motion.button
                    key={iso(d)}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setSelected(d)}
                    className="relative flex aspect-square flex-col items-center justify-center rounded-2xl"
                    style={{
                      background: isSel ? "var(--clay)" : "transparent",
                      color: isSel ? "var(--ivory)" : inMonth ? "var(--clay)" : "var(--clay-muted)",
                    }}
                  >
                    {isTodayD && !isSel && (
                      <span className="absolute inset-1 rounded-2xl" style={{ border: "1px dashed var(--hairline)" }} />
                    )}
                    <span className="font-serif text-lg leading-none">{format(d, "d")}</span>
                    <span className="mt-1 flex h-1.5 gap-0.5">
                      {dots.slice(0, 3).map((d2, i) => {
                        const c = isSel ? "var(--ivory)" : d2.color;
                        return (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full"
                            style={d2.hollow
                              ? { background: "transparent", border: `1px solid ${c}` }
                              : { background: c }}
                          />
                        );
                      })}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>

            {!daySheetOpen && (
              <motion.div
                layoutId="day-widget"
                drag="y"
                dragListener={false}
                dragControls={dayDrag}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.5, bottom: 0 }}
                dragSnapToOrigin
                onDragStart={() => haptic(8)}
                onDragEnd={(_, info) => {
                  if (info.offset.y < -60 || info.velocity.y < -500) { haptic(14); openDaySheet(); }
                }}
                transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
                className="mt-6 rounded-3xl bg-surface p-5"
                style={{ border: "1px solid var(--hairline)" }}
              >
                {/* Only this notch area starts the swipe-up */}
                <div
                  onPointerDown={(e) => dayDrag.start(e)}
                  className="-mt-2 mb-1 flex cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
                >
                  <div className="h-1.5 w-12 rounded-full" style={{ background: "var(--hairline)" }} />
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-clay-soft">{format(selected, "EEEE")}</div>
                    <div className="font-serif text-2xl">{format(selected, "MMMM d")}</div>
                  </div>
                  <button
                    onClick={() => { haptic(10); openDaySheet(); }}
                    className="rounded-full px-3 py-1.5 text-xs text-clay-soft transition-colors hover:text-clay"
                    style={{ border: "1px solid var(--hairline)" }}
                  >
                    Open day
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {selectedEvents.length === 0 && (
                    <div className="hairline-t pt-4 text-sm text-clay-muted">A quiet day. Tap + to add something.</div>
                  )}
                  <AnimatePresence initial={false}>
                    {selectedEvents.slice(0, 3).map((e, i) => {
                      const s = styleOf(e.tag);
                      return (
                        <motion.button
                          key={e.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => openEdit(e.id)}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-surface-hover"
                        >
                          <span className="h-8 w-1 rounded-full" style={{ background: s.dot }} />
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-[15px]">{e.title}</div>
                            <div className="text-xs text-clay-soft">{e.allDay ? "All-day" : `${e.start} – ${e.end}`}</div>
                          </div>
                          <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest"
                            style={{ background: s.bg, color: s.text }}>
                            {s.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                  {selectedEvents.length > 3 && (
                    <div className="pt-1 text-center text-xs text-clay-muted">+ {selectedEvents.length - 3} more</div>
                  )}
                </div>
                {!hintSeen && <SwipeHint />}
              </motion.div>
            )}
          </motion.section>
        )}

        {tab === "tasks" && <TasksPage key="tasks" onEdit={openEditTask} />}
        {tab === "notes" && <NotesPage key="notes" onEdit={openEditNote} />}
        {tab === "settings" && <SettingsPage key="settings" />}
      </AnimatePresence>

      {/* Floating add */}
      <motion.button
        key={fabLabel}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: fabHidden ? 0 : 1, y: fabHidden ? 20 : 0 }}
        transition={{ duration: 0.3 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => { haptic(12); fabAction(); }}
        aria-label={fabLabel}
        style={{ pointerEvents: fabHidden ? "none" : "auto" }}
        className="fixed bottom-24 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-clay text-ivory shadow-[0_20px_40px_-15px_rgba(74,63,53,0.55)]"
      >

        <Plus className="h-6 w-6" />
      </motion.button>

      <BottomNav tab={tab} setTab={setTab} />

      <DaySheet
        open={daySheetOpen}
        onClose={() => setDaySheetOpen(false)}
        selected={selected}
        setSelected={setSelected}
        onEdit={openEdit}
        onEditTask={openEditTask}
        onCreateRange={openRange}
      />


      <EventEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editingId={editingId}
        defaultDate={iso(selected)}
        defaultStart={draftTimes?.start}
        defaultEnd={draftTimes?.end}
      />

      <TaskEditor
        open={taskEditorOpen}
        onClose={() => setTaskEditorOpen(false)}
        editingId={editingTaskId}
      />
      <UndoToast />
      <Onboarding onFinish={() => setTab("tasks")} />

      <NoteEditor
        open={noteEditorOpen}
        onClose={() => setNoteEditorOpen(false)}
        editingId={editingNoteId}
      />
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover hover:text-clay"
    >
      {children}
    </motion.button>
  );
}

function SegBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
      style={{ color: active ? "var(--clay)" : "var(--clay-soft)" }}
    >
      {active && (
        <motion.span
          layoutId="seg-pill"
          className="absolute inset-0 rounded-full bg-surface shadow-sm"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <span className="relative flex items-center gap-2">{icon}{label}</span>
    </button>
  );
}
