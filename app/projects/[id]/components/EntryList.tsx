import { useMemo } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";

import { entrySubtypeLabels, formatTime } from "../helpers/format";
import { EntrySubtypeToggles } from "./EntrySubtypeToggles";
import { StatusChangeEntry } from "./StatusChangeEntry";
import type { Entry, EntrySubtype, StatusEvent, TimelineItem } from "../types";

function EntrySubtypeBadge({ subtype }: { subtype: EntrySubtype | undefined }) {
  if (!subtype) return null;
  const label = entrySubtypeLabels[subtype];
  if (!label) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-surface-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
      {label}
    </span>
  );
}

function EditedBadge({ parentId }: { parentId: string | null | undefined }) {
  if (!parentId) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-surface-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
      Modifie
    </span>
  );
}

function EntryContent({ entry }: { entry: Entry }) {
  if (entry.entry_type === "photo" && entry.photo_url) {
    return (
      <img
        src={entry.photo_url}
        alt="Photo de chantier"
        className="max-h-96 w-full rounded-lg border border-gray-200 object-cover"
      />
    );
  }

  if (entry.entry_type === "audio" && entry.audio_url) {
    return (
      <audio controls className="w-full">
        <source src={entry.audio_url} />
      </audio>
    );
  }

  return <p className="text-sm text-text-main">{entry.text_content}</p>;
}

type EntryActionsProps = {
  entry: Entry;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isActionDisabled: boolean;
  onEditChange: (value: string) => void;
  onEditStart: (entry: Entry) => void;
  onEditCancel: () => void;
  onEditSave: (entryId: string) => void;
  onDelete: (entry: Entry) => void;
};

function EntryActions({
  entry,
  isEditing,
  isSaving,
  isDeleting,
  isActionDisabled,
  onEditChange,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDelete
}: EntryActionsProps) {
  if (entry.optimistic) return null;

  const canEdit = entry.entry_type === "text";

  if (isEditing && canEdit) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onEditSave(entry.id)}
          disabled={isSaving}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {isSaving ? "Sauvegarde..." : "Enregistrer"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-text-main shadow-sm transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onEditCancel}
          disabled={isSaving}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Annuler
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-warning shadow-sm transition hover:border-warning disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onDelete(entry)}
          disabled={isActionDisabled}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {isDeleting ? "Suppression..." : "Supprimer"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {canEdit ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-text-main shadow-sm transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onEditStart(entry)}
          disabled={isActionDisabled}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Modifier
        </button>
      ) : null}
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-warning shadow-sm transition hover:border-warning disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => onDelete(entry)}
        disabled={isActionDisabled}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {isDeleting ? "Suppression..." : "Supprimer"}
      </button>
    </div>
  );
}

type EntryItemProps = {
  entry: Entry;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isActionDisabled: boolean;
  editingValue: string;
  editingSubtype: EntrySubtype;
  onEditChange: (value: string) => void;
  onEditSubtypeChange: (value: EntrySubtype) => void;
  onEditStart: (entry: Entry) => void;
  onEditCancel: () => void;
  onEditSave: (entryId: string) => void;
  onDelete: (entry: Entry) => void;
};

function EntryItem({
  entry,
  isEditing,
  isSaving,
  isDeleting,
  isActionDisabled,
  editingValue,
  editingSubtype,
  onEditChange,
  onEditSubtypeChange,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDelete
}: EntryItemProps) {
  return (
    <li className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-brand" />
        <div className="flex-1 border-l border-dashed border-brand/30" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            <span>{formatTime(entry.created_at)}</span>
            <EntrySubtypeBadge subtype={entry.entry_subtype} />
            <EditedBadge parentId={entry.parent_entry_id} />
          </div>
          {entry.optimistic ? (
            <span className="text-xs font-semibold uppercase text-text-muted">Envoi...</span>
          ) : null}
        </div>

        {entry.entry_type === "text" && isEditing ? (
          <div className="space-y-3">
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
              rows={4}
              value={editingValue}
              onChange={(event) => onEditChange(event.target.value)}
              disabled={isSaving}
            />
            <EntrySubtypeToggles value={editingSubtype} onChange={onEditSubtypeChange} />
          </div>
        ) : (
          <EntryContent entry={entry} />
        )}

        <EntryActions
          entry={entry}
          isEditing={isEditing}
          isSaving={isSaving}
          isDeleting={isDeleting}
          isActionDisabled={isActionDisabled}
          onEditChange={onEditChange}
          onEditStart={onEditStart}
          onEditCancel={onEditCancel}
          onEditSave={onEditSave}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}

type EntryListProps = {
  entries: Entry[];
  statusEvents?: StatusEvent[];
  editingEntryId: string | null;
  editingValue: string;
  editingSubtype: EntrySubtype;
  deletingEntryId: string | null;
  savingEntryId: string | null;
  onEditChange: (value: string) => void;
  onEditSubtypeChange: (value: EntrySubtype) => void;
  onEditStart: (entry: Entry) => void;
  onEditCancel: () => void;
  onEditSave: (entryId: string) => void;
  onDelete: (entry: Entry) => void;
};

export function EntryList({
  entries,
  statusEvents = [],
  editingEntryId,
  editingValue,
  editingSubtype,
  deletingEntryId,
  savingEntryId,
  onEditChange,
  onEditSubtypeChange,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDelete
}: EntryListProps) {
  const timeline: TimelineItem[] = useMemo(() => {
    const entryItems: TimelineItem[] = entries.map((entry) => ({
      kind: "entry",
      created_at: entry.created_at,
      entry
    }));
    const statusItems: TimelineItem[] = statusEvents.map((event) => ({
      kind: "status",
      created_at: event.changed_at,
      event
    }));
    return [...entryItems, ...statusItems].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [entries, statusEvents]);

  if (!timeline.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-light text-brand shadow-inner">
          <span className="text-sm font-bold">Note</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-text-main">Carnet vide</h3>
        <p className="mt-1 text-sm text-text-muted">
          Ajoutez une note, une photo ou un memo vocal pour demarrer le suivi chantier.
        </p>
      </div>
    );
  }

  return (
    <ul className="relative z-10 flex flex-col gap-4">
      {timeline.map((item) => {
        if (item.kind === "status") {
          return <StatusChangeEntry key={`status-${item.event.id}`} event={item.event} />;
        }

        const entry = item.entry;
        const isEditing = editingEntryId === entry.id;
        const isSaving = savingEntryId === entry.id;
        const isDeleting = deletingEntryId === entry.id;
        const isActionDisabled = Boolean(entry.optimistic) || isDeleting || isSaving || isEditing;
        return (
          <EntryItem
            key={entry.id}
            entry={entry}
            isEditing={isEditing}
            isSaving={isSaving}
            isDeleting={isDeleting}
            isActionDisabled={isActionDisabled}
            editingValue={editingValue}
            editingSubtype={editingSubtype}
            onEditChange={onEditChange}
            onEditSubtypeChange={onEditSubtypeChange}
            onEditStart={onEditStart}
            onEditCancel={onEditCancel}
            onEditSave={onEditSave}
            onDelete={onDelete}
          />
        );
      })}
    </ul>
  );
}
