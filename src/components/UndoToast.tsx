import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Check, Undo2 } from "lucide-react";
import { useTasks } from "@/lib/tasks-store";
import { haptic } from "@/lib/haptics";

export function UndoToast() {
  const { lastCompleted, undoComplete, dismissUndo } = useTasks();

  useEffect(() => {
    if (!lastCompleted) return;
    const t = setTimeout(dismissUndo, 6000);
    return () => clearTimeout(t);
  }, [lastCompleted, dismissUndo]);

  return (
    <AnimatePresence>
      {lastCompleted && (
        <motion.div
          key="undo"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          role="status"
          aria-live="polite"
          className="fixed bottom-28 left-1/2 z-[70] flex w-[min(24rem,90vw)] -translate-x-1/2 items-center gap-3 rounded-full bg-clay py-2.5 pl-4 pr-2.5 text-ivory shadow-[0_24px_50px_-24px_rgba(74,63,53,0.7)]"
        >
          <Check className="h-4 w-4 shrink-0 opacity-80" />
          <span className="min-w-0 flex-1 truncate text-[13px]">
            Completed “{lastCompleted.title}”
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { haptic(12); undoComplete(); }}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-ivory/15 px-3 py-1.5 text-[13px] font-medium"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
