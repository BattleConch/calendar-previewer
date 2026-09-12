import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ListChecks, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/lib/auth";
import { useTasks } from "@/lib/tasks-store";
import { notificationsGranted, notificationsSupported, requestNotificationPermission } from "@/lib/notifications";

const PENDING_KEY = "calendry.onboarding.pending";
const doneKey = (uid: string) => `calendry.onboarding.done.${uid}`;

/** Called from the auth page right after a successful sign up. */
export function markOnboardingPending() {
  try { localStorage.setItem(PENDING_KEY, "1"); } catch { /* ignore */ }
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function Onboarding({ onFinish }: { onFinish?: () => void }) {
  const { user } = useAuth();
  const { add } = useTasks();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [created, setCreated] = useState(false);
  const [notifyState, setNotifyState] = useState<"idle" | "granted" | "skipped">("idle");

  useEffect(() => {
    if (!user) return;
    try {
      const pending = localStorage.getItem(PENDING_KEY) === "1";
      const done = localStorage.getItem(doneKey(user.id)) === "1";
      if (!done && pending) setOpen(true);
    } catch { /* ignore */ }
  }, [user]);

  const finish = () => {
    haptic([8, 24, 12]);
    try {
      if (user) localStorage.setItem(doneKey(user.id), "1");
      localStorage.removeItem(PENDING_KEY);
    } catch { /* ignore */ }
    setOpen(false);
    onFinish?.();
  };

  const next = () => { haptic(10); setStep((s) => s + 1); };

  const createFirstTask = () => {
    const t = title.trim();
    if (!t) return;
    haptic([10, 20, 14]);
    add({ title: t, priority: "med" });
    setCreated(true);
    setTimeout(() => setStep(3), 750);
  };

  const steps = useMemo(() => [0, 1, 2, 3], []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-0 z-[70] bg-clay/70 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            layout
            className="fixed inset-x-4 bottom-6 z-[71] mx-auto w-auto max-w-md overflow-hidden rounded-[28px] bg-surface p-6 sm:inset-x-0"
            style={{ border: "1px solid var(--hairline)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Calendry"
          >
            <motion.div layout="position" className="flex items-center gap-1.5">
              {steps.map((s) => (
                <motion.span
                  key={s}
                  animate={{
                    width: s === step ? 26 : 8,
                    opacity: s <= step ? 1 : 0.32,
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="h-1.5 rounded-full"
                  style={{ background: "var(--clay)" }}
                />
              ))}
            </motion.div>

            <motion.div layout className="mt-5">
              <AnimatePresence mode="wait" initial={false}>
                {step === 0 && (
                  <Panel key="welcome" icon={<Sparkles className="h-5 w-5" />} title="Welcome to Calendry">
                    <p className="text-sm leading-relaxed text-clay-soft">
                      Your calendar, tasks and notes in one calm place — synced to your account and
                      fully usable offline. Let's set you up in three quick steps.
                    </p>
                    <Primary onClick={next}>Let's go</Primary>
                    <Ghost onClick={finish}>Skip for now</Ghost>
                  </Panel>
                )}

                {step === 1 && (
                  <Panel key="notify" icon={<Bell className="h-5 w-5" />} title="Stay on time">
                    <p className="text-sm leading-relaxed text-clay-soft">
                      Reminders arrive as gentle notifications before events and task deadlines.
                      {notifyState === "granted" && " Notifications are on — nice."}
                    </p>
                    <Primary
                      onClick={async () => {
                        haptic(10);
                        if (!notificationsSupported() || notificationsGranted()) { setNotifyState("granted"); next(); return; }
                        const ok = await requestNotificationPermission(true);
                        setNotifyState(ok ? "granted" : "skipped");
                        next();
                      }}
                    >
                      Enable reminders
                    </Primary>
                    <Ghost onClick={next}>Maybe later</Ghost>
                  </Panel>
                )}

                {step === 2 && (
                  <Panel key="task" icon={<ListChecks className="h-5 w-5" />} title="Add your first task">
                    <p className="text-sm leading-relaxed text-clay-soft">
                      Type anything you'd like to get done — you can add a due date, tag and
                      reminders later by tapping it.
                    </p>
                    <div
                      className="mt-4 flex items-center gap-2 rounded-2xl bg-ivory px-4 py-3"
                      style={{ border: "1px solid var(--hairline)" }}
                    >
                      <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createFirstTask(); }}
                        placeholder="e.g. Plan the week"
                        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-clay-muted"
                        style={{ color: "var(--clay)" }}
                      />
                      <AnimatePresence>
                        {created && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 520, damping: 22 }}
                          >
                            <Check className="h-4 w-4" style={{ color: "var(--tag-green)" }} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <Primary onClick={createFirstTask} disabled={!title.trim()}>Add task</Primary>
                    <Ghost onClick={() => setStep(3)}>Skip this</Ghost>
                  </Panel>
                )}

                {step === 3 && (
                  <Panel key="done" icon={<Check className="h-5 w-5" />} title="You're all set">
                    <p className="text-sm leading-relaxed text-clay-soft">
                      Swipe up on a day for its agenda, use the tabs below for tasks and notes, and
                      shape your own tags any time from My Tags.
                    </p>
                    <Primary onClick={finish}>Start using Calendry</Primary>
                  </Panel>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      <div className="flex items-center gap-2 text-clay-soft">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.24em]">Getting started</span>
      </div>
      <h2 className="font-serif mt-2 text-2xl tracking-tight" style={{ color: "var(--clay)" }}>{title}</h2>
      <div className="mt-2">{children}</div>
    </motion.div>
  );
}

function Primary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 24 }}
      onClick={onClick}
      disabled={disabled}
      className="mt-5 w-full rounded-2xl py-3.5 text-[15px] disabled:opacity-40"
      style={{ background: "var(--clay)", color: "var(--ivory)" }}
    >
      {children}
    </motion.button>
  );
}

function Ghost({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="mt-3 w-full text-center text-sm text-clay-soft">
      {children}
    </button>
  );
}
