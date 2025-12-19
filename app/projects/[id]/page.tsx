"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type SVGProps } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type EntryType = "text" | "photo" | "audio";

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
  optimistic?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 7h12m-9 3v7m6-7v7M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7H6Z"
      />
    </svg>
  );
}

function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4 16 7.5-7.5a2.121 2.121 0 0 1 3 0l1 1a2.121 2.121 0 0 1 0 3L8 20H4v-4Z"
      />
    </svg>
  );
}

function EntryContent({ entry }: { entry: Entry }) {
  if (entry.entry_type === "photo" && entry.photo_url) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.photo_url}
          alt="Project entry"
          className="h-auto max-h-96 w-full object-cover"
        />
      </div>
    );
  }

  if (entry.entry_type === "audio" && entry.audio_url) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Audio</span>
        <audio controls className="w-full">
          <source src={entry.audio_url} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
      {entry.text_content || "Untitled note"}
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          📒
        </div>
        <h3 className="mt-3 text-lg font-semibold text-slate-900">Blank notebook</h3>
        <p className="mt-1 text-sm text-slate-600">
          Add a quick note, drop in a photo, or record an audio clip to get started.
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
            className="relative flex gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold uppercase text-white">
              {label[0]}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{timeFormatter.format(new Date(entry.created_at))}</span>
                  {canEdit ? (
                    isEditing ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                        Editing
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEditStart(entry)}
                        disabled={isActionDisabled}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:translate-y-0 disabled:opacity-60"
                      >
                        <EditIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    )
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDelete(entry)}
                    disabled={isActionDisabled}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:translate-y-0 disabled:opacity-60"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {isDeleting ? "Deleting..." : "Delete"}
                    </span>
                  </button>
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editingValue}
                    onChange={(event) => onEditChange(event.target.value)}
                    disabled={isSaving}
                    className="min-h-[120px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEditSave(entry.id)}
                      disabled={isSaving || !editingValue.trim()}
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:translate-y-0 disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={onEditCancel}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:translate-y-0 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <EntryContent entry={entry} />
              )}
              {entry.optimistic ? (
                <p className="text-[11px] font-semibold text-amber-700">Saving...</p>
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
    throw new Error("Could not process image.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("Could not compress image."));
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });

  const dataUrl = await blobToDataUrl(blob);
  const estimatedSize = estimateDataUrlBytes(dataUrl);

  if (estimatedSize === null) {
    throw new Error("Could not read the compressed image.");
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

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [entries]
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
      setError("Project id is missing.");
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
              ? "Please sign in to view this project."
              : body.error || "Project not found.";
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
        console.error("[project-detail] Failed to load project", err);
        if (!active) return;
        setProject(null);
        setEntries([]);
        setError("Failed to load this project. Please try again.");
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  type CreateEntryInput =
    | { type: "text"; text: string }
    | { type: "photo"; file: File; previewUrl: string }
    | { type: "audio"; file: File; previewUrl: string };

  const createEntry = async (payload: CreateEntryInput) => {
    const type = payload.type;
    const optimisticContent =
      type === "text" ? payload.text.trim() : payload.previewUrl.trim();

    if (!optimisticContent) {
      setComposerError(
        type === "text" ? "Write something first." : "Add a file or recording before posting."
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
      created_by: "you",
      created_at: new Date().toISOString(),
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
          body: JSON.stringify({ type, content: payload.text })
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
              ? "That image is too large. Please keep it under 1 MB."
              : "That file is too large. Please keep it under 3 MB."
            : "Failed to create entry.";
        throw new Error(body.error || fallbackError);
      }

      setEntries((prev) =>
        [...prev.filter((item) => item.id !== optimisticEntry.id), body.entry as Entry]
      );
    } catch (err) {
      console.error("[project-detail] Failed to create entry", err);
      setEntries((prev) => prev.filter((item) => item.id !== optimisticEntry.id));
      setComposerError(err instanceof Error ? err.message : "Failed to save entry.");
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
      setEntryActionError("Text cannot be empty.");
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
        throw new Error(body.error || "Failed to update entry.");
      }

      setEntries((prev) => prev.map((item) => (item.id === entryId ? (body.entry as Entry) : item)));
      setEditingEntryId(null);
      setEditingValue("");
    } catch (err) {
      setEntryActionError(err instanceof Error ? err.message : "Failed to update entry.");
      setEntries((prev) => prev.map((item) => (item.id === entryId ? current : item)));
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
        throw new Error(body.error || "Failed to delete entry.");
      }
    } catch (err) {
      setEntryActionError(err instanceof Error ? err.message : "Failed to delete entry.");
      setEntries((prev) =>
        prev.some((item) => item.id === entry.id) ? prev : [...prev, entry]
      );
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleAddText = async () => {
    if (!textValue.trim()) {
      setComposerError("Write something first.");
      return;
    }
    await createEntry({ type: "text", text: textValue });
    setTextValue("");
  };

  const handleImagePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setComposerError("Please choose an image file.");
      return;
    }

    try {
      setComposerError(null);
      const { dataUrl, size, blob } = await resizeAndCompressImage(file);

      if (size > IMAGE_SIZE_LIMIT_BYTES) {
        setComposerError(
          "That image is too large after compression. Please upload a smaller photo (under 1 MB)."
        );
        return;
      }

      const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
        type: "image/jpeg"
      });

      await createEntry({ type: "photo", file: compressedFile, previewUrl: dataUrl });
    } catch (err) {
      console.error("[project-detail] Failed to read image", err);
      setComposerError("Could not read that image file.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const startRecording = async () => {
    if (!audioSupported) {
      setComposerError("Audio recording is not supported in this browser.");
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
          setComposerError("Recording is too large. Please keep audio under 3 MB.");
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
      console.error("[project-detail] Failed to start recording", err);
      setComposerError("Could not start audio recording. Check microphone permissions.");
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
      "Delete this project and all of its entries? This cannot be undone."
    );

    if (!confirmed) return;

    setProjectActionError(null);
    setIsDeletingProject(true);

    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Failed to delete project.");
      }

      router.push("/");
    } catch (err) {
      setProjectActionError(err instanceof Error ? err.message : "Failed to delete project.");
      setIsDeletingProject(false);
    }
  };

  const notebookBackground =
    "bg-[repeating-linear-gradient(to_bottom,#f8fafc,#f8fafc_44px,#e2e8f0_45px,#f8fafc_46px)]";

  if (!id) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900">Notebook</h1>
        </header>
        <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-rose-700">Project id is missing.</p>
          <p className="mt-1 text-sm text-slate-600">Check the URL and try again.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            Projects
          </Link>
          <span className="text-slate-400">/</span>
          <span>Notebook</span>
        </div>
        {project ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900">
                {project.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Created {dateFormatter.format(new Date(project.created_at))}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {project.status.replace("_", " ")}
            </span>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">Project</h1>
          </div>
        )}
        {project?.description ? (
          <p className="text-sm text-slate-700">{project.description}</p>
        ) : (
          <p className="text-sm text-slate-500">Keep notes, photos, and audio logs in one place.</p>
        )}
      </header>

      {loading ? (
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-1/3 rounded-lg bg-slate-100" />
          <div className="h-4 w-2/3 rounded-lg bg-slate-100" />
          <div className="h-40 rounded-2xl bg-slate-100" />
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <p className="mt-1 text-sm text-slate-600">
            Refresh the page or check your access before trying again.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-sm">
          <div className={`relative px-4 py-5 sm:px-6 ${notebookBackground}`}>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/70" />
            <div className="absolute left-8 top-0 h-full w-px bg-slate-200" />
            {entryActionError ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm">
                {entryActionError}
              </div>
            ) : null}
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

          <div className="border-t border-slate-200 bg-white/95 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner">
              <textarea
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
                placeholder="Write a note..."
                className="min-h-[72px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
              {composerError ? (
                <p className="text-xs font-semibold text-rose-700">{composerError}</p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                  >
                    📷 Add image
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
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-sm transition ${
                      isRecording
                        ? "bg-rose-600 text-white hover:bg-rose-500"
                        : "bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow"
                    }`}
                  >
                    {isRecording ? "■ Stop recording" : "🎙️ Record audio"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddText}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:translate-y-0 disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Add text"}
                </button>
              </div>
            </div>
          </div>
          </div>
          {project ? (
            <div className="rounded-3xl border border-rose-100 bg-white/95 px-4 py-4 shadow-sm sm:px-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-rose-700">Danger zone</p>
                <p className="text-sm text-slate-600">
                  Permanently delete this project and all associated entries and files.
                </p>
                {projectActionError ? (
                  <p className="text-xs font-semibold text-rose-700">{projectActionError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={isDeletingProject}
                  className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow disabled:translate-y-0 disabled:opacity-60"
                >
                  {isDeletingProject ? "Deleting project..." : "Delete project"}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
