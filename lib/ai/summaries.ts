import "server-only";

import openai from "../openai";
import type { EntryResponse } from "../../app/api/projects/[id]/entries/entries.service";

export type SummaryState = "idle" | "dirty" | "scheduled" | "generating" | "ready" | "blocked";

export type SummaryMetadata = {
  ai_summary_artisan?: string | null;
  ai_summary_artisan_short?: string | null;
  ai_summary_artisan_detail?: string | null;
  ai_summary_client?: string | null;
  ai_summary_client_short?: string | null;
  ai_summary_client_detail?: string | null;
  ai_summary_updated_at?: string | null;
  ai_summary_state?: SummaryState | null;
  ai_summary_dirty_at?: string | null;
  ai_summary_scheduled_for?: string | null;
  ai_summary_last_entry_at?: string | null;
  ai_summary_generation_started_at?: string | null;
} & Record<string, unknown>;

type ParsedSections = {
  artisan_short: string | null;
  artisan_detail: string | null;
  client_short: string | null;
  client_detail: string | null;
};

export function extractSummaryMetadata(metadata: Record<string, unknown> | null): SummaryMetadata {
  const safe = metadata ?? {};
  return {
    ...safe,
    ai_summary_artisan: typeof safe.ai_summary_artisan === "string" ? safe.ai_summary_artisan : null,
    ai_summary_artisan_short:
      typeof safe.ai_summary_artisan_short === "string" ? safe.ai_summary_artisan_short : null,
    ai_summary_artisan_detail:
      typeof safe.ai_summary_artisan_detail === "string" ? safe.ai_summary_artisan_detail : null,
    ai_summary_client: typeof safe.ai_summary_client === "string" ? safe.ai_summary_client : null,
    ai_summary_client_short:
      typeof safe.ai_summary_client_short === "string"
        ? safe.ai_summary_client_short
        : typeof safe.ai_summary_client === "string"
          ? safe.ai_summary_client
          : null,
    ai_summary_client_detail:
      typeof safe.ai_summary_client_detail === "string" ? safe.ai_summary_client_detail : null,
    ai_summary_updated_at:
      typeof safe.ai_summary_updated_at === "string" ? safe.ai_summary_updated_at : null,
    ai_summary_state:
      typeof safe.ai_summary_state === "string" ? (safe.ai_summary_state as SummaryState) : null,
    ai_summary_dirty_at: typeof safe.ai_summary_dirty_at === "string" ? safe.ai_summary_dirty_at : null,
    ai_summary_scheduled_for:
      typeof safe.ai_summary_scheduled_for === "string" ? safe.ai_summary_scheduled_for : null,
    ai_summary_last_entry_at:
      typeof safe.ai_summary_last_entry_at === "string" ? safe.ai_summary_last_entry_at : null,
    ai_summary_generation_started_at:
      typeof safe.ai_summary_generation_started_at === "string"
        ? safe.ai_summary_generation_started_at
        : null
  };
}

export function mergeSummaryMetadata(
  metadata: Record<string, unknown> | null,
  summary: {
    artisan_short: string;
    artisan_detail: string;
    client_short: string;
    client_detail: string;
    updatedAt: string;
  }
): SummaryMetadata {
  return {
    ...(metadata ?? {}),
    ai_summary_artisan: summary.artisan_short,
    ai_summary_artisan_short: summary.artisan_short,
    ai_summary_artisan_detail: summary.artisan_detail,
    ai_summary_client: summary.client_short,
    ai_summary_client_short: summary.client_short,
    ai_summary_client_detail: summary.client_detail,
    ai_summary_updated_at: summary.updatedAt,
    ai_summary_state: "ready",
    ai_summary_dirty_at: null,
    ai_summary_scheduled_for: null
  };
}

function buildTimeline(entries: EntryResponse[]): string {
  return entries
    .filter((entry) => entry.is_active !== false)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((entry) => {
      const date = new Date(entry.created_at).toISOString().slice(0, 16).replace("T", " ");
      const subtype = entry.entry_subtype ? ` [${entry.entry_subtype.toUpperCase()}]` : "";
      const content =
        entry.text_content ??
        entry.metadata?.transcript_text ??
        (entry.photo_url
          ? "Photo ajoutée"
          : entry.entry_type === "audio"
            ? "Mémo audio ajouté"
            : "Note ajoutée");
      const label =
        entry.entry_type === "text"
          ? "NOTE"
          : entry.entry_type === "photo"
            ? "PHOTO"
            : "AUDIO";
      return `- ${date} [${label}]${subtype}: ${content}`;
    })
    .join("\n");
}

function buildSystemPrompt(): string {
  return [
    "Tu es un assistant chantier.",
    "Lis TOUT le journal chronologique fourni.",
    "Produis quatre sections textuelles complètes : ARTISAN_SHORT, ARTISAN_DETAIL, CLIENT_SHORT, CLIENT_DETAIL.",
    "ARTISAN_SHORT : résumé court (3 à 5 lignes) pour le pilotage, ton factuel.",
    "ARTISAN_DETAIL : journal chronologique avec date+heure par puce, inclure notes, transcriptions audio, photos, tâches, demandes client, changements de statut.",
    "CLIENT_SHORT : 1 à 2 paragraphes simples et rassurants, sans jargon ni heures, mentionne les demandes client.",
    "CLIENT_DETAIL : chronologie factuelle (date par ligne, heure optionnelle), sans labels techniques, sans jargon, sans justification.",
    "N'invente rien, n'ignore aucune entrée, pas de langage juridique ou défensif.",
    "Structure la réponse avec les délimiteurs fournis, aucune section vide si des entrées existent."
  ].join(" ");
}

