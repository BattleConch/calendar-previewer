import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AlarmClock, Clock, X } from "lucide-react";
import { useEvents } from "@/lib/events-store";
import { haptic } from "@/lib/haptics";

type Alert = { key: string; title: string; body: string; at: number };

const SEEN_KEY = "calendry.reminders.seen.v1";
const TICK_MS = 20_000;
/** Only surface reminders that came due within the last 30 minutes. */
const GRACE_MS = 30 * 60_000;

function readSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function writeSeen(next: Record<string, number>) {
  const now = Date.now();
  const pruned = Object.fromEntries(Object.entries(next).filter(([, t]) => now - t < 3 * 86_400_000));
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(pruned)); } catch { /* ignore */ }
}

function startOf(dateISO: string, time: string) {
  return new Date(`${dateISO}T${time}:00`).getTime();
}

export function ReminderAlerts() {
  const { events } = useEvents();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [snoozed, setSnoozed] = useState<Record<string, number>>({});

  const close = useCallback((key: string) => {
    setAlerts((prev) => prev.filter((a) => a.key !== key));
  }, []);

  const dismiss = useCallback((key: string) => {
    haptic(10);
    const seen = readSeen();
    seen[key] = Date.now();
    writeSeen(seen);
    close(key);
  }, [close]);

  const snooze = useCallback((key: string, minutes: number) => {
    haptic(14);
    setSnoozed((prev) => ({ ...prev, [key]: Date.now() + minutes * 60_000 }));
    close(key);
  }, [close]);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const seen = readSeen();
      const due: Alert[] = [];

      for (const e of events) {
        if (!e.reminders?.length) continue;
        const start = startOf(e.date, e.allDay ? "09:00" : e.start);
        if (Number.isNaN(start)) continue;
        for (const m of e.reminders) {
          const mins = Number(m);
          const at = start - mins * 60_000;
          const key = `${e.id}:${m}`;
          if (at > now || now - at > GRACE_MS) continue;
          if (seen[key]) continue;
          const snoozedUntil = snoozed[key];
          if (snoozedUntil && snoozedUntil > now) continue;
          const away = Math.round((start - now) / 60_000);
          due.push({
            key,
            title: e.title || "Untitled event",
            body:
              away <= 0
                ? e.allDay ? "Today" : "Starting now"
                : `Starts in ${away} min${e.allDay ? "" : ` · ${e.start}`}`,
            at,
          });
        }
      }

      due.sort((a, b) => a.at - b.at);
      setAlerts((prev) => {
        const same = prev.length === due.length && prev.every((p, i) => p.key === due[i]?.key && p.body === due[i]?.body);
        if (prev.length === 0 && due.length > 0) haptic(18);
        return same ? prev : due.slice(0, 3);
      });
    };

    check();
    const id = setInterval(check, TICK_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [events, snoozed]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[75] flex flex-col items-center gap-2 px-3">
      <AnimatePresence initial={false}>
        {alerts.map((a) => (
          <motion.div
            key={a.key}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            role="alert"
            aria-live="polite"
            className="pointer-events-auto w-[min(26rem,94vw)] rounded-3xl bg-ivory p-4"
            style={{ border: "1px solid var(--hairline)", boxShadow: "0 26px 60px -28px rgba(74,63,53,0.55)" }}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "var(--surface-hover)" }}>
                <AlarmClock className="h-4 w-4 text-clay-soft" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium text-clay">{a.title}</div>
                <div className="mt-0.5 text-[12px] text-clay-soft">{a.body}</div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                aria-label="Dismiss reminder"
                onClick={() => dismiss(a.key)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            <div className="mt-3 flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => snooze(a.key, 5)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-medium text-clay-soft"
                style={{ border: "1px solid var(--hairline)" }}
              >
                <Clock className="h-3.5 w-3.5" /> Snooze 5 min
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => snooze(a.key, 15)}
                className="flex-1 rounded-full py-2.5 text-[13px] font-medium text-clay-soft"
                style={{ border: "1px solid var(--hairline)" }}
              >
                15 min
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => dismiss(a.key)}
                className="flex-1 rounded-full py-2.5 text-[13px] font-medium"
                style={{ background: "var(--clay)", color: "var(--ivory)" }}
              >
                Dismiss
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
