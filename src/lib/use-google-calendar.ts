import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  completeGoogleCalendarConnection,
  disconnectGoogleCalendar,
  googleCalendarStatus,
  startGoogleCalendarConnect,
  syncGoogleCalendar,
  syncGoogleTasks,
} from "./google-calendar.functions";
import { useAuth } from "./auth";

const CONNECTOR_ID = "google_calendar";

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== CONNECTOR_ID ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof event.data?.code === "string" ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error("Google didn't finish connecting."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The Google window closed before finishing."));
    }, 500);
  });
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const status = useServerFn(googleCalendarStatus);
  const start = useServerFn(startGoogleCalendarConnect);
  const complete = useServerFn(completeGoogleCalendarConnection);
  const disconnect = useServerFn(disconnectGoogleCalendar);
  const syncEvents = useServerFn(syncGoogleCalendar);
  const syncTasks = useServerFn(syncGoogleTasks);

  const [configured, setConfigured] = useState(true);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!user) {
      setConnected(false);
      return;
    }
    try {
      const s = await status();
      setConfigured(s.configured);
      setConnected(s.connected);
    } catch {
      /* offline */
    }
  }, [status, user]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const sync = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    setError(null);
    try {
      await syncEvents();
      await syncTasks();
      setLastSync(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [syncEvents, syncTasks, user]);

  const connect = useCallback(async () => {
    setError(null);
    const popup = window.open("", "calendry-google-oauth", "width=600,height=720");
    if (!popup) {
      setError("Allow pop-ups to connect Google.");
      return;
    }
    setBusy(true);
    try {
      const { authorizationUrl } = await start();
      const completion = waitForOAuthCompletion(popup);
      popup.location.href = authorizationUrl;
      const code = await completion;
      if (code) await complete({ data: { code } });
      setConnected(true);
      await sync();
    } catch (e) {
      popup.close();
      setError(e instanceof Error ? e.message : "Could not connect Google.");
    } finally {
      setBusy(false);
      void refreshStatus();
    }
  }, [start, complete, sync, refreshStatus]);

  const unlink = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnect();
      setConnected(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disconnect.");
    } finally {
      setBusy(false);
    }
  }, [disconnect]);

  return { configured, connected, busy, syncing, error, lastSync, connect, unlink, sync, refreshStatus };
}

/** Background poller: keeps Google events and tasks fresh while the app is open. */
export function useGoogleAutoSync(enabled: boolean, sync: () => Promise<void>, intervalMs = 60000) {
  const ref = useRef(sync);
  ref.current = sync;
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const run = () => {
      if (stopped || document.hidden || !navigator.onLine) return;
      void ref.current();
    };
    run();
    const iv = window.setInterval(run, intervalMs);
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    return () => {
      stopped = true;
      window.clearInterval(iv);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
    };
  }, [enabled, intervalMs]);
}
