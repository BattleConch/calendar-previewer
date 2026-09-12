import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Bell, Info, Moon, Sparkles, Vibrate, CalendarDays, Sun, Monitor, Cloud, CloudOff, LogOut } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useGoogleSync } from "@/lib/google-sync";

import { TagsManager } from "./TagsManager";
import { Tags } from "lucide-react";


type Prefs = {
  haptics: boolean;
  reminders: boolean;
  animations: boolean;
  weekStartMonday: boolean;
};

const DEFAULTS: Prefs = { haptics: true, reminders: true, animations: true, weekStartMonday: false };
const KEY = "calendry.settings";

const THEME_OPTIONS: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "Auto", Icon: Monitor },
];

export function SettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const { mode, resolved, setMode } = useTheme();
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const google = useGoogleSync();

  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);


  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const set = (k: keyof Prefs) => (v: boolean) => {
    haptic(8);
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="px-5"
    >
      <div className="pt-1 pb-4">
        <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">Preferences</div>
        <p className="mt-1 text-sm text-clay-soft">Tune how Calendry feels.</p>
      </div>

      <Group title="Account & sync">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-clay-soft">
              {user ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px]">
                {loading ? "Checking…" : user ? (user.email ?? "Signed in") : "Not signed in"}
              </div>
              <div className="mt-0.5 text-xs text-clay-soft">
                {user
                  ? "Events, tasks and notes sync live with the website."
                  : "Sign in with Google to sync with the Calendry website."}
              </div>
            </div>
          </div>

          {user ? (
            <button
              onClick={async () => { haptic(8); setBusy(true); await signOut(); setBusy(false); }}
              disabled={busy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-[14px] text-clay disabled:opacity-60"
              style={{ background: "var(--surface-hover)" }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          ) : (
            <button
              onClick={async () => {
                haptic(8);
                setAuthError(null);
                setBusy(true);
                const res = await signInWithGoogle();
                if (res.error) setAuthError(res.error);
                setBusy(false);
              }}
              disabled={busy || loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-[14px] disabled:opacity-60"
              style={{ background: "var(--clay)", color: "var(--ivory)" }}
            >
              {busy ? "Opening Google…" : "Continue with Google"}
            </button>
          )}

          {authError && <div className="mt-2 text-xs text-clay-soft">{authError}</div>}
        </div>
      </Group>

      {user && (
        <Group title="Google Calendar & Tasks">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="text-clay-soft"><CalendarDays className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px]">
                  {!google.configured
                    ? "Google sync unavailable"
                    : google.connected
                      ? "Google connected"
                      : "Google not connected"}
                </div>
                <div className="mt-0.5 text-xs text-clay-soft">
                  {!google.configured
                    ? "Google sync isn't set up for this app yet."
                    : google.connected
                      ? google.syncing
                        ? "Refreshing your Google events and tasks…"
                        : "Your Google events and tasks refresh automatically."
                      : "Bring your Google calendar events and tasks into Calendry."}
                </div>
              </div>
            </div>

            {google.configured && (
              google.connected ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => { haptic(8); await google.sync(); }}
                    disabled={google.syncing || google.busy}
                    className="rounded-2xl py-2.5 text-[14px] text-clay disabled:opacity-60"
                    style={{ background: "var(--surface-hover)" }}
                  >
                    {google.syncing ? "Syncing…" : "Sync now"}
                  </button>
                  <button
                    onClick={async () => { haptic(8); await google.unlink(); }}
                    disabled={google.busy}
                    className="rounded-2xl py-2.5 text-[14px] text-clay disabled:opacity-60"
                    style={{ background: "var(--surface-hover)" }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => { haptic(8); await google.connect(); }}
                  disabled={google.busy}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-[14px] disabled:opacity-60"
                  style={{ background: "var(--clay)", color: "var(--ivory)" }}
                >
                  {google.busy ? "Opening Google…" : "Connect Google"}
                </button>
              )
            )}

            {google.error && <div className="mt-2 text-xs text-clay-soft">{google.error}</div>}
          </div>
        </Group>
      )}


      <Group title="Tags">
        <button
          onClick={() => { haptic(8); setTagsOpen(true); }}
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-hover"
        >
          <span className="text-clay-soft"><Tags className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px]">My Tags</div>
            <div className="mt-0.5 text-xs text-clay-soft">Add, rename, recolor or remove tags</div>
          </div>
        </button>
      </Group>
      <TagsManager open={tagsOpen} onClose={() => setTagsOpen(false)} />

      <Group title="Appearance">

        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-clay-soft">
              {resolved === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px]">Theme</div>
              <div className="mt-0.5 text-xs text-clay-soft">
                {mode === "system" ? `Following your device — currently ${resolved}` : mode === "dark" ? "Cool slate night" : "Ivory & clay daylight"}
              </div>
            </div>
          </div>
          <div
            className="mt-3 grid grid-cols-3 gap-1 rounded-2xl p-1"
            style={{ background: "var(--surface-hover)" }}
          >
            {THEME_OPTIONS.map((opt) => {
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => { haptic(8); setMode(opt.id); }}
                  aria-pressed={active}
                  className="relative flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13px]"
                >
                  {active && (
                    <motion.span
                      layoutId="theme-pill"
                      transition={{ type: "spring", stiffness: 520, damping: 36 }}
                      className="absolute inset-0 rounded-xl bg-surface"
                      style={{ boxShadow: "0 2px 8px -4px rgba(0,0,0,0.28)" }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-1.5 ${active ? "text-clay" : "text-clay-soft"}`}>
                    <opt.Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Group>

      <Group title="Feel">

        <Row
          icon={<Vibrate className="h-4 w-4" />}
          label="Haptic feedback"
          hint="Subtle vibrations on taps and drags"
          value={prefs.haptics}
          onChange={set("haptics")}
        />
        <Row
          icon={<Sparkles className="h-4 w-4" />}
          label="Motion & animations"
          hint="Springy transitions across the app"
          value={prefs.animations}
          onChange={set("animations")}
        />
      </Group>

      <Group title="Calendar">
        <Row
          icon={<CalendarDays className="h-4 w-4" />}
          label="Start week on Monday"
          hint="Otherwise weeks begin on Sunday"
          value={prefs.weekStartMonday}
          onChange={set("weekStartMonday")}
        />
        <Row
          icon={<Bell className="h-4 w-4" />}
          label="Event reminders"
          hint="Nudge me before something begins"
          value={prefs.reminders}
          onChange={set("reminders")}
        />
      </Group>

      <Group title="About">
        <div className="flex items-start gap-3 px-4 py-4">
          <span className="mt-0.5 text-clay-soft"><Info className="h-4 w-4" /></span>
          <div className="flex-1">
            <div className="text-[15px]">Calendry</div>
            <div className="mt-0.5 text-xs text-clay-soft">
              Version 1.0 · {user ? "synced to your Google account." : "stored on this device until you sign in."}
            </div>

          </div>
        </div>
      </Group>
    </motion.section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 px-1 text-[11px] uppercase tracking-[0.2em] text-clay-muted">{title}</div>
      <div className="overflow-hidden rounded-3xl bg-surface" style={{ border: "1px solid var(--hairline)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  icon, label, hint, value, onChange,
}: {
  icon: React.ReactNode; label: string; hint: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-hover [&+&]:border-t"
      style={{ borderColor: "var(--hairline)" }}
      aria-pressed={value}
    >
      <span className="text-clay-soft">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px]">{label}</div>
        <div className="mt-0.5 truncate text-xs text-clay-soft">{hint}</div>
      </div>
      <Switch on={value} />
    </button>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className="relative flex h-6 w-11 shrink-0 items-center rounded-full px-0.5"
      style={{ background: on ? "var(--clay)" : "var(--hairline)", justifyContent: on ? "flex-end" : "flex-start" }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 34 }}
        className="h-5 w-5 rounded-full"
        style={{ background: "var(--ivory)", boxShadow: "0 2px 6px -2px rgba(74,63,53,0.5)" }}
      />
    </span>
  );
}
