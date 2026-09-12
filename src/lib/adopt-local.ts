import { supabase } from "@/integrations/supabase/client";

/**
 * When a signed-out user (whose data lives only in this browser) signs in:
 *  - brand-new account with nothing stored → move the local data up to the cloud
 *  - existing account that already has data → the cloud copy wins, local is dropped
 *
 * Runs once per account per device.
 */

const LOCAL_KEYS = {
  events: "calendry.events.v1",
  tasks: "calendry.tasks.v1",
  notes: "calendry.notes.v1",
} as const;

const doneKey = (userId: string) => `calendry.adopted.${userId}`;

type AnyRec = Record<string, unknown>;

function readLocal(table: keyof typeof LOCAL_KEYS): AnyRec[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEYS[table]);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as AnyRec[]) : [];
  } catch {
    return [];
  }
}

function clearLocal() {
  for (const k of Object.values(LOCAL_KEYS)) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

function eventRow(e: AnyRec, userId: string) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    title: str(e.title),
    date: str(e.date) || new Date().toISOString().slice(0, 10),
    start_time: str(e.start, "09:00"),
    end_time: str(e.end, "10:00"),
    tag: str(e.tag),
    notes: typeof e.notes === "string" ? e.notes : null,
    all_day: !!e.allDay,
    reminders: Array.isArray(e.reminders) ? (e.reminders as string[]) : [],
  };
}

function taskRow(t: AnyRec, userId: string, i: number) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    title: str(t.title),
    done: !!t.done,
    due: typeof t.due === "string" ? t.due : null,
    tag: typeof t.tag === "string" ? t.tag : null,
    priority: str(t.priority, "med"),
    notes: typeof t.notes === "string" ? t.notes : null,
    position: i,
    reminders: Array.isArray(t.reminders) ? (t.reminders as string[]) : [],
  };
}

function noteRow(n: AnyRec, userId: string, i: number) {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    title: str(n.title),
    body: str(n.body),
    images: Array.isArray(n.images) ? n.images : [],
    tag: typeof n.tag === "string" ? n.tag : null,
    position: i,
  };
}

async function remoteHasData() {
  for (const table of ["events", "tasks", "notes"] as const) {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (error) throw error;
    if ((count ?? 0) > 0) return true;
  }
  return false;
}

async function run(userId: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(doneKey(userId))) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  if (await remoteHasData()) {
    // Existing account: the account's own content replaces whatever is on this device.
    clearLocal();
    localStorage.setItem(doneKey(userId), "1");
    return;
  }

  const events = readLocal("events");
  const tasks = readLocal("tasks");
  const notes = readLocal("notes");

  if (events.length) {
    const { error } = await supabase.from("events").insert(events.map((e) => eventRow(e, userId)) as never);
    if (error) throw error;
  }
  if (tasks.length) {
    const { error } = await supabase.from("tasks").insert(tasks.map((t, i) => taskRow(t, userId, i)) as never);
    if (error) throw error;
  }
  if (notes.length) {
    const { error } = await supabase.from("notes").insert(notes.map((n, i) => noteRow(n, userId, i)) as never);
    if (error) throw error;
  }

  clearLocal();
  localStorage.setItem(doneKey(userId), "1");
}

const inflight = new Map<string, Promise<void>>();

export function adoptLocalData(userId: string): Promise<void> {
  let p = inflight.get(userId);
  if (!p) {
    p = run(userId)
      .catch(() => { /* retry on the next refresh */ })
      .finally(() => { inflight.delete(userId); });
    inflight.set(userId, p);
  }
  return p;
}
