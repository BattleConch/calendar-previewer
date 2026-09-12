import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeTable } from "./cloud";
import { enqueue, pendingCount, readCache, useSyncOnReconnect, writeCache } from "./offline";
import { useAuth } from "./auth";
import { adoptLocalData } from "./adopt-local";
import type { TagColor } from "./events-store";

export type Priority = "low" | "med" | "high";
export type Task = {
  id: string;
  title: string;
  done: boolean;
  due?: string; // yyyy-MM-dd
  tag?: TagColor;
  priority: Priority;
  notes?: string;
  reminders?: string[];
};

export type UndoState = { id: string; title: string } | null;

type Ctx = {
  tasks: Task[];
  add: (t: Omit<Task, "id" | "done">) => Task;
  update: (id: string, patch: Partial<Task>) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  reorder: (ids: string[]) => void;
  lastCompleted: UndoState;
  undoComplete: () => void;
  dismissUndo: () => void;
};


const TasksContext = createContext<Ctx | null>(null);
const KEY = "calendry.tasks.v1";

function seed(): Task[] {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  return [
    { id: "t1", title: "Water the plants", done: false, due: iso(today), tag: "green", priority: "low" },
    { id: "t2", title: "Send project brief to Aiko", done: false, due: iso(today), tag: "blue", priority: "high" },
    { id: "t3", title: "Book pottery studio", done: false, due: iso(tomorrow), tag: "pink", priority: "med" },
    { id: "t4", title: "Read one chapter", done: true, tag: "purple", priority: "low" },
  ];
}

type Row = {
  id: string; title: string; done: boolean; due: string | null; tag: string | null;
  priority: string; notes: string | null; position: number; reminders?: string[] | null;
};

const fromRow = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  done: r.done,
  due: r.due ?? undefined,
  tag: (r.tag as TagColor) ?? undefined,
  priority: (r.priority as Priority) ?? "med",
  notes: r.notes ?? undefined,
  reminders: r.reminders ?? [],
});

function toRow(t: Partial<Task>) {
  const row: Record<string, unknown> = {};
  if (t.title !== undefined) row.title = t.title;
  if (t.done !== undefined) row.done = t.done;
  if (t.due !== undefined) row.due = t.due ?? null;
  if ("tag" in t) row.tag = t.tag ?? null;
  if (t.priority !== undefined) row.priority = t.priority;
  if (t.notes !== undefined) row.notes = t.notes ?? null;
  if (t.reminders !== undefined) row.reminders = t.reminders ?? [];
  return row;
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastCompleted, setLastCompleted] = useState<UndoState>(null);

  useEffect(() => {
    if (userId) return;
    try {
      const raw = localStorage.getItem(KEY);
      setTasks(raw ? JSON.parse(raw) : seed());
    } catch { setTasks(seed()); }
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (userId || !hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch {}
  }, [tasks, hydrated, userId]);

  useEffect(() => {
    if (!userId) return;
    const cached = readCache<Task>("tasks", userId);
    if (cached) setTasks(cached);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    writeCache("tasks", userId, tasks);
  }, [tasks, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (pendingCount() > 0) return;
    try {
      await adoptLocalData(userId);
      const { data } = await supabase.from("tasks").select("*").order("position");
      if (data) setTasks((data as unknown as Row[]).map(fromRow));
    } catch { /* offline */ }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
    return subscribeTable("tasks", userId, () => { void refresh(); });
  }, [userId, refresh]);

  useSyncOnReconnect(!!userId, refresh);

  const value = useMemo<Ctx>(() => ({
    tasks,
    add: (t) => {
      const task: Task = { ...t, id: crypto.randomUUID(), done: false };
      setTasks((prev) => [task, ...prev]);
      if (userId) {
        enqueue({
          table: "tasks",
          op: "insert",
          id: task.id,
          payload: { id: task.id, user_id: userId, position: Date.now() * -1, ...toRow(task) },
        });
      }
      return task;
    },
    update: (id, patch) => {
      const before = tasks.find((t) => t.id === id);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (userId) enqueue({ table: "tasks", op: "update", id, payload: toRow(patch) });
      if (patch.done === true && before && !before.done) setLastCompleted({ id, title: before.title });
    },
    toggle: (id) => {
      const before = tasks.find((t) => t.id === id);
      const next = !before?.done;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: next } : t)));
      if (userId) enqueue({ table: "tasks", op: "update", id, payload: { done: next } });
      if (next && before) setLastCompleted({ id, title: before.title });
    },
    remove: (id) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (userId) enqueue({ table: "tasks", op: "delete", id });
    },
    reorder: (ids) => {
      setTasks((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        const next = ids.map((id) => map.get(id)).filter(Boolean) as Task[];
        for (const t of prev) if (!ids.includes(t.id)) next.push(t);
        return next;
      });
      if (userId) {
        ids.forEach((id, i) => enqueue({ table: "tasks", op: "update", id, payload: { position: i } }));
      }
    },
    lastCompleted,
    undoComplete: () => {
      if (!lastCompleted) return;
      const { id } = lastCompleted;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: false } : t)));
      if (userId) enqueue({ table: "tasks", op: "update", id, payload: { done: false } });
      setLastCompleted(null);
    },
    dismissUndo: () => setLastCompleted(null),
  }), [tasks, userId, refresh, lastCompleted]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be inside TasksProvider");
  return ctx;
}
