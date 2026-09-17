import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useEvents, type CalEvent } from "@/lib/events-store";
import { useTasks, type Task } from "@/lib/tasks-store";
import { useTags } from "@/lib/tags-store";
import { formatTime, useTimeFormat } from "@/lib/nav-prefs";

export type DesktopView = "month" | "week" | "day";

export const iso = (d: Date) => format(d, "yyyy-MM-dd");

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthGrid(cursor: Date) {
  const start = startOfWeek(startOfMonth(cursor));
  const end = endOfWeek(endOfMonth(cursor));
  const out: Date[] = [];
  let d = start;
  while (d <= end) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

/* ------------------------------- mini month ------------------------------- */

export function MiniMonth({
  cursor,
  selected,
  onSelect,
  onCursor,
  marks,
}: {
  cursor: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  onCursor: (d: Date) => void;
  marks: Set<string>;
}) {
  const days = useMemo(() => monthGrid(cursor), [cursor]);

  return (
    <div className="rounded-2xl bg-surface p-3" style={{ border: "1px solid var(--hairline)" }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="font-serif text-base">{format(cursor, "MMMM yyyy")}</div>
        <div className="flex items-center gap-0.5">
          <button
            aria-label="Previous month"
            onClick={() => onCursor(addMonths(cursor, -1))}
            className="grid h-7 w-7 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover hover:text-clay"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Next month"
            onClick={() => onCursor(addMonths(cursor, 1))}
            className="grid h-7 w-7 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover hover:text-clay"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[9px] uppercase tracking-[0.18em] text-clay-muted">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="py-1">
            {d[0]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const sel = isSameDay(d, selected);
          return (
            <button
              key={iso(d)}
              onClick={() => onSelect(d)}
              className="relative grid aspect-square place-items-center rounded-lg text-[12px] transition-colors hover:bg-surface-hover"
              style={{
                background: sel ? "var(--clay)" : "transparent",
                color: sel
                  ? "var(--ivory)"
                  : isSameMonth(d, cursor)
                    ? "var(--clay)"
                    : "var(--clay-muted)",
                fontWeight: isToday(d) ? 700 : 400,
              }}
            >
              {format(d, "d")}
              {marks.has(iso(d)) && !sel && (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ background: "var(--clay-soft)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- month view ------------------------------- */

export function MonthView({
  cursor,
  selected,
  onSelect,
  onOpenEvent,
  onOpenTask,
  matches,
}: {
  cursor: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  onOpenEvent: (id: string) => void;
  onOpenTask: (id: string) => void;
  matches: (tag?: string) => boolean;
}) {
  const days = useMemo(() => monthGrid(cursor), [cursor]);
  const { events } = useEvents();
  const { tasks } = useTasks();
  const { styleOf } = useTags();
  const timeFormat = useTimeFormat();

  const eventsBy = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      if (!matches(e.tag)) continue;
      m.set(e.date, [...(m.get(e.date) ?? []), e]);
    }
    for (const list of m.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return m;
  }, [events, matches]);

  const tasksBy = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.due || t.done || !matches(t.tag)) continue;
      m.set(t.due, [...(m.get(t.due) ?? []), t]);
    }
    return m;
  }, [tasks, matches]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-3xl bg-surface" style={{ border: "1px solid var(--hairline)" }}>
      <div className="grid grid-cols-7 px-2 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-clay-muted">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 gap-px overflow-auto p-2 pt-0">
        {days.map((d) => {
          const key = iso(d);
          const dayEvents = eventsBy.get(key) ?? [];
          const dayTasks = tasksBy.get(key) ?? [];
          const sel = isSameDay(d, selected);
          return (
            <button
              key={key}
              onClick={() => onSelect(d)}
              className="flex min-h-[104px] flex-col gap-1 rounded-xl p-2 text-left transition-colors hover:bg-surface-hover"
              style={{
                border: sel ? "1px solid var(--clay)" : "1px solid transparent",
                background: isSameMonth(d, cursor) ? "transparent" : "color-mix(in srgb, var(--clay) 3%, transparent)",
              }}
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-serif text-sm"
                style={{
                  background: isToday(d) ? "var(--clay)" : "transparent",
                  color: isToday(d)
                    ? "var(--ivory)"
                    : isSameMonth(d, cursor)
                      ? "var(--clay)"
                      : "var(--clay-muted)",
                }}
              >
                {format(d, "d")}
              </span>
              <span className="flex min-h-0 w-full flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((e) => {
                  const s = styleOf(e.tag);
                  return (
                    <span
                      key={e.id}
                      role="button"
                      tabIndex={0}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onOpenEvent(e.id);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          ev.stopPropagation();
                          onOpenEvent(e.id);
                        }
                      }}
                      className="truncate rounded-md px-1.5 py-0.5 text-[11px]"
                      style={{ background: s.bg, color: s.text }}
                    >
                      {e.allDay ? "" : `${formatTime(e.start, timeFormat)} `}
                      {e.title}
                    </span>
                  );
                })}
                {dayTasks.slice(0, 2).map((t) => (
                  <span
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onOpenTask(t.id);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") {
                        ev.stopPropagation();
                        onOpenTask(t.id);
                      }
                    }}
                    className="flex items-center gap-1 truncate px-1 text-[11px] text-clay-soft"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ border: `1px solid ${styleOf(t.tag).dot}` }}
                    />
                    <span className="truncate">{t.title}</span>
                  </span>
                ))}
                {dayEvents.length + dayTasks.length > 5 && (
                  <span className="px-1 text-[10px] text-clay-muted">
                    +{dayEvents.length + dayTasks.length - 5} more
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- week / day timeline --------------------------- */

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_PX = 48;

function minutes(hhmm: string) {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function TimeGridView({
  days,
  selected,
  onSelect,
  onOpenEvent,
  matches,
}: {
  days: Date[];
  selected: Date;
  onSelect: (d: Date) => void;
  onOpenEvent: (id: string) => void;
  matches: (tag?: string) => boolean;
}) {
  const { events } = useEvents();
  const { styleOf } = useTags();
  const timeFormat = useTimeFormat();

  return (
    <div className="flex h-full min-h-0 flex-col rounded-3xl bg-surface" style={{ border: "1px solid var(--hairline)" }}>
      <div
        className="grid shrink-0 pr-3"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))`, borderBottom: "1px solid var(--hairline)" }}
      >
        <div />
        {days.map((d) => (
          <button
            key={iso(d)}
            onClick={() => onSelect(d)}
            className="flex flex-col items-center gap-0.5 py-2 transition-colors hover:bg-surface-hover"
          >
            <span className="text-[10px] uppercase tracking-[0.18em] text-clay-muted">{format(d, "EEE")}</span>
            <span
              className="grid h-7 w-7 place-items-center rounded-full font-serif text-sm"
              style={{
                background: isSameDay(d, selected) ? "var(--clay)" : "transparent",
                color: isSameDay(d, selected) ? "var(--ivory)" : "var(--clay)",
              }}
            >
              {format(d, "d")}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative grid pr-3"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))`, height: HOUR_PX * 24 }}
        >
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-clay-muted"
                style={{ top: h * HOUR_PX }}
              >
                {h === 0 ? "" : formatTime(`${String(h).padStart(2, "0")}:00`, timeFormat)}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const list = events
              .filter((e) => e.date === iso(d) && matches(e.tag))
              .sort((a, b) => a.start.localeCompare(b.start));
            return (
              <div key={iso(d)} className="relative" style={{ borderLeft: "1px solid var(--hairline)" }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0"
                    style={{ top: h * HOUR_PX, height: HOUR_PX, borderTop: "1px solid var(--hairline)" }}
                  />
                ))}
                {list.map((e) => {
                  const s = styleOf(e.tag);
                  const top = e.allDay ? 0 : (minutes(e.start) / 60) * HOUR_PX;
                  const height = e.allDay
                    ? 28
                    : Math.max(24, ((minutes(e.end) - minutes(e.start)) / 60) * HOUR_PX - 2);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onOpenEvent(e.id)}
                      className="absolute left-1 right-1 overflow-hidden rounded-lg px-2 py-1 text-left text-[11px]"
                      style={{ top, height, background: s.bg, color: s.text, border: `1px solid ${s.ring}` }}
                    >
                      <span className="block truncate font-medium">{e.title}</span>
                      {!e.allDay && (
                        <span className="block truncate opacity-80">
                          {formatTime(e.start, timeFormat)} – {formatTime(e.end, timeFormat)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function weekDays(d: Date) {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayTitle(view: DesktopView, cursor: Date, selected: Date) {
  if (view === "month") return format(cursor, "MMMM yyyy");
  if (view === "week") {
    const days = weekDays(selected);
    const a = days[0]!;
    const b = days[6]!;
    return isSameMonth(a, b)
      ? `${format(a, "MMM d")} – ${format(b, "d, yyyy")}`
      : `${format(a, "MMM d")} – ${format(b, "MMM d, yyyy")}`;
  }
  return format(selected, "EEEE, MMMM d, yyyy");
}

export function parseDay(d: string) {
  return parseISO(d);
}
