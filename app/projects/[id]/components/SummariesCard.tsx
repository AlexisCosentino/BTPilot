import { useCallback, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatDate, formatTime } from "../helpers/format";
import type { Project, ProjectSummaries, StatusEvent } from "../types";
import { ArtisanPdf } from "./pdf/ArtisanPdf";
import { ClientPdf } from "./pdf/ClientPdf";

type SummaryItem = {
  id: string;
  dateText: string | null;
  timeText: string | null;
  label: string | null;
  description: string;
  isStatusChange: boolean;
};

type SummaryBadgeState = "waiting" | "pending" | "up_to_date" | "late";

const SUMMARY_BADGES: Record<SummaryBadgeState, { label: string; className: string }> = {
  waiting: {
    label: "En attente",
    className: "border-gray-200 bg-gray-100 text-gray-700"
  },
  pending: {
    label: "Mise a jour",
    className: "border-orange-200 bg-orange-100 text-orange-800"
  },
  up_to_date: {
    label: "A jour",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800"
  },
  late: {
    label: "En retard",
    className: "border-red-200 bg-red-100 text-red-800"
  }
};

const LABEL_MAP: Record<string, string> = {
  TASK: "Tâche",
  TACHE: "Tâche",
  CLIENT: "Client",
  CLIENT_CHANGE: "Demande client",
  DEMANDE_CLIENT: "Demande client",
  REQUEST: "Demande client",
  RISK: "Risque",
  RISQUE: "Risque",
  BLOCKER: "Blocage",
  INCIDENT: "Incident",
  ISSUE: "Incident",
  PROGRESS: "Avancement",
  AVANCEMENT: "Avancement",
  STATUS: "Changement de statut",
  STATUT: "Changement de statut",
  DECISION: "Décision",
  NOTE: "Note",
  INFO: "Information"
};

function normalizeLabel(raw: string) {
  const cleaned = raw.trim().replace(/[\[\]]/g, "");
  const normalized = cleaned.replace(/\s+/g, "_").replace(/-/g, "_").toUpperCase();
  const looksTechnical = /[_A-Z]{3,}/.test(normalized);
  const label = LABEL_MAP[normalized] || cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  const isStatusChange = /STATUT|STATUS/.test(normalized) || /statut|status/i.test(cleaned);

  return { label, isStatusChange, looksTechnical };
}

