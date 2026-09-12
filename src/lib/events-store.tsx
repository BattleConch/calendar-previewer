import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeTable } from "./cloud";
import { enqueue, pendingCount, readCache, useSyncOnReconnect, writeCache } from "./offline";
import { useAuth } from "./auth";
import { adoptLocalData } from "./adopt-local";

export type TagColor = string;

export type CalEvent = {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  tag?: TagColor;
  notes?: string;
  allDay?: boolean;
  reminders?: string[];
  /** Where the event came from: the app itself, or a synced Google calendar. */
  source?: "local" | "google";
  organizerName?: string;
  organizerEmail?: string;
  isOwner?: boolean;
  recurringEventId?: string;
};


type Ctx = {
  events: CalEvent[];
  add: (e: Omit<CalEvent, "id">) => CalEvent;
  update: (id: string, patch: Partial<CalEvent>) => void;
  remove: (id: string) => void;
  byDate: (d: string) => CalEvent[];
};

const EventsContext = createContext<Ctx | null>(null);
const KEY = "calendry.events.v1";

function seed(): CalEvent[] {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const t = new Date(today);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const twoAhead = new Date(today); twoAhead.setDate(today.getDate() + 2);
  return [
    { id: "s1", title: "Morning stretch", date: iso(t), start: "07:30", end: "08:00", tag: "green", notes: "Slow flow, 30 min." },
    { id: "s2", title: "Design review", date: iso(t), start: "10:00", end: "11:00", tag: "blue" },
    { id: "s3", title: "Lunch with Mira", date: iso(t), start: "12:30", end: "13:30", tag: "orange", notes: "Ivory café, corner table." },
    { id: "s4", title: "Deep work — writing", date: iso(t), start: "15:00", end: "17:00", tag: "yellow" },
    { id: "s5", title: "Pottery class", date: iso(tomorrow), start: "18:30", end: "20:00", tag: "pink" },
    { id: "s6", title: "Weekend planning", date: iso(twoAhead), start: "09:00", end: "09:30", tag: "teal" },
  ];
}

type Row = {
  id: string; title: string; date: string; start_time: string; end_time: string; tag: string; notes: string | null; all_day?: boolean | null; reminders?: string[] | null;
  source?: string | null; organizer_name?: string | null; organizer_email?: string | null; is_owner?: boolean | null; recurring_event_id?: string | null;
};

const fromRow = (r: Row): CalEvent => ({
  id: r.id,
  title: r.title,
  date: r.date,
  start: r.start_time.slice(0, 5),
  end: r.end_time.slice(0, 5),
  tag: (r.tag ? (r.tag as TagColor) : undefined),
  notes: r.notes ?? undefined,
  allDay: r.all_day ?? false,
  reminders: r.reminders ?? [],
  source: r.source === "google" ? "google" : "local",
  organizerName: r.organizer_name ?? undefined,
  organizerEmail: r.organizer_email ?? undefined,
  isOwner: r.is_owner ?? true,
  recurringEventId: r.recurring_event_id ?? undefined,
});


function toRow(e: Partial<CalEvent>) {
  const row: Record<string, unknown> = {};
  if (e.title !== undefined) row.title = e.title;
  if (e.date !== undefined) row.date = e.date;
  if (e.start !== undefined) row.start_time = e.start;
  if (e.end !== undefined) row.end_time = e.end;
  if ("tag" in e) row.tag = e.tag ?? "";
  if (e.notes !== undefined) row.notes = e.notes ?? null;
  if (e.allDay !== undefined) row.all_day = !!e.allDay;
  if (e.reminders !== undefined) row.reminders = e.reminders ?? [];
  return row;
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Local (signed-out) mode: read from this device.
  useEffect(() => {
    if (userId) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEvents(JSON.parse(raw));
      else setEvents(seed());
    } catch {
      setEvents(seed());
    }
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (userId || !hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(events)); } catch {}
  }, [events, hydrated, userId]);

  // Cloud mode: offline-first — show the cached copy instantly, then refresh.
  useEffect(() => {
    if (!userId) return;
    const cached = readCache<CalEvent>("events", userId);
    if (cached) setEvents(cached);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    writeCache("events", userId, events);
  }, [events, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (pendingCount() > 0) return; // don't clobber local changes waiting to sync
    try {
      await adoptLocalData(userId);
      const { data } = await supabase.from("events").select("*").order("date").order("start_time");
      if (data) setEvents((data as unknown as Row[]).map(fromRow));
    } catch { /* offline */ }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
    return subscribeTable("events", userId, () => { void refresh(); });
  }, [userId, refresh]);

  useSyncOnReconnect(!!userId, refresh);

  const value = useMemo<Ctx>(() => ({
    events,
    add: (e) => {
      const ev = { ...e, id: crypto.randomUUID() };
      setEvents((prev) => [...prev, ev]);
      if (userId) {
        enqueue({ table: "events", op: "insert", id: ev.id, payload: { id: ev.id, user_id: userId, ...toRow(ev) } });
      }
      return ev;
    },
    update: (id, patch) => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      if (userId) enqueue({ table: "events", op: "update", id, payload: toRow(patch) });
    },
    remove: (id) => {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (userId) enqueue({ table: "events", op: "delete", id });
    },
    byDate: (d) => events.filter((e) => e.date === d).sort((a, b) => a.start.localeCompare(b.start)),
  }), [events, userId, refresh]);

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be inside EventsProvider");
  return ctx;
}


export type TagStyle = { bg: string; text: string; dot: string; ring: string; label: string };

const tagStyle = (key: string, label: string): TagStyle => ({
  bg: `var(--tag-${key}-bg)`,
  text: `var(--tag-${key})`,
  dot: `var(--tag-${key})`,
  ring: `color-mix(in srgb, var(--tag-${key}) 38%, transparent)`,
  label,
});

export const TAG_STYLES: Record<string, TagStyle> = {
  blue:   tagStyle("blue", "Focus"),
  red:    tagStyle("red", "Urgent"),
  green:  tagStyle("green", "Health"),
  yellow: tagStyle("yellow", "Ideas"),
  orange: tagStyle("orange", "Social"),
  teal:   tagStyle("teal", "Plan"),
  purple: tagStyle("purple", "Study"),
  pink:   tagStyle("pink", "Joy"),
};

export const NO_TAG_STYLE: TagStyle = {
  bg: "var(--surface-hover)",
  text: "var(--clay-soft)",
  dot: "var(--clay-muted)",
  ring: "var(--hairline)",
  label: "None",
};

export const tagStyleOf = (tag?: TagColor): TagStyle => (tag ? (TAG_STYLES[tag] ?? NO_TAG_STYLE) : NO_TAG_STYLE);

