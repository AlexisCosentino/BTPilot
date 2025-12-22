"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Check, Mic, Pencil, Plus, Square, Trash2, X } from "lucide-react";

type EntryType = "text" | "photo" | "audio";
type EntrySubtype = "task" | "client_change" | null;

type Project = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  created_at: string;
};

type Entry = {
  id: string;
  entry_type: EntryType;
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  created_by: string;
  created_at: string;
  entry_subtype?: EntrySubtype;
  is_active?: boolean;
  parent_entry_id?: string | null;
  superseded_at?: string | null;
  optimistic?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit"
});

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  planned: "Planifié",
  in_progress: "Chantier en cours",
  on_hold: "En pause",
  completed: "Terminé",
  canceled: "Annulé"
};

const entrySubtypeLabels: Record<Exclude<EntrySubtype, null>, string> = {
  task: "Tâche",
  client_change: "Demande client"
};

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

type EntryListProps = {
  entries: Entry[];
  editingEntryId: string | null;
  editingValue: string;
  deletingEntryId: string | null;
  savingEntryId: string | null;
  onEditChange: (value: string) => void;
  onEditStart: (entry: Entry) => void;
  onEditCancel: () => void;
  onEditSave: (entryId: string) => void;
  onDelete: (entry: Entry) => void;
};

function EntryList({
  entries,
  editingEntryId,
  editingValue,
  deletingEntryId,
  savingEntryId,
  onEditChange,
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
        const label =
          entry.entry_type === "photo" ? "Photo" : entry.entry_type === "audio" ? "Audio" : "Note";
        const isEditing = editingEntryId === entry.id;
        const isSaving = savingEntryId === entry.id;
        const isDeleting = deletingEntryId === entry.id;
        const isActionDisabled = Boolean(entry.optimistic) || isDeleting || isSaving || isEditing;
        const canEdit = entry.entry_type === "text";
        return (
          <li
            key={entry.id}
            className="relative flex gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
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
                  <span>{timeFormatter.format(new Date(entry.created_at))}</span>
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
      })}
    </ul>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function estimateDataUrlBytes(dataUrl: string): number | null {
  const parts = dataUrl.split(",", 2);
  if (parts.length !== 2) return null;
  const base64 = parts[1];
  const padding = (base64.match(/=+$/) || [""])[0].length;
  return (base64.length * 3) / 4 - padding;
}

const MAX_IMAGE_WIDTH = 1280;
const JPEG_QUALITY = 0.7;
const IMAGE_SIZE_LIMIT_BYTES = 1_000_000;
const AUDIO_SIZE_LIMIT_BYTES = 3_000_000;

