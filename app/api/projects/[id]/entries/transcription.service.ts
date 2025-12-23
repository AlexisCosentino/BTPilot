import "server-only";

import { Buffer } from "buffer";
import { parseBuffer } from "music-metadata";

import { openai, TRANSCRIPTION_MODEL } from "../../../../../lib/openai";
import {
  normalizeEntryMetadata,
  updateEntryMetadata,
  type EntryMetadata,
  type EntryRow
} from "./entries.service";

export const MAX_TRANSCRIPTION_DURATION_SECONDS = 60;

async function downloadAudioFile(audioUrl: string): Promise<{
  buffer: Buffer;
  mimeType: string | null;
}> {
  const response = await fetch(audioUrl);

  if (!response.ok) {
    throw new Error(`Audio download failed (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type");

  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

async function getAudioDurationSeconds(buffer: Buffer, mimeType: string | null): Promise<number | null> {
  try {
    const metadata = await parseBuffer(buffer, mimeType ?? undefined, { duration: true });

    return typeof metadata.format.duration === "number" ? metadata.format.duration : null;
  } catch (err) {
    console.error("[transcription] Failed to parse audio metadata", err);
    return null;
  }
}

async function runTranscription(
  buffer: Buffer,
  mimeType: string | null
): Promise<{ text: string | null; language: string | null }> {
  if (!openai) {
    throw new Error("Missing OpenAI API key");
  }

  const extension = mimeType?.split("/")[1] || "webm";
  const file = new File([new Uint8Array(buffer)], `audio.${extension}`, {
    type: mimeType ?? "audio/webm"
  });

  const result = await openai.audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
    response_format: "json"
  });

  const textValue = "text" in result ? result.text : null;
  const languageValue = "language" in result ? (result as { language?: unknown }).language : null;

  return {
    text: typeof textValue === "string" ? textValue : null,
    language: typeof languageValue === "string" ? languageValue : null
  };
}

function buildMetadataUpdate(
  existing: EntryMetadata,
  updates: Partial<EntryMetadata>
): EntryMetadata {
  const timestamp = new Date().toISOString();
  return {
    ...existing,
    transcript_text: updates.transcript_text ?? null,
    transcript_model: updates.transcript_model ?? null,
    transcript_language: updates.transcript_language ?? null,
    transcript_error: updates.transcript_error ?? null,
    transcript_created_at: timestamp
  };
}

export async function transcribeEntryAudio(
  entry: EntryRow,
  projectId: string,
  companyId: string
): Promise<EntryRow> {
  const baseMetadata = normalizeEntryMetadata(entry.metadata);

  if (!entry.audio_url) {
    return entry;
  }

  let metadataUpdate: EntryMetadata | null = null;

  try {
    const { buffer, mimeType } = await downloadAudioFile(entry.audio_url);
    const durationSeconds = await getAudioDurationSeconds(buffer, mimeType);

    if (durationSeconds !== null && durationSeconds > MAX_TRANSCRIPTION_DURATION_SECONDS) {
      metadataUpdate = buildMetadataUpdate(baseMetadata, {
        transcript_text: null,
        transcript_model: null,
        transcript_language: null,
        transcript_error: "Audio trop long (max 60s)."
      });
    } else {
      const transcription = await runTranscription(buffer, mimeType);
      metadataUpdate = buildMetadataUpdate(baseMetadata, {
        transcript_text: transcription.text,
        transcript_model: TRANSCRIPTION_MODEL,
        transcript_language: transcription.language ?? null,
        transcript_error: null
      });
    }
  } catch (err) {
    console.error("[transcription] Transcription failed", err);
    metadataUpdate = buildMetadataUpdate(baseMetadata, {
      transcript_text: null,
      transcript_model: null,
      transcript_language: null,
      transcript_error: err instanceof Error ? err.message : "Transcription indisponible."
    });
  }

  const finalMetadata = metadataUpdate ?? buildMetadataUpdate(baseMetadata, { transcript_error: null });

  const { data, error } = await updateEntryMetadata(
    entry.id,
    projectId,
    companyId,
    finalMetadata
  );

  if (error) {
    console.error("[transcription] Failed to persist metadata", { entryId: entry.id, error });
    return { ...entry, metadata: finalMetadata };
  }

  return (data as EntryRow) ?? { ...entry, metadata: finalMetadata };
}
