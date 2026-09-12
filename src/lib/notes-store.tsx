import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeTable } from "./cloud";
import { enqueue, pendingCount, readCache, useSyncOnReconnect, writeCache } from "./offline";
import { useAuth } from "./auth";
import { adoptLocalData } from "./adopt-local";
import type { TagColor } from "./events-store";

export type Note = {
  id: string;
  title: string;
  body: string;
  images?: string[];
  tag?: TagColor;
  updatedAt: number;
};

type Ctx = {
  notes: Note[];
  add: (n: Omit<Note, "id" | "updatedAt">) => Note;
  update: (id: string, patch: Partial<Note>) => void;
  remove: (id: string) => void;
  reorder: (ids: string[]) => void;
};

const NotesContext = createContext<Ctx | null>(null);
const KEY = "calendry.notes.v1";

function seed(): Note[] {
  const now = Date.now();
  return [
    { id: "n1", title: "Morning pages", body: "Slow start. Coffee, sunlight through the linen curtain. A small thought about pottery clay and grounding.", tag: "yellow", updatedAt: now - 1000 * 60 * 30 },
    { id: "n2", title: "Grocery list", body: "sourdough · figs · olive oil · basil · sheep cheese · lemons", tag: "orange", updatedAt: now - 1000 * 60 * 60 * 3 },
    { id: "n3", title: "Book — Wintering", body: "Marking passages on rest as a practice, not a reward.", tag: "purple", updatedAt: now - 1000 * 60 * 60 * 24 },
    { id: "n4", title: "Studio ideas", body: "Warm ochre glazes on stoneware. Try the small bowl form.", tag: "pink", updatedAt: now - 1000 * 60 * 60 * 48 },
  ];
}

type Row = {
  id: string; title: string; body: string; images: unknown; tag: string | null;
  position: number; updated_at: string;
};

const fromRow = (r: Row): Note => ({
  id: r.id,
  title: r.title,
  body: r.body,
  images: Array.isArray(r.images) ? (r.images as string[]) : [],
  tag: (r.tag as TagColor) ?? undefined,
  updatedAt: new Date(r.updated_at).getTime(),
});

function toRow(n: Partial<Note>) {
  const row: Record<string, unknown> = {};
  if (n.title !== undefined) row.title = n.title;
  if (n.body !== undefined) row.body = n.body;
  if (n.images !== undefined) row.images = n.images ?? [];
  if ("tag" in n) row.tag = n.tag ?? null;
  return row;
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [notes, setNotes] = useState<Note[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (userId) return;
    try {
      const raw = localStorage.getItem(KEY);
      setNotes(raw ? JSON.parse(raw) : seed());
    } catch { setNotes(seed()); }
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (userId || !hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch {}
  }, [notes, hydrated, userId]);

  useEffect(() => {
    if (!userId) return;
    const cached = readCache<Note>("notes", userId);
    if (cached) setNotes(cached);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    writeCache("notes", userId, notes);
  }, [notes, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (pendingCount() > 0) return;
    try {
      await adoptLocalData(userId);
      const { data } = await supabase.from("notes").select("*").order("position");
      if (data) setNotes((data as unknown as Row[]).map(fromRow));
    } catch { /* offline */ }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
    return subscribeTable("notes", userId, () => { void refresh(); });
  }, [userId, refresh]);

  useSyncOnReconnect(!!userId, refresh);

  const value = useMemo<Ctx>(() => ({
    notes,
    add: (n) => {
      const note: Note = { ...n, id: crypto.randomUUID(), updatedAt: Date.now() };
      setNotes((prev) => [note, ...prev]);
      if (userId) {
        enqueue({
          table: "notes",
          op: "insert",
          id: note.id,
          payload: { id: note.id, user_id: userId, position: Date.now() * -1, ...toRow(note) },
        });
      }
      return note;
    },
    update: (id, patch) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
      if (userId) enqueue({ table: "notes", op: "update", id, payload: toRow(patch) });
    },
    remove: (id) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (userId) enqueue({ table: "notes", op: "delete", id });
    },
    reorder: (ids) => {
      setNotes((prev) => {
        const map = new Map(prev.map((n) => [n.id, n]));
        const next = ids.map((id) => map.get(id)).filter(Boolean) as Note[];
        for (const n of prev) if (!ids.includes(n.id)) next.push(n);
        return next;
      });
      if (userId) {
        ids.forEach((id, i) => enqueue({ table: "notes", op: "update", id, payload: { position: i } }));
      }
    },
  }), [notes, userId, refresh]);

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be inside NotesProvider");
  return ctx;
}
