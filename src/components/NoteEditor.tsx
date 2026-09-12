import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Pencil, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotes } from "@/lib/notes-store";
import { type TagColor } from "@/lib/events-store";
import { useTags } from "@/lib/tags-store";
import { ConfirmDelete, DetailActions, TagBadge, UnsavedChanges } from "./DetailChrome";

import { filesToDataUrls } from "@/lib/images";
import { haptic } from "@/lib/haptics";




export function NoteEditor({
  open,
  onClose,
  editingId,
}: {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
}) {
  const { notes, add, update, remove } = useNotes();
  const existing = editingId ? notes.find((n) => n.id === editingId) : null;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<TagColor | undefined>(undefined);
  const { tags, styleOf } = useTags();
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const libraryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"preview" | "edit">("edit");
  const [confirming, setConfirming] = useState(false);
  const [warn, setWarn] = useState(false);
  const [baseline, setBaseline] = useState("");

  useEffect(() => {
    if (!open) return;
    setConfirming(false);
    setWarn(false);
    setMode(existing ? "preview" : "edit");
    if (existing) {
      setTitle(existing.title);
      setBody(existing.body);
      setTag(existing.tag);
      setImages(existing.images ?? []);
      setBaseline(snap(existing.title, existing.body, existing.tag, existing.images ?? []));
    } else {
      setTitle("");
      setBody("");
      setTag(undefined);
      setImages([]);
      setBaseline(snap("", "", undefined, []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);


  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    const urls = await filesToDataUrls(list);
    if (urls.length) haptic(12);
    setImages((prev) => [...prev, ...urls]);
    setBusy(false);
  };

  const save = () => {
    if (!title.trim() && !body.trim() && images.length === 0) { onClose(); return; }
    const payload = { title: title.trim() || "Untitled", body, tag, images };
    if (existing) update(existing.id, payload);
    else add(payload);
    onClose();
  };

  const dirty = mode === "edit" && snap(title, body, tag, images) !== baseline;
  const dismiss = () => { if (dirty) setWarn(true); else onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 z-40 bg-clay/40 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            layout
            layoutDependency={mode}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120) dismiss(); }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] min-h-[50dvh] flex-col overflow-hidden rounded-t-[2rem] bg-ivory"
            style={{
              boxShadow: "0 -20px 60px -20px rgba(74,63,53,0.35)",
              border: warn ? "2px solid var(--tag-red)" : "2px solid transparent",
            }}
          >
            <div className="flex justify-center pt-3">
              <span className="h-1.5 w-10 rounded-full bg-hairline" />
            </div>
            <div className="flex items-center justify-between px-6 pt-3">
              <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">
                {mode === "preview" ? "Note" : existing ? "Edit note" : "New note"}
              </div>
              {mode === "preview" && existing ? (
                <DetailActions onEdit={() => setMode("edit")} onDelete={() => setConfirming(true)} onClose={onClose} />
              ) : (
                <button onClick={dismiss} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-clay-soft transition-colors hover:bg-surface-hover">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {mode === "preview" && existing ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6"
              >
                {existing.tag && (
                  <div className="pt-2">
                    <TagBadge {...styleOf(existing.tag)} />
                  </div>
                )}
                <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-clay">
                  {existing.title || "Untitled"}
                </h2>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-clay-muted">
                  Edited {formatDistanceToNow(existing.updatedAt, { addSuffix: true })}
                </div>
                {existing.images && existing.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {existing.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`${existing.title || "Note"} attachment ${i + 1}`}
                        loading="lazy"
                        className="h-32 w-full rounded-2xl object-cover"
                        style={{ border: "1px solid var(--hairline)" }}
                      />
                    ))}
                  </div>
                )}
                <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-clay-soft">
                  {existing.body || "No words yet."}
                </p>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("edit")}
                  className="mt-8 mb-2 flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-clay py-4 font-medium text-ivory shadow-sm"
                >
                  <Pencil className="h-4 w-4" /> Edit note
                </motion.button>
              </motion.div>
            ) : (
            <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">

              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="mt-2 w-full bg-transparent pb-2 font-serif text-3xl tracking-tight placeholder:text-clay-muted focus:outline-none"
                style={{ borderBottom: "1px solid var(--hairline)", color: "var(--clay)" }}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <TagChip active={!tag} onClick={() => setTag(undefined)} label="None" />
                {tags.map((tg) => {
                  const s = styleOf(tg.id);
                  const t = tg.id;
                  const active = tag === t;
                  return (
                    <motion.button
                      key={t}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setTag(t)}
                      className="flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium transition-all"
                      style={{
                        background: active ? s.bg : "transparent",
                        color: active ? s.text : "var(--clay-soft)",
                        border: `1px solid ${active ? s.ring : "var(--hairline)"}`,
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
                      {s.label}
                    </motion.button>
                  );
                })}
              </div>

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Begin writing…"
                className="mt-4 flex-1 resize-none bg-transparent text-[16px] leading-relaxed placeholder:text-clay-muted focus:outline-none"
                style={{ color: "var(--clay)" }}
              />

              {/* Attachments */}
              <AnimatePresence initial={false}>
                {images.length > 0 && (
                  <motion.div
                    key="strip"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-1"
                  >
                    {images.map((src, i) => (
                      <motion.div
                        key={src.slice(-32) + i}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl"
                        style={{ border: "1px solid var(--hairline)" }}
                      >
                        <img src={src} alt={`Attachment ${i + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => { haptic(8); setImages(images.filter((_, idx) => idx !== i)); }}
                          aria-label={`Remove attachment ${i + 1}`}
                          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ivory/85 text-clay backdrop-blur-sm"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 pt-1">
                <AttachButton
                  onClick={() => { haptic(8); libraryInput.current?.click(); }}
                  icon={<ImagePlus className="h-4 w-4" />}
                  label={busy ? "Adding…" : "Photos"}
                />
                <AttachButton
                  onClick={() => { haptic(8); cameraInput.current?.click(); }}
                  icon={<Camera className="h-4 w-4" />}
                  label="Camera"
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={save}
                className="mt-3 w-full rounded-full bg-clay py-4 text-center font-medium text-ivory shadow-sm"
              >
                {existing ? "Save changes" : "Save note"}
              </motion.button>
              <input
                ref={libraryInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }}
              />
              <input
                ref={cameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }}
              />

            </div>
            )}
          </motion.div>
          <UnsavedChanges
            open={warn}
            onKeepEditing={() => setWarn(false)}
            onDiscard={() => { setWarn(false); onClose(); }}
          />
          <ConfirmDelete
            open={confirming}
            kind="note"
            name={existing?.title || "Untitled"}
            onCancel={() => setConfirming(false)}
            onConfirm={() => { if (existing) remove(existing.id); setConfirming(false); onClose(); }}
          />

        </>
      )}
    </AnimatePresence>
  );
}

function snap(title: string, body: string, tag: string | undefined, images: string[]) {
  return JSON.stringify([title, body, tag ?? null, images]);
}

function TagChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="rounded-full px-3 py-1 text-[11px] font-medium"
      style={{
        background: active ? "var(--surface-hover)" : "transparent",
        color: active ? "var(--clay)" : "var(--clay-soft)",
        border: `1px solid ${active ? "var(--clay-muted)" : "var(--hairline)"}`,
      }}
    >
      {label}
    </motion.button>
  );
}

function AttachButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-medium text-clay-soft transition-colors hover:bg-surface-hover"
      style={{ border: "1px solid var(--hairline)" }}
    >
      {icon}
      {label}
    </motion.button>
  );
}
