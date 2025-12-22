import { Pencil, Trash2, Check, X } from "lucide-react";

import { entrySubtypeLabels, formatTime } from "../helpers/format";
import type { Entry, EntrySubtype } from "../types";

type SubtypeToggleProps = {
  value: EntrySubtype;
  onChange: (value: EntrySubtype) => void;
};

function SubtypeToggles({ value, onChange }: SubtypeToggleProps) {
  const options: { value: EntrySubtype; label: string }[] = [
    { value: "task", label: "Tâche à faire" },
    { value: "client_change", label: "Demande du client" }
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Catégorie (optionnel)
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm transition ${
                isSelected
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-gray-200 bg-white text-text-main hover:border-brand/30 hover:text-brand"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                onChange={() => onChange(isSelected ? null : option.value)}
              />
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  isSelected ? "border-brand bg-brand text-white" : "border-gray-300 bg-white"
                }`}
                aria-hidden="true"
              >
                {isSelected ? "✓" : ""}
              </span>
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

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
      Modifié
    </span>
  );
}

function EntryContent({ entry }: { entry: Entry }) {
  if (entry.entry_type === "photo" && entry.photo_url) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-surface-light">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.photo_url}
          alt="Photo chantier"
          className="h-auto max-h-96 w-full object-cover"
        />
      </div>
    );
  }

  if (entry.entry_type === "audio" && entry.audio_url) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-surface-light px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Audio</span>
        <audio controls className="w-full">
          <source src={entry.audio_url} />
          Votre navigateur ne supporte pas la lecture audio.
        </audio>
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text-main">
      {entry.text_content || "Note sans titre"}
    </p>
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
  onEditStart: (entry: Entry) => void;
  onEditChange: (value: string) => void;
  onEditSubtypeChange: (value: EntrySubtype) => void;
  onEditSave: (entryId: string) => void;
  onEditCancel: () => void;
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
  onEditStart,
  onEditChange,
  onEditSubtypeChange,
  onEditSave,
  onEditCancel,
  onDelete
}: EntryItemProps) {
  const label =
    entry.entry_type === "photo" ? "Photo" : entry.entry_type === "audio" ? "Audio" : "Note";
  const canEdit = entry.entry_type === "text";

  return (
    <li className="relative flex gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-xs font-semibold uppercase text-white">
        {label[0]}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            <span>{label}</span>
            <EntrySubtypeBadge subtype={entry.entry_subtype ?? null} />
            <EditedBadge parentId={entry.parent_entry_id ?? null} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-text-muted">
            <span>{formatTime(entry.created_at)}</span>
            {canEdit ? (
              isEditing ? (
                <span className="rounded-full bg-accent/15 px-2 py-1 text-[11px] font-semibold text-accent">
                  En modification
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onEditStart(entry)}
                  disabled={isActionDisabled}
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand/20 bg-white px-3 py-1.5 text-xs font-semibold text-brand transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  <span>Modifier</span>
                </button>
              )
            ) : null}
            <button
              type="button"
              onClick={() => onDelete(entry)}
              disabled={isActionDisabled}
              className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-white px-3 py-1.5 text-xs font-semibold text-warning transition hover:border-warning/50 hover:bg-warning/5 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>{isDeleting ? "Suppression..." : "Supprimer"}</span>
            </button>
          </div>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editingValue}
              onChange={(event) => onEditChange(event.target.value)}
              disabled={isSaving}
              className="min-h-[120px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-text-main shadow-sm placeholder:text-text-muted focus:border-brand focus:outline-none disabled:bg-surface-light"
            />
            <SubtypeToggles value={editingSubtype} onChange={onEditSubtypeChange} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onEditSave(entry.id)}
                disabled={isSaving || !editingValue.trim()}
                className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-orange-500 disabled:opacity-60"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>{isSaving ? "Enregistrement..." : "Enregistrer"}</span>
              </button>
              <button
                type="button"
                onClick={onEditCancel}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-text-main shadow-sm transition hover:border-brand/30 hover:text-brand disabled:opacity-60"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span>Annuler</span>
              </button>
            </div>
          </div>
        ) : (
          <EntryContent entry={entry} />
        )}
        {entry.optimistic ? (
          <p className="text-[11px] font-semibold text-accent">Envoi en cours...</p>
        ) : null}
      </div>
    </li>
  );
}

type EntryListProps = {
  entries: Entry[];
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
  if (!entries.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-light text-brand shadow-inner">
          <span className="text-sm font-bold">Note</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-text-main">Carnet vide</h3>
        <p className="mt-1 text-sm text-text-muted">
          Ajoutez une note, une photo ou un mémo vocal pour démarrer le suivi chantier.
        </p>
      </div>
    );
  }

  return (
    <ul className="relative z-10 flex flex-col gap-4">
      {entries.map((entry) => {
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
