import { useEffect } from "react";
import type { CalEvent } from "./events-store";
import type { Task } from "./tasks-store";

export type ReminderOption = { value: string; label: string };

/** Minutes before the event start. */
export const EVENT_REMINDERS: ReminderOption[] = [
  { value: "0", label: "At start time" },
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

/** Minutes before 9:00 on the due date. */
export const TASK_REMINDERS: ReminderOption[] = [
  { value: "0", label: "On the day (9:00)" },
  { value: "1440", label: "1 day before" },
  { value: "2880", label: "2 days before" },
  { value: "10080", label: "1 week before" },
];

const PROMPTED_KEY = "calendry.notifications.prompted";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsGranted() {
  return notificationsSupported() && Notification.permission === "granted";
}

/** Ask once (onboarding). Safe to call from an event handler. */
export async function requestNotificationPermission(force = false) {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  if (!force) {
    try {
      if (localStorage.getItem(PROMPTED_KEY) === "1") return "default";
      localStorage.setItem(PROMPTED_KEY, "1");
    } catch { /* ignore */ }
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function notify(title: string, body: string) {
  if (!notificationsGranted()) return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch { /* ignore */ }
}

function eventFireTimes(e: CalEvent): { at: number; body: string }[] {
  if (!e.reminders?.length) return [];
  const start = new Date(`${e.date}T${e.allDay ? "09:00" : e.start}:00`).getTime();
  if (Number.isNaN(start)) return [];
  return e.reminders.map((m) => ({
    at: start - Number(m) * 60_000,
    body: Number(m) === 0 ? "Starting now" : `Starts at ${e.allDay ? "all-day" : e.start}`,
  }));
}

function taskFireTimes(t: Task): { at: number; body: string }[] {
  if (!t.reminders?.length || !t.due || t.done) return [];
  const due = new Date(`${t.due}T09:00:00`).getTime();
  if (Number.isNaN(due)) return [];
  return t.reminders.map((m) => ({ at: due - Number(m) * 60_000, body: `Due ${t.due}` }));
}

const WINDOW_MS = 12 * 60 * 60 * 1000;

/** Schedules in-session reminders for anything firing in the next 12 hours. */
export function useReminderScheduler(events: CalEvent[], tasks: Task[]) {
  useEffect(() => {
    if (!notificationsGranted()) return;
    const now = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const queue: { at: number; title: string; body: string }[] = [];

    for (const e of events) for (const f of eventFireTimes(e)) queue.push({ ...f, title: e.title });
    for (const t of tasks) for (const f of taskFireTimes(t)) queue.push({ ...f, title: t.title });

    for (const item of queue) {
      const delay = item.at - now;
      if (delay <= 0 || delay > WINDOW_MS) continue;
      timers.push(setTimeout(() => notify(item.title, item.body), delay));
    }
    return () => timers.forEach(clearTimeout);
  }, [events, tasks]);
}
