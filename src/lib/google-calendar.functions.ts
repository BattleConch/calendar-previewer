import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_calendar";

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks",
];


function clientApiKey() {
  const key = process.env['GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY'];
  if (!key) throw new Error("Google Calendar is not configured for this app yet.");
  return key;
}

/* ------------------------- connect / disconnect ------------------------- */

export const startGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = clientApiKey();
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");

    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    const url = new URL(request.url);
    const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/oauth/google-calendar/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const existing = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: key,
      returnUrl,
      connectionAPIKey: existing ?? undefined,
      credentialsConfiguration: { scopes: SCOPES },
    });
    return { authorizationUrl };
  });

export const completeGoogleCalendarConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== CONNECTOR_ID) throw new Error("OAuth completion returned the wrong connector");
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return { ok: true };
  });

export const googleCalendarStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const configured = !!process.env['GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY'];
    if (!configured) return { configured: false, connected: false };
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    return { configured: true, connected: !!key };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import(
      "@/server/appUserConnections.server"
    );
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (key) {
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: CONNECTOR_ID,
        });
      } catch {
        /* the local record is removed either way */
      }
    }
    await deleteConnectionForUser(context.userId, CONNECTOR_ID);
    await context.supabase.from("events").delete().eq("source", "google");
    await context.supabase.from("tasks").delete().eq("source", "google");

    return { ok: true };
  });

/* ------------------------------- syncing -------------------------------- */

type GEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  recurringEventId?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  organizer?: { email?: string; displayName?: string; self?: boolean };
  creator?: { email?: string; displayName?: string; self?: boolean };
};

const pad = (n: number) => String(n).padStart(2, "0");

function localParts(g?: { date?: string; dateTime?: string }) {
  if (!g) return null;
  if (g.date) return { date: g.date, time: null as string | null };
  if (!g.dateTime) return null;
  const d = new Date(g.dateTime);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export const syncGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!connectionAPIKey) return { connected: false, synced: 0 };
    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");

    const listRes = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: "/calendar/v3/users/me/calendarList",
    });
    if (!listRes.ok) {
      const body = await listRes.text();
      throw new Error(`Google calendar list failed [${listRes.status}]: ${body}`);
    }
    const calendars = ((await listRes.json()) as { items?: { id: string; selected?: boolean }[] })
      .items?.filter((c) => c.selected !== false) ?? [];

    const timeMin = new Date(Date.now() - 14 * 864e5).toISOString();
    const timeMax = new Date(Date.now() + 120 * 864e5).toISOString();

    type Incoming = {
      google_event_id: string;
      google_calendar_id: string;
      title: string;
      date: string;
      start_time: string;
      end_time: string;
      all_day: boolean;
      notes: string | null;
      organizer_name: string | null;
      organizer_email: string | null;
      is_owner: boolean;
      recurring_event_id: string | null;
    };
    const incoming: Incoming[] = [];

    for (const cal of calendars) {
      const q = new URLSearchParams({
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
        timeMin,
        timeMax,
      });
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey,
        connectorId: CONNECTOR_ID,
        path: `/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${q.toString()}`,
      });
      if (!res.ok) continue;
      const items = ((await res.json()) as { items?: GEvent[] }).items ?? [];
      for (const ev of items) {
        if (ev.status === "cancelled") continue;
        const s = localParts(ev.start);
        const e = localParts(ev.end);
        if (!s) continue;
        const allDay = !s.time;
        const owner = ev.organizer ?? ev.creator;
        incoming.push({
          google_event_id: ev.id,
          google_calendar_id: cal.id,
          title: ev.summary ?? "(no title)",
          date: s.date,
          start_time: allDay ? "00:00" : s.time!,
          end_time: allDay ? "23:59" : (e?.time ?? s.time!),
          all_day: allDay,
          notes: ev.description ?? null,
          organizer_name: owner?.displayName ?? owner?.email ?? null,
          organizer_email: owner?.email ?? null,
          is_owner: !!(ev.organizer?.self ?? ev.creator?.self ?? false),
          recurring_event_id: ev.recurringEventId ?? null,
        });
      }
    }

    const { data: existingRows } = await context.supabase
      .from("events")
      .select("id, google_event_id, google_calendar_id")
      .eq("source", "google");

    const byKey = new Map<string, string>();
    for (const r of existingRows ?? []) {
      if (r.google_event_id) byKey.set(`${r.google_calendar_id}::${r.google_event_id}`, r.id);
    }

    const seen = new Set<string>();
    for (const ev of incoming) {
      const key = `${ev.google_calendar_id}::${ev.google_event_id}`;
      seen.add(key);
      const id = byKey.get(key);
      if (id) {
        await context.supabase.from("events").update(ev).eq("id", id);
      } else {
        await context.supabase
          .from("events")
          .insert({ ...ev, user_id: context.userId, source: "google", tag: "" });
      }
    }

    const stale = [...byKey.entries()].filter(([k]) => !seen.has(k)).map(([, id]) => id);
    if (stale.length) await context.supabase.from("events").delete().in("id", stale);

    return { connected: true, synced: incoming.length };
  });

