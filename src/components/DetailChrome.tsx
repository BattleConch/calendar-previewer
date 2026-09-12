import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { haptic } from "@/lib/haptics";

export function DetailActions({
  onEdit,
  onDelete,
  onClose,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <IconBtn label="Edit" onClick={() => { haptic(10); onEdit(); }}>
        <Pencil className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Delete" onClick={() => { haptic(14); onDelete(); }}>
        <Trash2 className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Close" onClick={onClose}>
        <X className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover"
    >
      {children}
    </motion.button>
  );
}

export function ConfirmDelete({
  open,
  name,
  kind,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name: string;
  kind: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[60] bg-clay/50 backdrop-blur-sm"
          />
          <motion.div
            key="cd-card"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            role="alertdialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-[61] w-[min(20rem,86vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-ivory p-6 text-center"
            style={{ border: "1px solid var(--hairline)", boxShadow: "0 30px 70px -30px rgba(74,63,53,0.5)" }}
          >
            <div className="font-serif text-xl text-clay">Delete this {kind}?</div>
            <p className="mt-2 text-[13px] leading-relaxed text-clay-soft">
              “{name || "Untitled"}” will be removed for good. This can’t be undone.
            </p>
            <div className="mt-6 flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onCancel}
                className="flex-1 rounded-full py-3 text-sm font-medium text-clay-soft"
                style={{ border: "1px solid var(--hairline)" }}
              >
                Keep
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { haptic(20); onConfirm(); }}
                className="flex-1 rounded-full py-3 text-sm font-medium"
                style={{ background: "var(--tag-red)", color: "var(--ivory)" }}
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function UnsavedChanges({
  open,
  onKeepEditing,
  onDiscard,
}: {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => keepRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (e.shiftKey) onDiscard();
        else onKeepEditing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(id); window.removeEventListener("keydown", onKey); };
  }, [open, onKeepEditing, onDiscard]);

  return (

    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="uc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onKeepEditing}
            className="fixed inset-0 z-[60] bg-clay/60 backdrop-blur-sm"
          />
          <motion.div
            key="uc-card"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unsaved-title"
            className="fixed left-1/2 top-1/2 z-[61] w-[min(20rem,86vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-surface-hover p-6 text-center"
            style={{ boxShadow: "0 30px 70px -30px rgba(74,63,53,0.5)" }}
          >
            <div id="unsaved-title" className="font-serif text-xl text-clay">You have unsaved changes</div>
            <div className="mt-6 flex gap-2">
              <motion.button
                ref={keepRef}
                autoFocus
                whileTap={{ scale: 0.97 }}
                onClick={onKeepEditing}
                className="flex-1 rounded-full py-3 text-sm font-medium text-clay-soft"
                style={{ border: "1px solid var(--hairline)" }}
              >
                Keep editing
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { haptic(20); onDiscard(); }}
                className="flex-1 rounded-full py-3 text-sm font-medium"
                style={{ background: "var(--tag-red-bg)", color: "var(--tag-red)" }}
              >
                Discard
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function PreviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
      <span className="text-[10px] uppercase tracking-[0.24em] text-clay-soft">{label}</span>
      <span className="text-right text-[15px] text-clay">{value}</span>
    </div>
  );
}

export function TagBadge({
  bg,
  text,
  ring,
  dot,
  label,
}: { bg: string; text: string; ring: string; dot: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium"
      style={{ background: bg, color: text, border: `1px solid ${ring}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}
