import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { markOnboardingPending } from "./Onboarding";

type Mode = "signin" | "signup";

export function AuthPage() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { mode?: string };
  const [mode, setMode] = useState<Mode>(search.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app", replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    haptic(8);
    setError(null);
    setNotice(null);
    setBusy(true);
    const res = mode === "signup"
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    if (mode === "signup") markOnboardingPending();
    if (mode === "signup" && "needsConfirmation" in res && res.needsConfirmation) {
      setNotice("Check your email to confirm your account, then sign in.");
      return;
    }
    navigate({ to: "/app", replace: true });
  };

  return (
    <div className="relative min-h-[100dvh] bg-ivory px-7 pb-12 pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-6rem] h-[22rem] w-[22rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, #F4E5D8, transparent)", opacity: 0.6 }}
      />
      <div className="relative z-10 mx-auto w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-clay-soft">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-serif mt-8 text-4xl tracking-tight"
          style={{ color: "var(--clay)" }}
        >
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </motion.h1>
        <p className="mt-2 text-sm leading-relaxed text-clay-soft">
          {mode === "signup"
            ? "Your calendar, tasks and notes — synced everywhere, offline-ready."
            : "Sign in to pick up right where you left off."}
        </p>

        <button
          onClick={async () => {
            haptic(8); setError(null); setBusy(true);
            const res = await signInWithGoogle();
            if (res.error) setError(res.error);
            setBusy(false);
          }}
          disabled={busy}
          className="mt-8 w-full rounded-2xl bg-surface py-3.5 text-[15px] text-clay disabled:opacity-60"
          style={{ border: "1px solid var(--hairline)" }}
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-clay-muted">
          <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
          or
          <span className="h-px flex-1" style={{ background: "var(--hairline)" }} />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-clay-muted"
            />
          </Field>
          <Field icon={<Lock className="h-4 w-4" />}>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-clay-muted"
            />
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl py-3.5 text-[15px] disabled:opacity-60"
            style={{ background: "var(--clay)", color: "var(--ivory)" }}
          >
            {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {error && <div className="mt-3 text-sm" style={{ color: "var(--tag-red)" }}>{error}</div>}
        {notice && <div className="mt-3 text-sm text-clay-soft">{notice}</div>}

        <button
          onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); setNotice(null); }}
          className="mt-6 w-full text-center text-sm text-clay-soft"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>

        <Link to="/app" className="mt-8 block text-center text-xs tracking-wide text-clay-muted">
          Continue without an account
        </Link>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label
      className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3"
      style={{ border: "1px solid var(--hairline)" }}
    >
      <span className="text-clay-soft">{icon}</span>
      {children}
    </label>
  );
}
