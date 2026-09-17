import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, format, isSameDay } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Plus,
  Settings as SettingsIcon,
  Tags as TagsIcon,
} from "lucide-react";
import { useEvents } from "@/lib/events-store";
import { useTasks } from "@/lib/tasks-store";
import { useTags } from "@/lib/tags-store";
import { formatTime, useHideNotes, useTimeFormat } from "@/lib/nav-prefs";
import { useReminderScheduler } from "@/lib/notifications";
import { NO_TAG, useTagFilter } from "@/components/TagFilter";
import { TasksPage } from "@/components/TasksPage";
import { NotesPage } from "@/components/NotesPage";
import { SettingsPage } from "@/components/SettingsPage";
import { TagsManager } from "@/components/TagsManager";
import { EventEditor } from "@/components/EventEditor";
import { TaskEditor } from "@/components/TaskEditor";
import { NoteEditor } from "@/components/NoteEditor";
import { SyncStatus } from "@/components/SyncStatus";
import { UndoToast } from "@/components/UndoToast";
import { Onboarding } from "@/components/Onboarding";
import type { CreateKind } from "@/components/KindSwitch";
import {
  MiniMonth,
  MonthView,
  TimeGridView,
  dayTitle,
  iso,
  weekDays,
  type DesktopView,
} from "./DesktopCalendar";

type Page = "calendar" | "tasks" | "notes" | "settings";

const VIEWS: DesktopView[] = ["month", "week", "day"];

