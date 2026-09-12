import { motion, Reorder, useDragControls } from "framer-motion";
import { useEffect, useState } from "react";

import { format, isSameDay, addDays, startOfWeek, parseISO } from "date-fns";
import { ArrowRight, Plus, GripVertical, Check } from "lucide-react";
import { useEvents, type TagColor } from "@/lib/events-store";
import { useTags } from "@/lib/tags-store";
import { MyTagsButton } from "./TagsManager";
import { useTasks } from "@/lib/tasks-store";
import { useNotes } from "@/lib/notes-store";
import { haptic } from "@/lib/haptics";
import type { Tab } from "./BottomNav";

const iso = (d: Date) => format(d, "yyyy-MM-dd");


type WidgetId = "week" | "today" | "tasks" | "upcoming" | "notes";
const DEFAULT_ORDER: WidgetId[] = ["week", "today", "tasks", "upcoming", "notes"];
const ORDER_KEY = "calendry.home.order.v1";

function loadOrder(): WidgetId[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw) as WidgetId[];
    const kept = parsed.filter((id) => DEFAULT_ORDER.includes(id));
    for (const id of DEFAULT_ORDER) if (!kept.includes(id)) kept.push(id);
    return kept;
  } catch {
    return DEFAULT_ORDER;
  }
}

export function HomePage({
  goToTab,
  onNewEvent,
  onNewTask,
  onEditEvent,
  onEditTask,
  onEditNote,
  onSelectDay,
}: {
  goToTab: (t: Tab) => void;
  onNewEvent: () => void;
  onNewTask: () => void;
  onEditEvent: (id: string) => void;
  onEditTask: (id: string) => void;
  onEditNote: (id: string) => void;
  onSelectDay: (d: Date) => void;
}) {
  const { events, byDate } = useEvents();
  const { tasks } = useTasks();
  const { notes } = useNotes();
  const { styleOf } = useTags();
  const dotOf = (tag?: TagColor) => (tag ? styleOf(tag).dot : "var(--clay-muted)");

  const now = new Date();
  const hour = now.getHours();
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER);
  const [arranging, setArranging] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOrder(loadOrder());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch { /* ignore */ }
  }, [order, mounted]);

  const greet = !mounted
    ? "Welcome back"
    : hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const todayIso = iso(now);
  const todayEvents = byDate(todayIso);
  const todayTasks = tasks.filter((t) => !t.done && t.due === todayIso);
  const nowMin = hour * 60 + now.getMinutes();
  const upcoming = events
    .filter((e) => {
      if (e.date > todayIso) return true;
      if (e.date < todayIso) return false;
      const [h, m] = e.start.split(":").map(Number);
      return h * 60 + m > nowMin;
    })
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .slice(0, 4);
  const upcomingTasks = tasks
    .filter((t) => !t.done && t.due && t.due > todayIso)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""))
    .slice(0, 4);

  const pendingAll = tasks.filter((t) => !t.done);
  const pending = pendingAll.slice(0, 4);
  const recentNotes = notes.slice(0, 4);
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(now, { weekStartsOn: 0 }), i));

  const todayCount = todayEvents.length + todayTasks.length;

  const content: Record<WidgetId, { title: string; onGo?: () => void; body: React.ReactNode; footer?: React.ReactNode }> = {
    week: {
      title: "This week",
      body: (
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => {
            const count = byDate(iso(d)).length + tasks.filter((t) => !t.done && t.due === iso(d)).length;
            const today = isSameDay(d, now);
            return (
              <motion.button
                key={iso(d)}
                whileTap={{ scale: 0.94 }}
                onClick={() => { haptic(8); onSelectDay(d); goToTab("calendar"); }}
                className="flex flex-col items-center gap-1 rounded-2xl px-1 py-2"
                style={{
                  background: today ? "var(--clay)" : "transparent",
                  color: today ? "var(--ivory)" : "var(--clay)",
                  border: `1px solid ${today ? "var(--clay)" : "var(--hairline)"}`,
                }}
              >
                <span className="text-[9px] uppercase tracking-widest opacity-70">{format(d, "EEEEE")}</span>
                <span className="font-serif text-base leading-none">{format(d, "d")}</span>
                <span className="flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(3, count) }).map((_, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: today ? "var(--ivory)" : "var(--clay-muted)" }} />
                  ))}
                </span>
              </motion.button>
            );
          })}
        </div>
      ),
    },
    today: {
      title: "Today",
      onGo: () => goToTab("calendar"),
      body: todayCount === 0 ? (
        <Empty label="Nothing scheduled." />
      ) : (
        <div className="space-y-1.5">
          {todayEvents.slice(0, 4).map((e) => (
            <Row key={e.id} color={dotOf(e.tag)} title={e.title} sub={`${e.start} – ${e.end}`} onClick={() => onEditEvent(e.id)} />
          ))}
          {todayTasks.slice(0, 4).map((t) => (
            <Row key={t.id} color={dotOf(t.tag)} title={t.title} sub="Due today" onClick={() => onEditTask(t.id)} check />
          ))}
        </div>
      ),
      footer: <DashedBtn label="Add event" onClick={onNewEvent} />,
    },
    tasks: {
      title: "Tasks",
      onGo: () => goToTab("tasks"),
      body: pending.length === 0 ? (
        <Empty label="All caught up." />
      ) : (
        <div className="space-y-1.5">
          {pending.map((t) => (
            <Row
              key={t.id}
              color={dotOf(t.tag)}
              title={t.title}
              sub={t.due ? format(parseISO(t.due), "EEE, MMM d") : undefined}
              onClick={() => onEditTask(t.id)}
              check
            />
          ))}
          {pendingAll.length > pending.length && (
            <button onClick={() => goToTab("tasks")} className="pl-3 pt-1 text-xs text-clay-muted">
              +{pendingAll.length - pending.length} more
            </button>
          )}
        </div>
      ),
      footer: <DashedBtn label="Add task" onClick={onNewTask} />,
    },
    upcoming: {
      title: "Upcoming",
      onGo: () => goToTab("calendar"),
      body: upcoming.length === 0 && upcomingTasks.length === 0 ? (
        <Empty label="The horizon is clear." />
      ) : (
        <div className="space-y-1.5">
          {upcoming.map((e) => (
            <Row
              key={e.id}
              color={dotOf(e.tag)}
              title={e.title}
              sub={`${format(parseISO(e.date), "EEE, MMM d")} · ${e.start}`}
              onClick={() => onEditEvent(e.id)}
            />
          ))}
          {upcomingTasks.map((t) => (
            <Row
              key={t.id}
              color={dotOf(t.tag)}
              title={t.title}
              sub={`Due ${format(parseISO(t.due!), "EEE, MMM d")}`}
              onClick={() => onEditTask(t.id)}
              check
            />
          ))}
        </div>
      ),
    },
    notes: {
      title: "Notes",
      onGo: () => goToTab("notes"),
      body: recentNotes.length === 0 ? (
        <Empty label="No notes yet." />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {recentNotes.map((n) => (
            <motion.button
              key={n.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onEditNote(n.id)}
              className="relative overflow-hidden rounded-2xl bg-surface-hover p-3 pl-4 text-left"
              style={{ border: "1px solid var(--hairline)" }}
            >
              <span className="absolute left-0 top-0 h-full w-1.5" style={{ background: dotOf(n.tag) }} />
              <div className="truncate font-serif text-base">{n.title || "Untitled"}</div>
              {n.body && <div className="mt-0.5 line-clamp-2 text-[11px] text-clay-soft">{n.body}</div>}
            </motion.button>
          ))}
        </div>
      ),
    },
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-4 px-4 pb-4"
    >
      <div className="flex items-end justify-between px-2">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">{greet}</div>
          <div className="mt-1 text-sm text-clay-soft">
            {todayCount === 0
              ? "No plans today — a clear page."
              : `${todayCount} ${todayCount === 1 ? "thing" : "things"} on today.`}
            {pendingAll.length > 0 && ` ${pendingAll.length} open ${pendingAll.length === 1 ? "task" : "tasks"}.`}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
        <MyTagsButton />
        <button
          onClick={() => { haptic(8); setArranging((a) => !a); }}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] text-clay-soft"
          style={{ border: "1px solid var(--hairline)" }}
        >
          {arranging ? <><Check className="h-3 w-3" /> Done</> : <><GripVertical className="h-3 w-3" /> Arrange</>}
        </button>
        </div>
      </div>

      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-4">
        {order.map((id) => (
          <WidgetItem key={id} id={id} arranging={arranging} {...content[id]} />
        ))}
      </Reorder.Group>
    </motion.section>
  );
}

