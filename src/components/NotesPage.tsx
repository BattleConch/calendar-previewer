import { motion, Reorder, useDragControls } from "framer-motion";
import { useNotes, type Note } from "@/lib/notes-store";
import { useTags } from "@/lib/tags-store";
import { TagFilter, useTagFilter } from "./TagFilter";
import { formatDistanceToNow } from "date-fns";
import { GripVertical } from "lucide-react";
import { haptic } from "@/lib/haptics";

export function NotesPage({ onEdit }: { onEdit: (id: string | null) => void }) {
  const { notes, reorder } = useNotes();
  const { selected, setSelected, matches } = useTagFilter("calendry.notes.tagfilter.v1");
  const shown = notes.filter((n) => matches(n.tag));
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="px-5"
    >
      <div className="flex items-start justify-between gap-2 pt-1 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-clay-soft">Journal</div>
          <p className="mt-1 text-sm text-clay-soft">
            {shown.length} note{shown.length === 1 ? "" : "s"} · hold to drag
          </p>
        </div>
        <TagFilter selected={selected} onChange={setSelected} />
      </div>

      {shown.length === 0 ? (
        <div className="rounded-3xl bg-surface px-6 py-10 text-center text-sm text-clay-muted"
          style={{ border: "1px solid var(--hairline)" }}>
          {notes.length === 0 ? "A blank page. Tap + to begin." : "No notes with those tags."}
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={shown}
          onReorder={(next) => reorder([...next.map((n) => n.id), ...notes.filter((n) => !matches(n.tag)).map((n) => n.id)])}
          className="grid grid-cols-2 gap-3"
        >
          {shown.map((n) => (
            <NoteCard key={n.id} n={n} onEdit={() => onEdit(n.id)} />
          ))}
        </Reorder.Group>
      )}
    </motion.section>
  );
}

function NoteCard({ n, onEdit }: { n: Note; onEdit: () => void }) {
  const { styleOf } = useTags();
  const s = n.tag ? styleOf(n.tag) : null;
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={n}
      dragListener={false}
      dragControls={controls}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileDrag={{ scale: 1.03, zIndex: 10, boxShadow: "0 24px 40px -20px rgba(74,63,53,0.35)" }}
      transition={{ duration: 0.22 }}
      className="relative flex min-h-[10rem] flex-col rounded-3xl p-4 text-left"
      style={{
        border: "1px solid var(--hairline)",
        background: s ? `linear-gradient(180deg, ${s.bg} 0%, var(--surface) 60%)` : "var(--surface)",
      }}
    >
      <button
        onPointerDown={(e) => { haptic(15); controls.start(e); }}
        aria-label="Drag to reorder"
        className="absolute right-2 top-2 grid h-7 w-7 cursor-grab touch-none place-items-center rounded-full text-clay-muted opacity-60 hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button onClick={onEdit} className="flex flex-1 flex-col items-start text-left">
        {s && (
          <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest"
            style={{ background: "var(--surface)", color: s.text, border: `1px solid ${s.ring}` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
            {s.label}
          </span>
        )}
        {n.images && n.images.length > 0 && (
          <div className="relative mb-2 w-full overflow-hidden rounded-2xl" style={{ border: "1px solid var(--hairline)" }}>
            <img src={n.images[0]} alt={n.title || "Note image"} loading="lazy" className="h-24 w-full object-cover" />
            {n.images.length > 1 && (
              <span className="absolute bottom-1 right-1 rounded-full bg-ivory/85 px-1.5 py-0.5 text-[10px] text-clay backdrop-blur-sm">
                +{n.images.length - 1}
              </span>
            )}
          </div>
        )}
        <div className="pr-6 font-serif text-lg leading-snug text-clay">{n.title || "Untitled"}</div>
        <div className="mt-1 line-clamp-4 text-[12px] leading-relaxed text-clay-soft">
          {n.body || "…"}
        </div>

        <div className="mt-auto pt-3 text-[10px] uppercase tracking-widest text-clay-muted">
          {formatDistanceToNow(n.updatedAt, { addSuffix: true })}
        </div>
      </button>
    </Reorder.Item>
  );
}
