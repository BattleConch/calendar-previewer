import { createContext, useContext, type ReactNode } from "react";
import { useGoogleCalendar, useGoogleAutoSync } from "./use-google-calendar";
import { useAuth } from "./auth";

type GoogleSync = ReturnType<typeof useGoogleCalendar>;

const Ctx = createContext<GoogleSync | null>(null);

/** Keeps one Google connection state for the whole app and refreshes it periodically. */
export function GoogleSyncProvider({ children }: { children: ReactNode }) {
  const value = useGoogleCalendar();
  const { user } = useAuth();
  // Pull Google events + tasks every 3 minutes while the app is open,
  // and immediately whenever it regains focus or comes back online.
  useGoogleAutoSync(!!user && value.connected, value.sync, 180000);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGoogleSync(): GoogleSync {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGoogleSync must be used inside GoogleSyncProvider");
  return ctx;
}
