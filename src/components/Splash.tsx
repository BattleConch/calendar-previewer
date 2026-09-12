import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  NotebookPen,
  BellRing,
  CloudOff,
  Palette,
  LogOut,
} from "lucide-react";
import { requestNotificationPermission } from "@/lib/notifications";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  { Icon: CalendarDays, title: "A month you can feel", body: "Warm ivory pages, hairline grids and a day sheet that opens with a satisfying spring." },
  { Icon: CheckCircle2, title: "Tasks with deadlines", body: "Due tasks surface in Today and Upcoming, with one-tap complete and an undo if you mis-tap." },
  { Icon: NotebookPen, title: "Notes that stay tidy", body: "Jot thoughts, attach images, and colour-code with tags — or none at all." },
  { Icon: BellRing, title: "Gentle reminders", body: "Up to two optional nudges per event or task, delivered as quiet push notifications." },
  { Icon: CloudOff, title: "Works offline", body: "Everything saves on-device first and syncs automatically the moment you're back online." },
  { Icon: Palette, title: "Light, dark, auto", body: "Ivory daylight or cool slate night — Calendry follows your device, or your mood." },
];

const STEPS = [
  { n: "01", title: "Create your account", body: "Sign up with email or Google in a few seconds." },
  { n: "02", title: "Plan your week", body: "Add events, tasks and notes — reorder your home widgets to taste." },
  { n: "03", title: "Stay in sync", body: "Open Calendry anywhere and pick up exactly where you left off." },
];

export function Splash() {
  const { user, signOut } = useAuth();

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-ivory">
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.55, scale: 1 }}
        transition={{ duration: 1.6, ease: [0.32, 0.72, 0, 1] }}
        className="pointer-events-none absolute -top-24 -left-24 h-[22rem] w-[22rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, #E5EEDB, transparent)" }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 1.8, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
        className="pointer-events-none absolute top-[38rem] -right-16 h-[26rem] w-[26rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, #F4E5D8, transparent)" }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col px-8 pb-14 pt-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xs uppercase tracking-[0.28em] text-clay-soft"
        >
          A quiet planner
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="font-serif mt-4 text-[3.75rem] leading-[0.95] tracking-tight"
          style={{ color: "var(--clay)" }}
        >
          Calendry
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-6 max-w-[24rem] text-base leading-relaxed text-clay-soft"
        >
          A tactile calendar that feels like your favorite paper planner —
          warm ivory pages, soft hairlines, and days you actually want to open.
          Events, tasks and notes in one calm place.
        </motion.p>

        {/* Card stack */}
        <div className="relative mt-14 h-64">
          {[
            { r: -6, t: 0, tag: "#E5EEDB", label: "Morning walk", time: "7:30" },
            { r: 3, t: 24, tag: "#F8F1D7", label: "Deep work", time: "10:00" },
            { r: -2, t: 56, tag: "#F4E5D8", label: "Lunch with Mira", time: "12:30" },
          ].map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, rotate: c.r * 2 }}
              animate={{ opacity: 1, y: c.t, rotate: c.r }}
              transition={{ duration: 0.8, delay: 0.7 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-1/2 top-0 w-72 -translate-x-1/2 rounded-3xl bg-surface p-5 shadow-[0_20px_50px_-20px_rgba(74,63,53,0.25)]"
              style={{ border: "1px solid var(--hairline)" }}
            >
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.tag }} />
                <span className="text-xs uppercase tracking-widest text-clay-soft">{c.time}</span>
              </div>
              <div className="font-serif mt-2 text-2xl text-clay">{c.label}</div>
              <div className="mt-3 hairline-t pt-3 text-sm text-clay-soft">
                A gentle moment on the page.
              </div>
            </motion.div>
          ))}
        </div>

        {/* Primary CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-10 flex flex-col gap-3"
        >
          {user ? (
            <>
              <Link
                to="/app"
                onClick={() => { void requestNotificationPermission(); }}
                className="block w-full rounded-full bg-clay px-6 py-4 text-center font-medium text-ivory shadow-sm transition-transform active:scale-[0.98]"
              >
                Open your calendar
              </Link>
              <button
                onClick={() => { void signOut(); }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-surface px-6 py-4 text-center font-medium text-clay transition-transform active:scale-[0.98]"
                style={{ border: "1px solid var(--hairline)" }}
              >
                <LogOut className="h-4 w-4" />
                Sign out{user.email ? ` (${user.email})` : ""}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                onClick={() => { void requestNotificationPermission(); }}
                className="block w-full rounded-full bg-clay px-6 py-4 text-center font-medium text-ivory shadow-sm transition-transform active:scale-[0.98]"
              >
                Create your account
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="block w-full rounded-full bg-surface px-6 py-4 text-center font-medium text-clay transition-transform active:scale-[0.98]"
                style={{ border: "1px solid var(--hairline)" }}
              >
                I already have an account
              </Link>
              <Link
                to="/app"
                onClick={() => { void requestNotificationPermission(); }}
                className="block w-full py-1 text-center text-sm text-clay-soft"
              >
                Try it without an account
              </Link>
            </>
          )}
        </motion.div>

        {/* Features */}
        <section className="mt-20">
          <div className="text-xs uppercase tracking-[0.24em] text-clay-muted">What's inside</div>
          <h2 className="font-serif mt-3 text-3xl leading-tight" style={{ color: "var(--clay)" }}>
            Everything a week needs, nothing it doesn't.
          </h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ Icon, title, body }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5 }}
                className="rounded-3xl bg-surface p-5"
                style={{ border: "1px solid var(--hairline)" }}
              >
                <Icon className="h-5 w-5 text-clay-soft" />
                <div className="mt-3 text-[15px] text-clay">{title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-clay-soft">{body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-20">
          <div className="text-xs uppercase tracking-[0.24em] text-clay-muted">How it works</div>
          <div className="mt-6 space-y-5">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-4">
                <div className="font-serif text-2xl text-clay-muted">{s.n}</div>
                <div className="flex-1 hairline-t pt-1">
                  <div className="text-[15px] text-clay">{s.title}</div>
                  <p className="mt-1 text-sm leading-relaxed text-clay-soft">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mt-20 rounded-3xl bg-surface p-7 text-center" style={{ border: "1px solid var(--hairline)" }}>
          <h2 className="font-serif text-3xl leading-tight" style={{ color: "var(--clay)" }}>
            Start your calmest week yet.
          </h2>
          <p className="mx-auto mt-3 max-w-[20rem] text-sm leading-relaxed text-clay-soft">
            Free to use, offline-friendly, and synced to your account the moment you sign in.
          </p>
          <Link
            to={user ? "/app" : "/auth"}
            {...(user ? {} : { search: { mode: "signup" as const } })}
            className="mt-6 inline-block w-full rounded-full bg-clay px-6 py-4 font-medium text-ivory transition-transform active:scale-[0.98]"
          >
            {user ? "Open your calendar" : "Get started free"}
          </Link>
        </section>

        <div className="mt-10 text-center text-xs tracking-wide text-clay-muted">
          Calendry · your plans stay on this device until you sign in.
        </div>
      </div>
    </div>
  );
}
