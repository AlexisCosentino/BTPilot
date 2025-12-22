import { useRef } from "react";
import { Camera, Mic, Plus, Square } from "lucide-react";

import type { EntrySubtype } from "../types";

type ComposerProps = {
  textValue: string;
  textSubtype: EntrySubtype;
  composerError: string | null;
  isSubmitting: boolean;
  isRecording: boolean;
  onTextChange: (value: string) => void;
  onTextSubtypeChange: (value: EntrySubtype) => void;
  onAddText: () => void;
  onPickImage: (file: File) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

export function Composer({
  textValue,
  textSubtype,
  composerError,
  isSubmitting,
  isRecording,
  onTextChange,
  onTextSubtypeChange,
  onAddText,
  onPickImage,
  onStartRecording,
  onStopRecording
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="border-t border-gray-200 bg-surface-light px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-inner">
        <textarea
          value={textValue}
          onChange={(event) => onTextChange(event.target.value)}
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
                <label
                  key={option.value}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold shadow-sm transition ${
                    isSelected
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-gray-200 bg-white text-text-main hover:border-brand/30 hover:text-brand"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => onTextSubtypeChange(isSelected ? null : option.value)}
                  />
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      isSelected ? "border-brand bg-brand text-white" : "border-gray-300 bg-white"
                    }`}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                  <span>{option.label}</span>
                </label>
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
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onPickImage(file);
                }
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            />
            <button
              type="button"
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold shadow-sm transition ${
                isRecording
                  ? "bg-warning text-white hover:bg-[#b61f1f]"
                  : "border border-gray-200 bg-white text-text-main hover:border-brand/30 hover:text-brand"
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4" aria-hidden="true" />
                  <span>Arrオter le mゼmo vocal</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <span>Enregistrer un mゼmo</span>
                </>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={onAddText}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-orange-500 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{isSubmitting ? "Enregistrement..." : "Ajouter la note"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