export function DesktopShell() {
  const [page, setPage] = useState<Page>("calendar");
  const [view, setView] = useState<DesktopView>("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [tagsOpen, setTagsOpen] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const { events, byDate } = useEvents();
  const { tasks } = useTasks();
  const { tags, styleOf } = useTags();
  const timeFormat = useTimeFormat();
  const hideNotes = useHideNotes();
  const { selected: tagSel, setSelected: setTagSel, matches } = useTagFilter("calendry.desktop.tagfilter.v1");

  useReminderScheduler(events, tasks);

  useEffect(() => {
    if (hideNotes && page === "notes") setPage("calendar");
  }, [hideNotes, page]);

  const marks = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) s.add(e.date);
    for (const t of tasks) if (t.due && !t.done) s.add(t.due);
    return s;
  }, [events, tasks]);

  const openNewEvent = () => {
    setEditingId(null);
    setEditorOpen(true);
  };
  const openEditEvent = (id: string) => {
    setEditingId(id);
    setEditorOpen(true);
  };
  const openEditTask = (id: string | null) => {
    setEditingTaskId(id);
    setTaskEditorOpen(true);
  };
  const openEditNote = (id: string | null) => {
    setEditingNoteId(id);
    setNoteEditorOpen(true);
  };

  const switchKind = (kind: CreateKind) => {
    setEditorOpen(false);
    setTaskEditorOpen(false);
    setNoteEditorOpen(false);
    setEditingId(null);
    setEditingTaskId(null);
    setEditingNoteId(null);
    if (kind === "event") setEditorOpen(true);
    else if (kind === "task") setTaskEditorOpen(true);
    else setNoteEditorOpen(true);
  };

  const onNew = () => {
    if (page === "tasks") openEditTask(null);
    else if (page === "notes") openEditNote(null);
    else openNewEvent();
  };

  const step = (dir: 1 | -1) => {
    if (view === "month") {
      const next = addMonths(cursor, dir);
      setCursor(next);
    } else {
      const next = addDays(selected, view === "week" ? 7 * dir : dir);
      setSelected(next);
      setCursor(next);
    }
  };

  const goToday = () => {
    const t = new Date();
    setCursor(t);
    setSelected(t);
  };

  const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "tasks", label: "Tasks", icon: <CheckCircle2 className="h-4 w-4" /> },
    ...(hideNotes ? [] : [{ id: "notes" as const, label: "Notes", icon: <NotebookPen className="h-4 w-4" /> }]),
    { id: "settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> },
  ];

  const dayEvents = byDate(iso(selected)).filter((e) => matches(e.tag));
  const dayTasks = tasks.filter((t) => t.due === iso(selected) && matches(t.tag));

  const toggleTag = (id: string) =>
    setTagSel(tagSel.includes(id) ? tagSel.filter((x) => x !== id) : [...tagSel, id]);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-ivory text-clay">
      <SyncStatus />

      {/* Sidebar */}
      <aside
        className="flex w-[290px] shrink-0 flex-col gap-4 overflow-y-auto px-5 py-6"
        style={{ borderRight: "1px solid var(--hairline)" }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-clay-soft">Calendry</div>
          <h1 className="font-serif text-2xl tracking-tight">{format(new Date(), "yyyy")}</h1>
        </div>

        <button
          onClick={onNew}
          className="flex items-center justify-center gap-2 rounded-full bg-clay px-4 py-2.5 text-sm font-medium text-ivory transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New
        </button>

        <nav className="flex flex-col gap-0.5">
          {navItems.map((it) => {
            const active = page === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setPage(it.id)}
                className="relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors"
                style={{ color: active ? "var(--ivory)" : "var(--clay-soft)" }}
              >
                {active && (
                  <motion.span layoutId="desktop-nav-pill" className="absolute inset-0 rounded-xl bg-clay" />
                )}
                <span className="relative flex items-center gap-2.5">
                  {it.icon}
                  {it.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setTagsOpen(true)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-clay-soft transition-colors hover:bg-surface-hover hover:text-clay"
          >
            <TagsIcon className="h-4 w-4" /> Tags
          </button>
        </nav>

        <MiniMonth
          cursor={cursor}
          selected={selected}
          marks={marks}
          onSelect={(d) => {
            setSelected(d);
            setCursor(d);
            setPage("calendar");
          }}
          onCursor={setCursor}
        />

        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-clay-muted">Filters</span>
            {tagSel.length > 0 && (
              <button onClick={() => setTagSel([])} className="text-[11px] text-clay-soft hover:text-clay">
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {tags.map((t) => {
              const on = tagSel.length === 0 || tagSel.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-hover"
                  style={{ opacity: on ? 1 : 0.45 }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--tag-${t.color})` }} />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => toggleTag(NO_TAG)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-hover"
              style={{ opacity: tagSel.length === 0 || tagSel.includes(NO_TAG) ? 1 : 0.45 }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--clay-muted)" }} />
              No tag
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex shrink-0 items-center justify-between gap-4 px-6 py-4"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="truncate font-serif text-2xl tracking-tight">
              {page === "calendar" ? dayTitle(view, cursor, selected) : navItems.find((n) => n.id === page)?.label}
            </h2>
          </div>

          {page === "calendar" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  aria-label="Previous"
                  onClick={() => step(-1)}
                  className="grid h-9 w-9 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover hover:text-clay"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToday}
                  className="rounded-full px-3 py-1.5 text-xs text-clay-soft transition-colors hover:text-clay"
                  style={{ border: "1px solid var(--hairline)" }}
                >
                  Today
                </button>
                <button
                  aria-label="Next"
                  onClick={() => step(1)}
                  className="grid h-9 w-9 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover hover:text-clay"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div
                className="flex items-center gap-1 rounded-full bg-surface p-1"
                style={{ border: "1px solid var(--hairline)" }}
              >
                {VIEWS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="relative rounded-full px-3 py-1 text-xs capitalize"
                    style={{ color: view === v ? "var(--ivory)" : "var(--clay-soft)" }}
                  >
                    {view === v && (
                      <motion.span layoutId="desktop-view-pill" className="absolute inset-0 rounded-full bg-clay" />
                    )}
                    <span className="relative">{v}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto p-5">
            <AnimatePresence mode="wait">
              {page === "calendar" && (
                <motion.div
                  key={view}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="h-full min-h-[620px]"
                >
                  {view === "month" ? (
                    <MonthView
                      cursor={cursor}
                      selected={selected}
                      onSelect={(d) => setSelected(d)}
                      onOpenEvent={openEditEvent}
                      onOpenTask={openEditTask}
                      matches={matches}
                    />
                  ) : (
                    <TimeGridView
                      days={view === "week" ? weekDays(selected) : [selected]}
                      selected={selected}
                      onSelect={setSelected}
                      onOpenEvent={openEditEvent}
                      matches={matches}
                    />
                  )}
                </motion.div>
              )}
              {page === "tasks" && (
                <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-3xl">
                  <TasksPage onEdit={openEditTask} />
                </motion.div>
              )}
              {page === "notes" && (
                <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-4xl">
                  <NotesPage onEdit={openEditNote} />
                </motion.div>
              )}
              {page === "settings" && (
                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-2xl">
                  <SettingsPage />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {page === "calendar" && (
            <aside
              className="hidden w-[320px] shrink-0 flex-col overflow-y-auto p-5 xl:flex"
              style={{ borderLeft: "1px solid var(--hairline)" }}
            >
              <div className="text-xs uppercase tracking-[0.2em] text-clay-soft">{format(selected, "EEEE")}</div>
              <div className="font-serif text-2xl">{format(selected, "MMMM d")}</div>

              <div className="mt-4 flex flex-col gap-2">
                {dayEvents.length === 0 && dayTasks.length === 0 && (
                  <div className="hairline-t pt-4 text-sm text-clay-muted">Nothing scheduled.</div>
                )}
                {dayEvents.map((e) => {
                  const s = styleOf(e.tag);
                  return (
                    <button
                      key={e.id}
                      onClick={() => openEditEvent(e.id)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-surface-hover"
                    >
                      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: s.dot }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{e.title}</span>
                        <span className="block text-xs text-clay-soft">
                          {e.allDay
                            ? "All-day"
                            : `${formatTime(e.start, timeFormat)} – ${formatTime(e.end, timeFormat)}`}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openEditTask(t.id)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-surface-hover"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ border: `1.5px solid ${styleOf(t.tag).dot}` }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[15px]" style={{ opacity: t.done ? 0.5 : 1 }}>
                      {t.title}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      </main>

      <TagsManager open={tagsOpen} onClose={() => setTagsOpen(false)} />

      <EventEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editingId={editingId}
        defaultDate={iso(selected)}
        onSwitchKind={switchKind}
        showNoteOption={!hideNotes}
      />
      <TaskEditor
        open={taskEditorOpen}
        onClose={() => setTaskEditorOpen(false)}
        editingId={editingTaskId}
        onSwitchKind={switchKind}
        showNoteOption={!hideNotes}
      />
      <NoteEditor open={noteEditorOpen} onClose={() => setNoteEditorOpen(false)} editingId={editingNoteId} onSwitchKind={switchKind} />

      <UndoToast />
      <Onboarding onFinish={() => setPage("calendar")} />
    </div>
  );
}

/** Keeps `isSameDay` imported for future use in the agenda rail. */
export const __sameDay = isSameDay;