async function resizeAndCompressImage(
  file: File
): Promise<{ dataUrl: string; size: number; blob: Blob }> {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const scale = image.width > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / image.width : 1;
  const targetWidth = Math.round(image.width * scale);
  const targetHeight = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Impossible de traiter l'image.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("Impossible de compresser l'image."));
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });

  const dataUrl = await blobToDataUrl(blob);
  const estimatedSize = estimateDataUrlBytes(dataUrl);

  if (estimatedSize === null) {
    throw new Error("Lecture de l'image compressée impossible.");
  }

  return { dataUrl, size: estimatedSize, blob };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [entryActionError, setEntryActionError] = useState<string | null>(null);
  const [projectActionError, setProjectActionError] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");
  const [textSubtype, setTextSubtype] = useState<EntrySubtype>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioSupported, setAudioSupported] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    setAudioSupported(typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
    return () => {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    setEntryActionError(null);
    setProjectActionError(null);
    setEditingEntryId(null);
    setEditingValue("");
    setSavingEntryId(null);
    setDeletingEntryId(null);

    if (!id) {
      setProject(null);
      setEntries([]);
      setLoading(false);
      setError("Identifiant du chantier manquant.");
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${id}`, { cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as {
          project?: Project;
          entries?: Entry[];
          error?: string;
        };

        if (!active) return;

        if (!response.ok || !body.project) {
          const message =
            response.status === 401
              ? "Connectez-vous pour ouvrir ce chantier."
              : body.error || "Chantier introuvable.";
          setProject(null);
          setEntries([]);
          setError(message);
          setLoading(false);
          return;
        }

        setProject(body.project);
        setEntries(Array.isArray(body.entries) ? body.entries : []);
        setLoading(false);
      } catch (err) {
        console.error("[project-detail] Chargement chantier impossible", err);
        if (!active) return;
        setProject(null);
        setEntries([]);
        setError("Impossible de charger ce chantier. Recommencez.");
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  type CreateEntryInput =
    | { type: "text"; text: string; entrySubtype: EntrySubtype }
    | { type: "photo"; file: File; previewUrl: string }
    | { type: "audio"; file: File; previewUrl: string };

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
        response = await fetch(`/api/projects/${id}/entries`, {
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
        response = await fetch(`/api/projects/${id}/entries`, {
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
  };

  const cancelEditingEntry = () => {
    setEditingEntryId(null);
    setEditingValue("");
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
      prev.map((item) => (item.id === entryId ? { ...item, text_content: trimmed } : item))
    );

    try {
      const response = await fetch(`/api/projects/${id}/entries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, text: trimmed })
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
      const response = await fetch(`/api/projects/${id}/entries`, {
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

  const handleAddText = async () => {
    if (!textValue.trim()) {
      setComposerError("Ajoutez une note avant d'enregistrer.");
      return;
    }
    await createEntry({ type: "text", text: textValue, entrySubtype: textSubtype });
    setTextValue("");
    setTextSubtype(null);
  };

  const handleImagePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setComposerError("Choisissez un fichier image.");
      return;
    }

    try {
      setComposerError(null);
      const { dataUrl, size, blob } = await resizeAndCompressImage(file);

      if (size > IMAGE_SIZE_LIMIT_BYTES) {
        setComposerError("Photo trop lourde après compression (max 1 Mo).");
        return;
      }

      const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
        type: "image/jpeg"
      });

      await createEntry({ type: "photo", file: compressedFile, previewUrl: dataUrl });
    } catch (err) {
      console.error("[project-detail] Lecture image impossible", err);
      setComposerError("Lecture du fichier image impossible.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const startRecording = async () => {
    if (!audioSupported) {
      setComposerError("L'enregistrement audio n'est pas supporté sur cet appareil.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      mediaStreamRef.current = stream;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });
        if (blob.size > AUDIO_SIZE_LIMIT_BYTES) {
          setComposerError("Mémo vocal trop lourd (max 3 Mo).");
          return;
        }

        const url = await blobToDataUrl(blob);
        const fileName = `audio-${Date.now()}.webm`;
        const file = new File([blob], fileName, { type: blob.type || "audio/webm" });
        await createEntry({ type: "audio", file, previewUrl: url });
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("[project-detail] Démarrage enregistrement impossible", err);
      setComposerError("Micro inaccessible. Vérifiez les autorisations.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const handleDeleteProject = async () => {
    if (!project || !id) return;

    const confirmed = window.confirm(
      "Supprimer ce chantier et toutes les notes ? Cette action est définitive."
    );

    if (!confirmed) return;

    setProjectActionError(null);
    setIsDeletingProject(true);

    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Suppression du chantier impossible.");
      }

      router.push("/");
    } catch (err) {
      setProjectActionError("Suppression du chantier impossible.");
      setIsDeletingProject(false);
    }
  };

  if (!id) {
    return (
      <section className="mx-auto flex max-w-4xl flex-col gap-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Chantier</p>
          <h1 className="text-3xl font-bold leading-tight text-text-main">Carnet de bord</h1>
        </header>
        <div className="rounded-lg border border-warning/30 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-warning">Identifiant du chantier manquant.</p>
          <p className="mt-1 text-sm text-text-muted">Vérifiez l'adresse et réessayez.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-4 sm:gap-6">
      <header className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          <Link href="/" className="text-text-muted hover:text-text-main">
            Chantiers
          </Link>
          <span className="text-text-muted">/</span>
          <span className="text-text-main">Carnet</span>
        </div>
        {project ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-text-main">{project.name}</h1>
              <p className="mt-1 text-sm text-text-muted">
                Créé le {dateFormatter.format(new Date(project.created_at))}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-semibold uppercase text-white">
              {statusLabels[project.status] ?? project.status.replace("_", " ")}
            </span>
          </div>
        ) : (
          <div className="mt-3">
            <h1 className="text-3xl font-bold leading-tight text-text-main">Chantier</h1>
          </div>
        )}
        {project?.description ? (
          <p className="mt-2 text-sm text-text-main">{project.description}</p>
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            Notes de chantier, photos et mémos vocaux regroupés pour l'équipe.
          </p>
        )}
      </header>

      {loading ? (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="h-6 w-1/3 rounded-md bg-surface-light" />
          <div className="h-4 w-2/3 rounded-md bg-surface-light" />
          <div className="h-40 rounded-lg bg-surface-light" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-warning/30 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-warning">{error}</p>
          <p className="mt-1 text-sm text-text-muted">
            Rafraîchissez la page ou vérifiez vos droits d'accès.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {entryActionError ? (
              <div className="border-b border-warning/30 bg-warning/5 px-4 py-3 text-sm font-semibold text-warning sm:px-5">
                {entryActionError}
              </div>
            ) : null}
            <div className="px-4 py-4 sm:px-5">
              <EntryList
                entries={sortedEntries}
                editingEntryId={editingEntryId}
                editingValue={editingValue}
                deletingEntryId={deletingEntryId}
                savingEntryId={savingEntryId}
                onEditChange={setEditingValue}
                onEditStart={startEditingEntry}
                onEditCancel={cancelEditingEntry}
                onEditSave={saveEditingEntry}
                onDelete={handleDeleteEntry}
              />
            </div>

            <div className="border-t border-gray-200 bg-surface-light px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-inner">
                <textarea
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  placeholder="Ajouter une note chantier..."
                  className="min-h-[72px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-text-main shadow-sm placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Catégorie (optionnel)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "task" as EntrySubtype, label: "Tâche" },
                      {
                        value: "client_change" as EntrySubtype,
                        label: "Modification demandée par le client"
                      }
                    ].map((option) => {
                      const isSelected = textSubtype === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setTextSubtype(isSelected ? null : option.value)
                          }
                          aria-pressed={isSelected}
                          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm transition ${
                            isSelected
                              ? "border-brand bg-brand/10 text-brand"
                              : "border-gray-200 bg-white text-text-main hover:border-brand/30 hover:text-brand"
                          }`}
                        >
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {composerError ? (
                  <p className="text-xs font-semibold text-warning">{composerError}</p>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-text-main shadow-sm transition hover:border-brand/30 hover:text-brand"
                    >
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      <span>Ajouter une photo</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImagePick}
                    />
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold shadow-sm transition ${
                        isRecording
                          ? "bg-warning text-white hover:bg-[#b61f1f]"
                          : "border border-gray-200 bg-white text-text-main hover:border-brand/30 hover:text-brand"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="h-4 w-4" aria-hidden="true" />
                          <span>Arrêter le mémo vocal</span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" aria-hidden="true" />
                          <span>Enregistrer un mémo</span>
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddText}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-orange-500 disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>{isSubmitting ? "Enregistrement..." : "Ajouter la note"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {project ? (
            <div className="rounded-lg border border-warning/30 bg-white px-4 py-4 shadow-sm sm:px-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-warning">Suppression chantier</p>
                <p className="text-sm text-text-muted">
                  Supprimer définitivement ce chantier et tous les éléments associés.
                </p>
                {projectActionError ? (
                  <p className="text-xs font-semibold text-warning">{projectActionError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={isDeletingProject}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b61f1f] disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>{isDeletingProject ? "Suppression du chantier..." : "Supprimer le chantier"}</span>
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
