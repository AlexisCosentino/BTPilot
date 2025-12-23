"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Composer } from "./components/Composer";
import { DeleteProjectCard } from "./components/DeleteProjectCard";
import { EntryList } from "./components/EntryList";
import { ProjectEditPanel } from "./components/ProjectEditPanel";
import { ProjectSummaryCard } from "./components/ProjectSummaryCard";
import { SummariesCard } from "./components/SummariesCard";
import { blobToDataUrl } from "./helpers/file";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { IMAGE_SIZE_LIMIT_BYTES, useImageProcessor } from "./hooks/useImageProcessor";
import { useEntries } from "./hooks/useEntries";
import { useProject } from "./hooks/useProject";
import { useSummaries } from "./hooks/useSummaries";
import { deleteProject } from "./services/projectApi";
import type { Entry, EntrySubtype } from "./types";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id =
    typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [projectActionError, setProjectActionError] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const {
    project,
    initialEntries,
    statusEvents,
    loading,
    error,
    clientError,
    statusError,
    savingClient,
    savingStatus,
    saveClientInfo,
    changeStatus
  } = useProject(id);
  const {
    summaries,
    isGenerating: isGeneratingSummary,
    generateSummaries,
    reloadSummaries
  } = useSummaries(id);
  const {
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
  } = useEntries(id, initialEntries);
  const { resizeAndCompressImage } = useImageProcessor();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  const handleAddText = useCallback(async () => {
    if (!textValue.trim()) {
      setComposerError("Ajoutez une note avant d'enregistrer.");
      return;
    }
    await createEntry({ type: "text", text: textValue, entrySubtype: textSubtype });
    setTextValue("");
    setTextSubtype(null);
  }, [createEntry, setComposerError, setTextSubtype, setTextValue, textSubtype, textValue]);

  const handleImagePick = useCallback(
    async (file: File) => {
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
      }
    },
    [createEntry, resizeAndCompressImage, setComposerError]
  );

  const handleStartRecording = useCallback(() => {
    startRecording({
      onError: setComposerError,
      onStop: async (blob) => {
        const url = await blobToDataUrl(blob);
        const fileName = `audio-${Date.now()}.webm`;
        const file = new File([blob], fileName, { type: blob.type || "audio/webm" });
        await createEntry({ type: "audio", file, previewUrl: url });
      }
    });
  }, [createEntry, setComposerError, startRecording]);

  const handleDeleteProject = useCallback(async () => {
    if (!project || !id) return;

    const confirmed = window.confirm(
      "Supprimer ce chantier et toutes les notes ? Cette action est définitive."
    );

    if (!confirmed) return;

    setProjectActionError(null);
    setIsDeletingProject(true);

    try {
      const response = await deleteProject(id);
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Suppression du chantier impossible.");
      }

      router.push("/");
    } catch (err) {
      setProjectActionError("Suppression du chantier impossible.");
      setIsDeletingProject(false);
    }
  }, [id, project, router]);

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
      <ProjectSummaryCard project={project} onEdit={() => setIsEditing(true)} />
      <SummariesCard
        summaries={summaries}
        loading={summaries.loading}
        isGenerating={isGeneratingSummary}
        error={summaries.error}
        onGenerate={async () => {
          await generateSummaries();
          await reloadSummaries();
        }}
      />

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
          {project && isEditing ? (
            <ProjectEditPanel
              project={project}
              savingClient={savingClient}
              savingStatus={savingStatus}
              clientError={clientError}
              statusError={statusError}
              onSaveClient={saveClientInfo}
              onChangeStatus={changeStatus}
              onClose={() => setIsEditing(false)}
            />
          ) : null}

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {entryActionError ? (
              <div className="border-b border-warning/30 bg-warning/5 px-4 py-3 text-sm font-semibold text-warning sm:px-5">
                {entryActionError}
              </div>
            ) : null}
            <div className="px-4 py-4 sm:px-5">
              <EntryList
                entries={sortedEntries}
                statusEvents={statusEvents}
                editingEntryId={editingEntryId}
                editingValue={editingValue}
                editingSubtype={editingSubtype}
                deletingEntryId={deletingEntryId}
                savingEntryId={savingEntryId}
                transcribingEntryId={transcribingEntryId}
                onEditChange={setEditingValue}
                onEditSubtypeChange={setEditingSubtype}
                onEditStart={startEditingEntry}
                onEditCancel={cancelEditingEntry}
                onEditSave={saveEditingEntry}
                onDelete={handleDeleteEntry}
                onRetryTranscription={retryTranscription}
              />
            </div>

            <Composer
              textValue={textValue}
              textSubtype={textSubtype}
              composerError={composerError}
              isSubmitting={isSubmitting}
              isRecording={isRecording}
              onTextChange={setTextValue}
              onTextSubtypeChange={setTextSubtype}
              onAddText={handleAddText}
              onPickImage={handleImagePick}
              onStartRecording={handleStartRecording}
              onStopRecording={stopRecording}
            />
          </div>
          {project ? (
            <DeleteProjectCard
              isDeleting={isDeletingProject}
              projectActionError={projectActionError}
              onDelete={handleDeleteProject}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