function extractDateParts(text: string) {
  let working = text.trim();
  let dateText: string | null = null;
  let timeText: string | null = null;

  const isoMatch = working.match(/^\[?(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?\]?/);
  const frMatch = working.match(/^\[?(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?(?:\s+(\d{1,2}(?::\d{2}|h\d{0,2})?))?\]?/);

  if (isoMatch) {
    const isoDate = isoMatch[1];
    const timePart = isoMatch[2] ?? null;
    const parsed = new Date(`${isoDate}T${timePart ?? "00:00"}`);

    dateText = !Number.isNaN(parsed.getTime()) ? formatDate(parsed) : isoDate;
    timeText = timePart ? (!Number.isNaN(parsed.getTime()) ? formatTime(parsed) : timePart) : null;
    working = working.slice(isoMatch[0].length).trim().replace(/^[\-\u2013\|:]\s*/, "");
  } else if (frMatch) {
    const day = frMatch[1] ? frMatch[1].padStart(2, "0") : "";
    const month = frMatch[2] ? frMatch[2].padStart(2, "0") : "";
    const yearRaw = frMatch[3];
    const year =
      yearRaw && yearRaw.length === 2
        ? `20${yearRaw}`
        : yearRaw ?? new Date().getFullYear().toString();
    const timePart = frMatch[4]?.replace("h", ":") ?? null;
    const parsed = new Date(`${year}-${month}-${day}T${timePart ?? "00:00"}`);

    dateText = !Number.isNaN(parsed.getTime()) ? formatDate(parsed) : `${day}/${month}/${year}`;
    timeText = timePart ? (!Number.isNaN(parsed.getTime()) ? formatTime(parsed) : timePart) : null;
    working = working.slice(frMatch[0].length).trim().replace(/^[\-\u2013\|:]\s*/, "");
  }

  return { remaining: working, dateText, timeText };
}

function parseDetailLines(detailText: string | null, options?: { dropTechnicalLabel?: boolean }) {
  const dropTechnicalLabel = options?.dropTechnicalLabel ?? false;

  return (detailText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      let working = line.replace(/^[-*•·]+\s*/, "").trim();
      const { remaining, dateText, timeText } = extractDateParts(working);
      working = remaining;

      let label: string | null = null;
      let isStatusChange = false;

      const labelPatterns = [
        /^\[([^\]]+)\]\s*/,
        /^([A-Z][A-Z_ ]{2,})\s*(?:[:\-\|]\s*)/,
        /^(Demande client|Risque|Tache|Tâche|Avancement|Statut|Note|Client)\s*[:\-]\s*/i
      ];

      for (const pattern of labelPatterns) {
        const match = working.match(pattern);
        if (match) {
          const { label: friendlyLabel, isStatusChange: statusChange, looksTechnical } = normalizeLabel(match[1]);
          if (!(dropTechnicalLabel && looksTechnical)) {
            label = friendlyLabel;
          }
          isStatusChange = statusChange;
          working = working.slice(match[0].length).trim();
          break;
        }
      }

      const description = working.replace(/^[:\-\u2013\|]+\s*/, "") || line;
      if (!isStatusChange && /statut|status/i.test(description)) {
        isStatusChange = true;
      }

      const item: SummaryItem = {
        id: `summary-${index}-${label ?? "item"}`,
        dateText,
        timeText,
        label,
        description,
        isStatusChange
      };

      return item;
    });
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function resolveSummaryBadgeState({
  eligibleEntryCount,
  summaryState,
  generatedAt,
  lastEntryAt
}: {
  eligibleEntryCount: number;
  summaryState: ProjectSummaries["ai_summary_state"];
  generatedAt: string | null;
  lastEntryAt: string | null;
}): SummaryBadgeState {
  if (eligibleEntryCount < 2) return "waiting";

  if (summaryState === "dirty" || summaryState === "scheduled" || summaryState === "generating") {
    return "pending";
  }

  const generatedAtDate = parseIsoDate(generatedAt);
  const lastEntryDate = parseIsoDate(lastEntryAt);

  if (!generatedAtDate || !lastEntryDate) return "late";

  return generatedAtDate.getTime() >= lastEntryDate.getTime() ? "up_to_date" : "late";
}

type SummariesCardProps = {
  project: Project | null;
  statusEvents: StatusEvent[];
  summaries: ProjectSummaries;
  projectId: string;
  eligibleEntryCount: number;
  lastEligibleEntryAt: string | null;
  loading: boolean;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  onReload?: () => void;
};

export function SummariesCard({
  project,
  statusEvents,
  summaries,
  projectId,
  eligibleEntryCount,
  lastEligibleEntryAt,
  loading,
  isGenerating,
  error,
  onGenerate
}: SummariesCardProps) {
  const [activeTab, setActiveTab] = useState<"artisan" | "client">("client");
  const [showClientDetail, setShowClientDetail] = useState(false);
  const [exporting, setExporting] = useState<"client" | "artisan" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const artisanShort = useMemo(() => {
    return (
      summaries.ai_summary_artisan_short ??
      summaries.ai_summary_artisan ??
      "Rien à résumer pour l'instant."
    );
  }, [summaries.ai_summary_artisan, summaries.ai_summary_artisan_short]);

  const artisanDetails = useMemo(
    () =>
      parseDetailLines(
        summaries.ai_summary_artisan_detail ??
          summaries.ai_summary_artisan ??
          summaries.ai_summary_artisan_short ??
          ""
      ),
    [
      summaries.ai_summary_artisan,
      summaries.ai_summary_artisan_detail,
      summaries.ai_summary_artisan_short
    ]
  );

  const clientShort = useMemo(() => {
    return (
      summaries.ai_summary_client_short ??
      summaries.ai_summary_client ??
      "Point rapide : rien à signaler pour l'instant."
    );
  }, [summaries.ai_summary_client, summaries.ai_summary_client_short]);

  const clientDetails = useMemo(
    () =>
      parseDetailLines(
        summaries.ai_summary_client_detail ??
          summaries.ai_summary_client_short ??
          summaries.ai_summary_client ??
          "",
        { dropTechnicalLabel: true }
      ),
    [
      summaries.ai_summary_client,
      summaries.ai_summary_client_detail,
      summaries.ai_summary_client_short
    ]
  );

  const hasMinimumEntries = eligibleEntryCount >= 2;
  const summaryState = summaries.ai_summary_state ?? null;
  const badgeState = resolveSummaryBadgeState({
    eligibleEntryCount,
    summaryState,
    generatedAt: summaries.ai_summary_updated_at,
    lastEntryAt: lastEligibleEntryAt
  });
  const badge = SUMMARY_BADGES[badgeState];
  const isPending = badgeState === "pending";
  const updatedAtDate = summaries.ai_summary_updated_at
    ? new Date(summaries.ai_summary_updated_at)
    : null;
  const updatedDateText = updatedAtDate ? formatDate(updatedAtDate) : null;
  const updatedTimeText = updatedAtDate ? formatTime(updatedAtDate) : null;

  const hasClientSummary = useMemo(
    () =>
      Boolean(
        summaries.ai_summary_client_short?.trim() ||
          summaries.ai_summary_client_detail?.trim() ||
          summaries.ai_summary_client?.trim()
      ),
    [
      summaries.ai_summary_client,
      summaries.ai_summary_client_detail,
      summaries.ai_summary_client_short
    ]
  );

  const hasArtisanSummary = useMemo(
    () =>
      Boolean(
        summaries.ai_summary_artisan_short?.trim() ||
          summaries.ai_summary_artisan_detail?.trim() ||
          summaries.ai_summary_artisan?.trim()
      ),
    [
      summaries.ai_summary_artisan,
      summaries.ai_summary_artisan_detail,
      summaries.ai_summary_artisan_short
    ]
  );

  const isBusy = isGenerating || isPending;
  const canGenerate = hasMinimumEntries && !isBusy;

  const handleExport = useCallback(
    async (type: "client" | "artisan") => {
      if (!project || exporting) return;

      setExportError(null);
      setExporting(type);

      try {
        const doc =
          type === "client" ? (
            <ClientPdf project={project} summaries={summaries} exportDate={new Date()} />
          ) : (
            <ArtisanPdf
              project={project}
              summaries={summaries}
              statusEvents={statusEvents}
              exportDate={new Date()}
            />
          );

        const blob = await pdf(doc).toBlob();
        const base = project.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60);
        const suggestedName = `chantier-${base || "projet"}-${type}.pdf`;
        const downloadUrl = URL.createObjectURL(blob);

        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = suggestedName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(downloadUrl);
      } catch (err) {
        setExportError("Export PDF impossible pour le moment.");
      } finally {
        setExporting(null);
      }
    },
    [exporting, project, statusEvents, summaries]
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Synthèse IA
            </p>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          {!hasMinimumEntries ? (
            <p className="text-sm text-text-muted">Synthese en attente (pas assez d'entrees)</p>
          ) : isPending || isGenerating ? (
            <p className="text-sm text-text-muted">Mise a jour en cours</p>
          ) : updatedDateText && updatedTimeText ? (
            <p className="text-sm text-text-muted">
              Derniere synthese generee le {updatedDateText} a {updatedTimeText}
            </p>
          ) : (
            <p className="text-sm text-text-muted">Pas encore de synthese</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasClientSummary ? (
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-text-main shadow-sm transition hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => handleExport("client")}
              disabled={!project || exporting !== null || loading || isGenerating}
            >
              {exporting === "client" ? "Export en cours..." : "Exporter PDF client"}
            </button>
          ) : null}
          {hasArtisanSummary ? (
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-text-main shadow-sm transition hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => handleExport("artisan")}
              disabled={!project || exporting !== null || loading || isGenerating}
            >
              {exporting === "artisan" ? "Export en cours..." : "Exporter PDF artisan"}
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            {isBusy ? "Mise a jour en cours..." : "Generer la synthese"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            activeTab === "artisan"
              ? "bg-brand/10 text-brand"
              : "border border-gray-200 text-text-main hover:border-brand/40"
          }`}
          onClick={() => setActiveTab("artisan")}
          disabled={loading}
        >
          Artisan
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            activeTab === "client"
              ? "bg-brand/10 text-brand"
              : "border border-gray-200 text-text-main hover:border-brand/40"
          }`}
          onClick={() => setActiveTab("client")}
          disabled={loading}
        >
          Client
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-warning/30 bg-warning/5 p-4 text-sm font-semibold text-warning">
          {error}
        </div>
      ) : null}

      {exportError ? (
        <div className="mt-3 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm font-semibold text-warning">
          {exportError}
        </div>
      ) : null}

      {activeTab === "artisan" ? (
        <div className="mt-3 space-y-4">
          <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Synthèse courte</p>
            {loading ? (
              <div className="mt-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-surface-light" />
                <div className="h-4 w-2/3 rounded bg-surface-light" />
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text-main">
                {artisanShort && artisanShort.trim().length ? artisanShort : "Rien à résumer pour l'instant."}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Détails chronologiques
              </p>
              <p className="text-xs text-text-muted">Date + heure • Label • Description</p>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-2 rounded-md border border-gray-200 bg-surface-light p-4">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-full rounded bg-gray-200" />
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                </div>
              ) : artisanDetails.length ? (
                <ul className="space-y-3">
                  {artisanDetails.map((item) => (
                    <li
                      key={item.id}
                      className={`flex gap-3 rounded-md border p-3 sm:p-4 ${
                        item.isStatusChange ? "border-brand/50 bg-brand/5" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        <div>{item.dateText ?? "Date à préciser"}</div>
                        {item.timeText ? <div className="text-[11px] text-text-muted">{item.timeText}</div> : null}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.label ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                                item.isStatusChange
                                  ? "bg-brand/10 text-brand"
                                  : "border border-gray-200 bg-surface-light text-text-muted"
                              }`}
                            >
                              {item.label}
                            </span>
                          ) : null}
                          {item.isStatusChange && !item.label ? (
                            <span className="text-xs font-semibold text-brand">Statut</span>
                          ) : null}
                        </div>
                        <p className="text-sm leading-6 text-text-main whitespace-pre-line">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-md border border-dashed border-gray-300 bg-white p-4 text-sm text-text-muted">
                  Aucun détail chronologique pour l'instant.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Message client</p>
            {loading ? (
              <div className="mt-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-surface-light" />
                <div className="h-4 w-2/3 rounded bg-surface-light" />
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text-main">
                {clientShort && clientShort.trim().length ? clientShort : "Rien à résumer pour l'instant."}
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-text-main transition hover:bg-surface-light disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setShowClientDetail((prev) => !prev)}
              disabled={loading}
            >
              Voir le détail du suivi du chantier
              {showClientDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showClientDetail ? (
              <div className="border-t border-gray-200 bg-surface-light px-4 py-3">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-3 w-28 rounded bg-gray-200" />
                    <div className="h-4 w-full rounded bg-gray-200" />
                    <div className="h-4 w-2/3 rounded bg-gray-200" />
                  </div>
                ) : clientDetails.length ? (
                  <ul className="space-y-3">
                    {clientDetails.map((item) => (
                      <li key={item.id} className="flex gap-3 rounded-md border border-gray-200 bg-white p-3 sm:p-4">
                        <div className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-text-muted">
                          <div>{item.dateText ?? "Date"}</div>
                          {item.timeText ? (
                            <div className="text-[11px] text-text-muted">{item.timeText}</div>
                          ) : null}
                        </div>
                        <p className="flex-1 whitespace-pre-line text-sm leading-6 text-text-main">
                          {item.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-muted">Pas de détail supplémentaire pour le moment.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
