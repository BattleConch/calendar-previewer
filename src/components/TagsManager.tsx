import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X, Tags } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { PALETTE, styleForColor, useTags, type PaletteKey } from "@/lib/tags-store";

export function MyTagsButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => { haptic(8); setOpen(true); }}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-clay-soft ${className}`}
        style={{ border: "1px solid var(--hairline)" }}
      >
        <Tags className="h-3.5 w-3.5" /> My Tags
      </button>
      <TagsManager open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function TagsManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tags, add, update, remove } = useTags();
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState<PaletteKey>("blue");
  const [openColorId, setOpenColorId] = useState<string | null>(null);
  const newTagRef = useRef<HTMLDivElement | null>(null);
  const tagRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!openColorId) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const activeEl =
        openColorId === "new" ? newTagRef.current : tagRefs.current[openColorId];
      if (activeEl && target && !activeEl.contains(target)) {
        setOpenColorId(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [openColorId]);

  const create = () => {
    if (!draft.trim()) return;
    haptic(12);
    add(draft, draftColor);
    setDraft("");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-clay/60 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-[28px] bg-surface"
            style={{ border: "1px solid var(--hairline)" }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">My Tags</div>
                <p className="mt-1 text-sm text-clay-soft">Rename, recolor, add or remove.</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-6">
              <AnimatePresence initial={false}>
                {tags.map((t) => {
                  const colorOpen = openColorId === t.id;
                  return (
                    <motion.div
                      key={t.id}
                      ref={(el) => { tagRefs.current[t.id] = el; }}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="rounded-2xl p-3"
                      style={{ border: "1px solid var(--hairline)", background: styleForColor(t.color, t.label).bg }}
                    >
                      <motion.div
                        role="button"
                        tabIndex={0}
                        aria-expanded={colorOpen}
                        aria-label={`Toggle color picker for ${t.label}`}
                        whileTap={{ scale: 0.985 }}
                        transition={{ type: "spring", stiffness: 620, damping: 24 }}
                        onPointerDown={() => haptic(6)}
                        onClick={() => {
                          if (colorOpen) return;
                          haptic([6, 18, 10]);
                          setOpenColorId(t.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (colorOpen) return; setOpenColorId(t.id); }
                        }}
                        className="flex cursor-pointer items-center gap-2 focus:outline-none"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full">
                          <motion.span
                            animate={{ scale: colorOpen ? 1.3 : 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 26 }}
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: `var(--tag-${t.color})` }}
                          />
                        </span>
                        <motion.input
                          layout
                          value={t.label}
                          readOnly={!colorOpen}
                          onChange={(e) => update(t.id, { label: e.target.value })}
                          onPointerDown={(e) => { if (colorOpen) e.stopPropagation(); }}
                          onClick={(e) => { if (colorOpen) e.stopPropagation(); }}
                          aria-label="Tag name"
                          animate={{
                            borderColor: colorOpen ? "var(--hairline)" : "rgba(0,0,0,0)",
                            backgroundColor: colorOpen ? "var(--surface)" : "rgba(0,0,0,0)",
                          }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className={`min-w-0 flex-1 rounded-lg border px-2 py-1 text-[15px] focus:outline-none ${colorOpen ? "cursor-text" : "cursor-pointer"}`}
                          style={{ color: "var(--clay)" }}
                        />
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); haptic(14); remove(t.id); }}
                          aria-label={`Delete ${t.label}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.div>

                      <AnimatePresence initial={false}>
                        {colorOpen && (
                          <motion.div
                            key="swatches"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3">
                              <Swatches value={t.color} onChange={(c) => { haptic(8); update(t.id, { color: c }); }} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <motion.div ref={newTagRef} layout className="rounded-2xl p-3" style={{ border: "1px dashed var(--hairline)" }}>
                <motion.div
                  role="button"
                  tabIndex={0}
                  aria-expanded={openColorId === "new"}
                  aria-label="Toggle color picker for new tag"
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 620, damping: 24 }}
                  onPointerDown={() => haptic(6)}
                    onClick={() => {
                      if (openColorId === "new") return;
                      haptic([6, 18, 10]);
                      setOpenColorId("new");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (openColorId === "new") return; setOpenColorId("new"); }
                    }}
                  className="flex cursor-pointer items-center gap-2 focus:outline-none"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full">
                    <motion.span
                      animate={{ scale: openColorId === "new" ? 1.25 : 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 26 }}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: openColorId === "new" ? `var(--tag-${draftColor})` : "transparent",
                        border: "1px dashed var(--clay-soft, var(--hairline))",
                      }}
                    />
                  </span>
                  <motion.input
                    layout
                    value={draft}
                    readOnly={openColorId !== "new"}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                    onPointerDown={(e) => { if (openColorId === "new") e.stopPropagation(); }}
                    onClick={(e) => { if (openColorId === "new") e.stopPropagation(); }}
                    placeholder="New tag name"
                    animate={{
                      borderColor: openColorId === "new" ? "var(--hairline)" : "rgba(0,0,0,0)",
                      backgroundColor: openColorId === "new" ? "var(--surface)" : "rgba(0,0,0,0)",
                    }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={`min-w-0 flex-1 rounded-lg border px-2 py-1 text-[15px] placeholder:text-clay-muted focus:outline-none ${openColorId === "new" ? "cursor-text" : "cursor-pointer"}`}
                    style={{ color: "var(--clay)" }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); create(); }}
                    disabled={!draft.trim()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs disabled:opacity-40"
                    style={{ background: "var(--clay)", color: "var(--ivory)" }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </motion.button>
                </motion.div>
                <AnimatePresence initial={false}>
                  {openColorId === "new" && (
                    <motion.div
                      key="new-swatches"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3">
                        <Swatches value={draftColor} onChange={(c) => { haptic(8); setDraftColor(c); }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Swatches({ value, onChange }: { value: PaletteKey; onChange: (c: PaletteKey) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-3 px-1 py-1.5">
      {PALETTE.map((c) => (
        <motion.button
          key={c}
          whileTap={{ scale: 0.88 }}
          animate={{ scale: value === c ? 1.06 : 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 24 }}
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          aria-pressed={value === c}
          className="h-6 w-6 shrink-0 rounded-full"
          style={{
            background: `var(--tag-${c})`,
            boxShadow: value === c ? "0 0 0 2px var(--surface, transparent), 0 0 0 4px var(--clay)" : "none",
          }}
        />
      ))}
    </div>

  );
}
