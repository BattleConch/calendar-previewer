import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, RefreshCw } from "lucide-react";
import { useOnline, usePendingCount } from "@/lib/offline";
import { useAuth } from "@/lib/auth";

/** Small pill that tells you when changes are living only on this device. */
export function SyncStatus() {
  const online = useOnline();
  const pending = usePendingCount();
  const { user } = useAuth();
  const show = !online || (!!user && pending > 0);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="pointer-events-none fixed left-1/2 top-3 z-[70] -translate-x-1/2 rounded-full px-3 py-1.5 text-[11px] tracking-wide"
          style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "var(--clay-soft)" }}
        >
          <span className="inline-flex items-center gap-1.5">
            {online ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CloudOff className="h-3 w-3" />}
            {online
              ? `Syncing ${pending} change${pending === 1 ? "" : "s"}…`
              : pending > 0
                ? `Offline · ${pending} saved here`
                : "Offline · saved on this device"}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
