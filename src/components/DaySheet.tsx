import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { format } from "date-fns";
import { ChevronUp } from "lucide-react";
import { AgendaSheet } from "./AgendaSheet";
import { haptic } from "@/lib/haptics";

export function DaySheet({
  open,
  onClose,
  selected,
  setSelected,
  onEdit,
  onEditTask,
  onCreateRange,
}: {
  open: boolean;
  onClose: () => void;
  selected: Date;
  setSelected: (d: Date) => void;
  onEdit: (id: string) => void;
  onEditTask?: (id: string) => void;
  onCreateRange: (start: string, end: string) => void;
}) {
  const dragControls = useDragControls();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: "rgba(74,63,53,0.22)" }}
          />
          <motion.div
            key="day-sheet"
            layoutId="day-widget"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.02, bottom: 1 }}
            dragTransition={{ bounceStiffness: 420, bounceDamping: 40 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 500) { haptic([12, 26]); onClose(); }
              else haptic(6);
            }}
            transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.8 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[2rem] bg-surface"
            style={{ border: "1px solid var(--hairline)", boxShadow: "0 -20px 60px -30px rgba(74,63,53,0.5)" }}
          >
            <div className="shrink-0 pt-3">
              <div
                onPointerDown={(e) => { haptic(9); dragControls.start(e); }}
                className="mx-auto flex h-8 w-28 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              >
                <motion.div
                  whileTap={{ scaleX: 1.25, opacity: 0.9 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="h-1.5 w-12 rounded-full"
                  style={{ background: "var(--hairline)" }}
                />
              </div>


              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="flex items-baseline justify-between px-6 pb-1 pt-3"
              >
                <div>
                  <div className="text-xs uppercase tracking-widest text-clay-soft">{format(selected, "EEEE")}</div>
                  <div className="font-serif text-3xl">{format(selected, "MMMM d")}</div>
                </div>
                <button
                  onClick={() => { haptic(8); onClose(); }}
                  className="rounded-full px-3 py-1.5 text-xs text-clay-soft"
                  style={{ border: "1px solid var(--hairline)" }}
                >
                  Close
                </button>
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="min-h-0 flex-1 overflow-y-auto pb-8"
            >
              <AgendaSheet selected={selected} setSelected={setSelected} onEdit={onEdit} onEditTask={onEditTask} onCreateRange={onCreateRange} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function SwipeHint() {
  return (
    <motion.div
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className="flex items-center justify-center gap-1.5 pt-3 text-[11px] uppercase tracking-[0.18em] text-clay-muted"
    >
      <ChevronUp className="h-3.5 w-3.5" /> Swipe up from the handle
    </motion.div>
  );
}
