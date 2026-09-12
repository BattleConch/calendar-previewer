import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

const KEY = "calendry.theme";

type Ctx = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<Ctx>({ mode: "system", resolved: "light", setMode: () => {} });

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#10141C" : "#FAF8F5");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Read stored preference after hydration.
  useEffect(() => {
    let stored: ThemeMode = "system";
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === "light" || raw === "dark" || raw === "system") stored = raw;
    } catch {}
    setModeState(stored);
  }, []);

  // Resolve + apply whenever mode changes, and follow the OS in system mode.
  useEffect(() => {
    const compute = () => {
      const next = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
      setResolved(next);
      apply(next);
    };
    compute();
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", compute);
    return () => mq.removeEventListener("change", compute);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try { localStorage.setItem(KEY, m); } catch {}
  }, []);

  return <ThemeContext.Provider value={{ mode, resolved, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