/* --------------------------- deleting an event --------------------------- */

export const deleteGoogleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; scope: "single" | "series" }) => input)
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!connectionAPIKey) throw new Error("Google Calendar is not connected.");
    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");

    const { data: row } = await context.supabase
      .from("events")
      .select("id, google_event_id, google_calendar_id, recurring_event_id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!row?.google_event_id || !row.google_calendar_id) {
      throw new Error("This event is not a Google Calendar event.");
    }

    const targetId =
      data.scope === "series" && row.recurring_event_id ? row.recurring_event_id : row.google_event_id;

    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: `/calendar/v3/calendars/${encodeURIComponent(row.google_calendar_id)}/events/${encodeURIComponent(targetId)}`,
      init: { method: "DELETE" },
    });
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const body = await res.text();
      throw new Error(`Google delete failed [${res.status}]: ${body}`);
    }

    if (data.scope === "series" && row.recurring_event_id) {
      await context.supabase
        .from("events")
        .delete()
        .eq("source", "google")
        .eq("recurring_event_id", row.recurring_event_id);
    } else {
      await context.supabase.from("events").delete().eq("id", row.id);
    }
    return { ok: true };
  });

/* ----------------------------- Google Tasks ----------------------------- */

type GTask = {
  id: string;
  title?: string;
  notes?: string;
  status?: string;
  due?: string;
  deleted?: boolean;
};

export const syncGoogleTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!connectionAPIKey) return { connected: false, synced: 0 };
    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");

    const listsRes = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: "/tasks/v1/users/@me/lists",
    });
    if (!listsRes.ok) {
      const body = await listsRes.text();
      console.error(`Google Tasks list failed [${listsRes.status}]: ${body}`);
      return { connected: true, synced: 0, error: `Google Tasks unavailable (${listsRes.status})` };
    }
    const lists = ((await listsRes.json()) as { items?: { id: string }[] }).items ?? [];

    type Incoming = {
      google_task_id: string;
      google_list_id: string;
      title: string;
      done: boolean;
      due: string | null;
      notes: string | null;
    };
    const incoming: Incoming[] = [];

    for (const list of lists) {
      const q = new URLSearchParams({ maxResults: "100", showCompleted: "true", showHidden: "true" });
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey,
        connectorId: CONNECTOR_ID,
        path: `/tasks/v1/lists/${encodeURIComponent(list.id)}/tasks?${q.toString()}`,
      });
      if (!res.ok) continue;
      const items = ((await res.json()) as { items?: GTask[] }).items ?? [];
      for (const t of items) {
        if (t.deleted) continue;
        incoming.push({
          google_task_id: t.id,
          google_list_id: list.id,
          title: t.title?.trim() || "(no title)",
          done: t.status === "completed",
          due: t.due ? t.due.slice(0, 10) : null,
          notes: t.notes ?? null,
        });
      }
    }

    const { data: existingRows } = await context.supabase
      .from("tasks")
      .select("id, google_task_id, google_list_id")
      .eq("source", "google");

    const byKey = new Map<string, string>();
    for (const r of existingRows ?? []) {
      if (r.google_task_id) byKey.set(`${r.google_list_id}::${r.google_task_id}`, r.id);
    }

    const seen = new Set<string>();
    for (const t of incoming) {
      const key = `${t.google_list_id}::${t.google_task_id}`;
      seen.add(key);
      const id = byKey.get(key);
      if (id) await context.supabase.from("tasks").update(t).eq("id", id);
      else
        await context.supabase
          .from("tasks")
          .insert({ ...t, user_id: context.userId, source: "google" });
    }

    const stale = [...byKey.entries()].filter(([k]) => !seen.has(k)).map(([, id]) => id);
    if (stale.length) await context.supabase.from("tasks").delete().in("id", stale);

    return { connected: true, synced: incoming.length };
  });