function buildUserPrompt(timeline: string): string {
  if (!timeline.trim()) {
    return "Aucune entrée active pour ce chantier. Réponds en français en indiquant qu'il n'y a rien à résumer.";
  }

  const header = [
    "Synthèse ARTISAN_SHORT : 3 à 5 lignes, vue globale, avancement, points clés / risques.",
    "Synthèse ARTISAN_DETAIL : puces factuelles, chronologiques, date+heure, inclure tâches, demandes client, photos, transcriptions audio, changements de statut.",
    "Synthèse CLIENT_SHORT : 1 à 2 paragraphes calmes et positifs, sans jargon ni heures, mentionne les demandes client.",
    "Synthèse CLIENT_DETAIL : chronologie factuelle, date sur chaque ligne (heure optionnelle), aucun label technique, aucun jargon, aucune justification.",
    "Utilise uniquement le journal fourni.",
    "Structure la réponse EXACTEMENT avec les marqueurs :",
    "===ARTISAN_SHORT===",
    "(texte)",
    "===ARTISAN_DETAIL===",
    "(texte)",
    "===CLIENT_SHORT===",
    "(texte)",
    "===CLIENT_DETAIL===",
    "(texte)",
    "",
    "JOURNAL À ANALYSER :",
    "<<<TIMELINE>>>",
    "{timeline}",
    "<<<END>>>"
  ].join(" ");

  return header.replace("{timeline}", timeline);
}

function parseSections(raw: string): ParsedSections {
  const text = raw.trim();
  const markerRegex =
    /===\s*(ARTISAN_SHORT|ARTISAN_DETAIL|CLIENT_SHORT|CLIENT_DETAIL)\s*===/gi;
  const markers: Array<{
    key: "ARTISAN_SHORT" | "ARTISAN_DETAIL" | "CLIENT_SHORT" | "CLIENT_DETAIL";
    start: number;
    end: number;
  }> = [];
  let match: RegExpExecArray | null;
  while ((match = markerRegex.exec(text))) {
    markers.push({
      key: match[1].toUpperCase() as
        | "ARTISAN_SHORT"
        | "ARTISAN_DETAIL"
        | "CLIENT_SHORT"
        | "CLIENT_DETAIL",
      start: match.index,
      end: match.index + match[0].length
    });
  }

  if (!markers.length) {
    return {
      artisan_short: text,
      artisan_detail: text,
      client_short: text,
      client_detail: text
    };
  }

  markers.sort((a, b) => a.start - b.start);
  const sections: Record<
    "ARTISAN_SHORT" | "ARTISAN_DETAIL" | "CLIENT_SHORT" | "CLIENT_DETAIL",
    string
  > = {
    ARTISAN_SHORT: "",
    ARTISAN_DETAIL: "",
    CLIENT_SHORT: "",
    CLIENT_DETAIL: ""
  };

  markers.forEach((marker, idx) => {
    const nextStart = markers[idx + 1]?.start ?? text.length;
    const body = text.slice(marker.end, nextStart).trim();
    sections[marker.key] = body;
  });

  return {
    artisan_short: sections.ARTISAN_SHORT || null,
    artisan_detail: sections.ARTISAN_DETAIL || null,
    client_short: sections.CLIENT_SHORT || null,
    client_detail: sections.CLIENT_DETAIL || null
  };
}

async function callOpenAiForSummaries(entries: EntryResponse[]): Promise<ParsedSections> {
  const timeline = buildTimeline(entries);

  console.log("AI TIMELINE LENGTH", timeline.length);
  console.log("AI TIMELINE PREVIEW", timeline.slice(0, 300));

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(timeline) }
    ]
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Empty AI response");
  }

  return parseSections(content);
}

export async function generateProjectSummaries(entries: EntryResponse[]) {
  if (!entries.length) {
    return {
      artisan_short: "Aucune synthèse disponible pour l'instant.",
      artisan_detail: "Aucune activité enregistrée.",
      client_short: "Rien à résumer pour le moment. Nous vous tenons informé.",
      client_detail: "Aucune activité enregistrée.",
      updatedAt: new Date().toISOString()
    };
  }

  const modelResult = await callOpenAiForSummaries(entries);
  const fallback = buildTimeline(entries);

  const artisan_short =
    typeof modelResult.artisan_short === "string" && modelResult.artisan_short.trim()
      ? modelResult.artisan_short.trim()
      : fallback;
  const artisan_detail =
    typeof modelResult.artisan_detail === "string" && modelResult.artisan_detail.trim()
      ? modelResult.artisan_detail.trim()
      : fallback;
  const client_short =
    typeof modelResult.client_short === "string" && modelResult.client_short.trim()
      ? modelResult.client_short.trim()
      : "Point rapide sur le chantier:\n" + fallback;
  const client_detail =
    typeof modelResult.client_detail === "string" && modelResult.client_detail.trim()
      ? modelResult.client_detail.trim()
      : fallback;

  return {
    artisan_short,
    artisan_detail,
    client_short,
    client_detail,
    updatedAt: new Date().toISOString()
  };
}
