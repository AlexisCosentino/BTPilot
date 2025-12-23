import { useEffect, useMemo, useState } from "react";

import type { Entry, EntrySubtype } from "../types";

type CreateEntryInput =
  | { type: "text"; text: string; entrySubtype: EntrySubtype }
  | { type: "photo"; file: File; previewUrl: string }
  | { type: "audio"; file: File; previewUrl: string };

export function useEntries(projectId: string | null, initialEntries: Entry[]) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [entryActionError, setEntryActionError] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");
  const [textSubtype, setTextSubtype] = useState<EntrySubtype>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingSubtype, setEditingSubtype] = useState<EntrySubtype>(null);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [transcribingEntryId, setTranscribingEntryId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  useEffect(() => {
    setEntryActionError(null);
    setEditingEntryId(null);
    setEditingValue("");
    setEditingSubtype(null);
    setSavingEntryId(null);
    setDeletingEntryId(null);
    setTranscribingEntryId(null);
    setComposerError(null);
    setTextValue("");
    setTextSubtype(null);
  }, [projectId]);

  const activeEntries = useMemo(
    () => entries.filter((entry) => entry.is_active !== false),
    [entries]
  );

  const sortedEntries = useMemo(
    () =>
      [...activeEntries].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [activeEntries]
  );

  const createEntry = async (payload: CreateEntryInput) => {
    const type = payload.type;
    const optimisticContent =
      type === "text" ? payload.text.trim() : payload.previewUrl.trim();

    if (!optimisticContent) {
      setComposerError(
        type === "text"
          ? "Ajoutez du texte avant d'enregistrer."
          : "Ajoutez un fichier ou un enregistrement avant d'envoyer."
      );
      return;
    }

    setComposerError(null);
    const optimisticEntry: Entry = {
      id: `temp-${Date.now()}`,
      entry_type: type,
      text_content: type === "text" ? optimisticContent : null,
      photo_url: type === "photo" ? optimisticContent : null,
      audio_url: type === "audio" ? optimisticContent : null,
      created_by: "vous",
      created_at: new Date().toISOString(),
      metadata: null,
      entry_subtype: type === "text" ? payload.entrySubtype : null,
      is_active: true,
      parent_entry_id: null,
      superseded_at: null,
      optimistic: true
    };

    setEntries((prev) => [...prev, optimisticEntry]);
    setIsSubmitting(true);

    try {
      let response: Response;

      if (type === "text") {
        response = await fetch(`/api/projects/${projectId}/entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            content: payload.text,
            entry_subtype: payload.entrySubtype ?? null
          })
        });
      } else {
        const formData = new FormData();
        formData.append("type", type);
        formData.append("file", payload.file);
        response = await fetch(`/api/projects/${projectId}/entries`, {
          method: "POST",
          body: formData
        });
      }

      const body = (await response.json().catch(() => ({}))) as { entry?: Entry; error?: string };

      if (!response.ok || !body.entry) {
        const fallbackError =
          response.status === 413
            ? type === "photo"
              ? "Photo trop lourde (max 1 Mo)."
              : "Fichier audio trop lourd (max 3 Mo)."
            : "Impossible d'ajouter la note.";
        throw new Error(body.error || fallbackError);
      }

      setEntries((prev) =>
        [...prev.filter((item) => item.id !== optimisticEntry.id), body.entry as Entry]
      );
    } catch (err) {
      console.error("[project-detail] Création de note impossible", err);
      setEntries((prev) => prev.filter((item) => item.id !== optimisticEntry.id));
      setComposerError("Impossible de sauvegarder la note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingEntry = (entry: Entry) => {
    if (entry.entry_type !== "text" || entry.optimistic) return;
    setEntryActionError(null);
    setEditingEntryId(entry.id);
    setEditingValue(entry.text_content || "");
    setEditingSubtype(entry.entry_subtype ?? null);
  };

  const cancelEditingEntry = () => {
    setEditingEntryId(null);
    setEditingValue("");
    setEditingSubtype(null);
    setSavingEntryId(null);
  };

  const saveEditingEntry = async (entryId: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setEntryActionError("Le texte ne peut pas être vide.");
      return;
    }

    const current = entries.find((item) => item.id === entryId);
    if (!current) return;

    setEntryActionError(null);
    setSavingEntryId(entryId);
    setEntries((prev) =>
      prev.map((item) =>
        item.id === entryId
          ? { ...item, text_content: trimmed, entry_subtype: editingSubtype }
          : item
      )
    );

    try {
      const response = await fetch(`/api/projects/${projectId}/entries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, text: trimmed, entry_subtype: editingSubtype })
      });
      const body = (await response.json().catch(() => ({}))) as { entry?: Entry; error?: string };

      if (!response.ok || !body.entry) {
        throw new Error(body.error || "Mise à jour impossible.");
      }

      setEntries((prev) => {
        const withoutOld = prev.filter((item) => item.id !== entryId);
        return [...withoutOld, body.entry as Entry];
      });
      setEditingEntryId(null);
      setEditingValue("");
      setEditingSubtype(null);
    } catch (err) {
      setEntryActionError("Mise à jour impossible.");
      setEntries((prev) => {
        const hasOld = prev.some((item) => item.id === entryId);
        if (hasOld) {
          return prev.map((item) => (item.id === entryId ? current : item));
        }
        return [...prev, current];
      });
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleDeleteEntry = async (entry: Entry) => {
    if (entry.optimistic) return;
    setEntryActionError(null);
    setDeletingEntryId(entry.id);
    setEntries((prev) => prev.filter((item) => item.id !== entry.id));

    if (editingEntryId === entry.id) {
      cancelEditingEntry();
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/entries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id })
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Suppression impossible.");
      }
    } catch (err) {
      setEntryActionError("Suppression impossible.");
      setEntries((prev) =>
        prev.some((item) => item.id === entry.id) ? prev : [...prev, entry]
      );
    } finally {
      setDeletingEntryId(null);
    }
  };

  const retryTranscription = async (entryId: string) => {
    if (!projectId) return;

    const current = entries.find((item) => item.id === entryId);
    if (!current || current.entry_type !== "audio") return;

    setEntryActionError(null);
    setTranscribingEntryId(entryId);

    try {
      const response = await fetch(`/api/projects/${projectId}/entries/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId })
      });

      const body = (await response.json().catch(() => ({}))) as { entry?: Entry; error?: string };

      if (!response.ok || !body.entry) {
        throw new Error(body.error || "Transcription indisponible.");
      }

      if (!body.entry) {
        return;
      }

      setEntries((prev) =>
        prev.map((item) =>
          item.id === entryId ? { ...item, metadata: body.entry!.metadata } : item
        )
      );
    } catch (err) {
      setEntryActionError("Transcription indisponible.");
    } finally {
      setTranscribingEntryId(null);
    }
  };

  return {
    entries,
    sortedEntries,
    composerError,
    setComposerError,
    entryActionError,
    setEntryActionError,
    textValue,
    setTextValue,
    textSubtype,
    setTextSubtype,
    isSubmitting,
    editingEntryId,
    editingValue,
    setEditingValue,
    editingSubtype,
    setEditingSubtype,
    savingEntryId,
    deletingEntryId,
    transcribingEntryId,
    createEntry,
    startEditingEntry,
    cancelEditingEntry,
    saveEditingEntry,
    handleDeleteEntry,
    retryTranscription
  };
}
