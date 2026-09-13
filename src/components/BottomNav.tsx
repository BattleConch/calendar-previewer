import { motion } from "framer-motion";
import { useEffect } from "react";
import { CalendarDays, CheckCircle2, Home, NotebookPen, Settings } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useHideNotes } from "@/lib/nav-prefs";

export type Tab = "home" | "calendar" | "tasks" | "notes" | "settings";

const ALL: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-5 w-5" /> },
  { id: "tasks", label: "Tasks", icon: <CheckCircle2 className="h-5 w-5" /> },
  { id: "home", label: "Home", icon: <Home className="h-5 w-5" /> },
  { id: "notes", label: "Notes", icon: <NotebookPen className="h-5 w-5" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
];

const byId = (id: Tab) => ALL.find((i) => i.id === id)!;

export function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const hideNotes = useHideNotes();

  // Notes hidden: Home slides to the front, Calendar and Tasks shift one spot right.
  const items = hideNotes
    ? [byId("home"), byId("calendar"), byId("tasks"), byId("settings")]
    : ALL;

  useEffect(() => {
    if (hideNotes && tab === "notes") setTab("home");
  }, [hideNotes, tab, setTab]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-5 pt-2"
      style={{ background: "linear-gradient(to top, var(--ivory) 60%, rgba(250,248,245,0))" }}
    >
      <div
        className="mx-auto flex max-w-md items-center justify-around rounded-full bg-surface/95 px-2 py-1.5 backdrop-blur-md"
        style={{ border: "1px solid var(--hairline)", boxShadow: "0 12px 30px -18px rgba(74,63,53,0.35)" }}
      >
        {items.map((it) => {
          const active = tab === it.id;
          return (
            <motion.button
              key={it.id}
              layout
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              onClick={() => { haptic(8); setTab(it.id); }}
              aria-label={it.label}
              className="relative flex flex-1 items-center justify-center gap-2 rounded-full px-2 py-2.5 text-xs font-medium"
              style={{ color: active ? "var(--ivory)" : "var(--clay-soft)" }}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-0 rounded-full bg-clay"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <motion.span layout className="relative flex items-center gap-1.5">
                {it.icon}
                {active && <span className="whitespace-nowrap">{it.label}</span>}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