function WidgetItem({
  id,
  arranging,
  title,
  onGo,
  body,
  footer,
}: {
  id: WidgetId;
  arranging: boolean;
  title: string;
  onGo?: () => void;
  body: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className="rounded-3xl bg-surface p-4"
      style={{ border: "1px solid var(--hairline)" }}
      whileDrag={{ scale: 1.02, boxShadow: "0 18px 40px -20px rgba(74,63,53,0.45)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {arranging && (
            <button
              aria-label={`Reorder ${title}`}
              onPointerDown={(e) => { haptic(8); controls.start(e); }}
              className="touch-none text-clay-muted"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div className="text-xs uppercase tracking-[0.2em] text-clay-soft">{title}</div>
        </div>
        {onGo && !arranging && (
          <button onClick={onGo} className="inline-flex items-center gap-1 text-xs text-clay-muted">
            Open <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {body}
      {footer}
    </Reorder.Item>
  );
}

function Row({
  color,
  title,
  sub,
  onClick,
  check,
}: {
  color: string;
  title: string;
  sub?: string;
  onClick: () => void;
  check?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-surface-hover"
    >
      {check ? (
        <span className="h-4 w-4 shrink-0 rounded-md" style={{ border: `2px solid ${color}` }} />
      ) : (
        <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: color }} />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px]">{title}</div>
        {sub && <div className="text-[11px] text-clay-soft">{sub}</div>}
      </div>
    </motion.button>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="px-2 py-1 text-sm text-clay-muted">{label}</div>;
}

function DashedBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => { haptic(10); onClick(); }}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm text-clay-soft"
      style={{ border: "1px dashed var(--hairline)" }}
    >
      <Plus className="h-3.5 w-3.5" /> {label}
    </motion.button>
  );
}
