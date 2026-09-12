import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on one of the synced tables for the current user.
 * Any insert/update/delete (from this device, the website, or another phone)
 * triggers `onChange` so the local list can be refreshed.
 */
export function subscribeTable(
  table: "events" | "tasks" | "notes" | "tags",
  userId: string,
  onChange: () => void,
) {
  const channel = supabase
    .channel(`sync-${table}-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
