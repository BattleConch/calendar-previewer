import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeTable } from "./cloud";
import { enqueue, pendingCount, readCache, useSyncOnReconnect, writeCache } from "./offline";
import { useAuth } from "./auth";
import { NO_TAG_STYLE, type TagStyle } from "./events-store";

export type PaletteKey = "blue" | "red" | "green" | "yellow" | "orange" | "teal" | "purple" | "pink";

export const PALETTE: PaletteKey[] = ["blue", "green", "orange", "yellow", "teal", "pink", "purple", "red"];

export type TagDef = { id: string; label: string; color: PaletteKey };

export const DEFAULT_TAGS: TagDef[] = [
  { id: "blue", label: "Focus", color: "blue" },
  { id: "green", label: "Health", color: "green" },
  { id: "orange", label: "Social", color: "orange" },
  { id: "yellow", label: "Ideas", color: "yellow" },
  { id: "teal", label: "Plan", color: "teal" },
  { id: "pink", label: "Joy", color: "pink" },
  { id: "purple", label: "Study", color: "purple" },
  { id: "red", label: "Urgent", color: "red" },
];

const KEY = "calendry.tags.v1";

export const styleForColor = (color: PaletteKey, label: string): TagStyle => ({
  bg: `var(--tag-${color}-bg)`,
  text: `var(--tag-${color})`,
  dot: `var(--tag-${color})`,
  ring: `color-mix(in srgb, var(--tag-${color}) 38%, transparent)`,
  label,
});

type Ctx = {
  tags: TagDef[];
  add: (label: string, color: PaletteKey) => TagDef;
  update: (id: string, patch: Partial<Omit<TagDef, "id">>) => void;
  remove: (id: string) => void;
  styleOf: (id?: string) => TagStyle;
};

const TagsContext = createContext<Ctx | null>(null);

type Row = { id: string; label: string; color: string; position: number };

const fromRow = (r: Row): TagDef => ({ id: r.id, label: r.label, color: r.color as PaletteKey });

function readLocalTags(): TagDef[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as TagDef[]) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_TAGS;
  } catch {
    return DEFAULT_TAGS;
  }
}

export function TagsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [tags, setTags] = useState<TagDef[]>(DEFAULT_TAGS);
  const [hydrated, setHydrated] = useState(false);
  const seeded = useRef<string | null>(null);

  // Signed out: local storage only.
  useEffect(() => {
    if (userId) return;
    setTags(readLocalTags());
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (userId || !hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(tags)); } catch { /* ignore */ }
  }, [tags, hydrated, userId]);

  // Signed in: offline cache + cloud.
  useEffect(() => {
    if (!userId) return;
    const cached = readCache<TagDef>("tags", userId);
    if (cached?.length) setTags(cached);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    writeCache("tags", userId, tags);
  }, [tags, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    if (pendingCount() > 0) return;
    try {
      const { data, error } = await supabase.from("tags").select("*").order("position");
      if (error) return;
      const rows = (data as unknown as Row[]) ?? [];
      if (rows.length === 0) {
        // First device for this account: publish whatever this browser had.
        if (seeded.current === userId) return;
        seeded.current = userId;
        const local = readLocalTags();
        local.forEach((t, i) => {
          enqueue({
            table: "tags",
            op: "insert",
            id: t.id,
            payload: { id: t.id, user_id: userId, label: t.label, color: t.color, position: i },
          });
        });
        setTags(local);
        try { localStorage.removeItem(KEY); } catch { /* ignore */ }
        return;
      }
      setTags(rows.map(fromRow));
    } catch { /* offline */ }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
    return subscribeTable("tags", userId, () => { void refresh(); });
  }, [userId, refresh]);

  useSyncOnReconnect(!!userId, refresh);

  const styleOf = useCallback(
    (id?: string): TagStyle => {
      if (!id) return NO_TAG_STYLE;
      const t = tags.find((x) => x.id === id);
      return t ? styleForColor(t.color, t.label) : NO_TAG_STYLE;
    },
    [tags],
  );

  const value = useMemo<Ctx>(() => ({
    tags,
    styleOf,
    add: (label, color) => {
      const tag: TagDef = { id: crypto.randomUUID(), label: label.trim() || "Tag", color };
      setTags((prev) => [...prev, tag]);
      if (userId) {
        enqueue({
          table: "tags",
          op: "insert",
          id: tag.id,
          payload: { id: tag.id, user_id: userId, label: tag.label, color: tag.color, position: tags.length },
        });
      }
      return tag;
    },
    update: (id, patch) => {
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (userId) enqueue({ table: "tags", op: "update", id, payload: { ...patch } });
    },
    remove: (id) => {
      setTags((prev) => prev.filter((t) => t.id !== id));
      if (userId) enqueue({ table: "tags", op: "delete", id });
    },
  }), [tags, userId, styleOf]);

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}

export function useTags() {
  const ctx = useContext(TagsContext);
  if (!ctx) throw new Error("useTags must be inside TagsProvider");
  return ctx;
}
