import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SyncTable = "events" | "tasks" | "notes" | "tags";
type Op = "insert" | "update" | "delete";

export type Pending = {
  key: string;
  table: SyncTable;
  op: Op;
  id: string;
  payload?: Record<string, unknown>;
  at: number;
};

const QUEUE_KEY = "calendry.outbox.v1";
const cacheKey = (table: SyncTable, userId: string) => `calendry.cache.${table}.${userId}`;

/* ---------------- local cache of the cloud data ---------------- */

export function readCache<T>(table: SyncTable, userId: string): T[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(table, userId));
    return raw ? (JSON.parse(raw) as T[]) : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(table: SyncTable, userId: string, items: T[]) {
  try {
    localStorage.setItem(cacheKey(table, userId), JSON.stringify(items));
  } catch {
    /* storage full or unavailable */
  }
}

/* ---------------- outbox of unsynced changes ---------------- */

function readQueue(): Pending[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Pending[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: Pending[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(q.length));
}

const listeners = new Set<(n: number) => void>();

export function pendingCount() {
  return readQueue().length;
}

export function enqueue(entry: Omit<Pending, "key" | "at">) {
  const q = readQueue();
  // Collapse repeated edits to the same row so the queue stays small.
  if (entry.op === "update") {
    const i = q.findIndex((p) => p.table === entry.table && p.id === entry.id && (p.op === "update" || p.op === "insert"));
    if (i >= 0) {
      q[i] = { ...q[i], payload: { ...(q[i].payload ?? {}), ...(entry.payload ?? {}) } };
      writeQueue(q);
      void flushQueue();
      return;
    }
  }
  if (entry.op === "delete") {
    const remaining = q.filter((p) => !(p.table === entry.table && p.id === entry.id));
    const wasNeverSynced = q.some((p) => p.table === entry.table && p.id === entry.id && p.op === "insert");
    if (wasNeverSynced) {
      // Row only ever existed locally — drop it entirely.
      writeQueue(remaining);
      return;
    }
    writeQueue([...remaining, { ...entry, key: crypto.randomUUID(), at: Date.now() }]);
    void flushQueue();
    return;
  }
  writeQueue([...q, { ...entry, key: crypto.randomUUID(), at: Date.now() }]);
  void flushQueue();
}

let flushing = false;

export async function flushQueue(): Promise<boolean> {
  if (flushing) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  const q = readQueue();
  if (q.length === 0) return true;

  flushing = true;
  let changed = false;
  try {
    for (const entry of q) {
      try {
        const t = supabase.from(entry.table);
        const res =
          entry.op === "insert"
            ? await t.insert(entry.payload as never)
            : entry.op === "update"
              ? await t.update(entry.payload as never).eq("id", entry.id)
              : await t.delete().eq("id", entry.id);
        if (res.error) {
          // Network-ish failure: stop and retry later. Other errors: drop the entry.
          if (!res.error.message || /fetch|network|Failed/i.test(res.error.message)) break;
        }
        const rest = readQueue().filter((p) => p.key !== entry.key);
        writeQueue(rest);
        changed = true;
      } catch {
        break; // offline again
      }
    }
  } finally {
    flushing = false;
  }
  return changed;
}

/* ---------------- hooks ---------------- */

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    set();
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);
  return online;
}

/**
 * Flushes queued changes whenever the browser comes back online (and on an
 * interval, since `online` events can be unreliable). Calls `onSynced` after
 * anything was actually pushed so the caller can re-read from the cloud.
 */
export function useSyncOnReconnect(enabled: boolean, onSynced: () => void) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = async () => {
      const changed = await flushQueue();
      if (changed && !cancelled) onSynced();
    };
    void run();
    window.addEventListener("online", run);
    const iv = window.setInterval(run, 20000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
      window.clearInterval(iv);
    };
  }, [enabled, onSynced]);
}

export function usePendingCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(pendingCount());
    const l = (c: number) => setN(c);
    listeners.add(l);
    const iv = window.setInterval(() => setN(pendingCount()), 5000);
    return () => {
      listeners.delete(l);
      window.clearInterval(iv);
    };
  }, []);
  return n;
}
