import { useMemo, useState } from "react";

import type { ProjectSummaries } from "../types";

type SummariesCardProps = {
  summaries: ProjectSummaries;
  loading: boolean;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  onReload?: () => void;
};

export function SummariesCard({
  summaries,
  loading,
  isGenerating,
  error,
  onGenerate
}: SummariesCardProps) {
  const [activeTab, setActiveTab] = useState<"artisan" | "client">("client");
  const [showClientDetail, setShowClientDetail] = useState(false);

  const content = useMemo(() => {
    if (activeTab === "artisan") {
      const shortText =
        summaries.ai_summary_artisan_short ?? summaries.ai_summary_artisan ?? "Rien à résumer.";
      const detailText =
        summaries.ai_summary_artisan_detail ?? summaries.ai_summary_artisan ?? shortText;
      return `${shortText}\n\n---\n${detailText}`;
    }
    return showClientDetail
      ? summaries.ai_summary_client_detail ?? summaries.ai_summary_client_short ?? summaries.ai_summary_client
      : summaries.ai_summary_client_short ?? summaries.ai_summary_client;
  }, [
    activeTab,
    showClientDetail,
    summaries.ai_summary_artisan,
    summaries.ai_summary_artisan_short,
    summaries.ai_summary_artisan_detail,
    summaries.ai_summary_client,
    summaries.ai_summary_client_short,
    summaries.ai_summary_client_detail
  ]);

  const updatedAt =
    summaries.ai_summary_updated_at && new Date(summaries.ai_summary_updated_at).toLocaleString();

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Synthèse IA</p>
          {updatedAt ? (
            <p className="text-sm text-text-muted">Mise à jour le {updatedAt}</p>
          ) : (
            <p className="text-sm text-text-muted">Pas encore de synthèse</p>
          )}
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? "Génération..." : "Générer la synthèse"}
        </button>
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
        {activeTab === "client" ? (
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-text-main shadow-sm transition hover:border-brand/40"
            onClick={() => setShowClientDetail((prev) => !prev)}
            disabled={loading}
          >
            {showClientDetail ? "Voir le résumé court" : "Voir le détail du suivi du chantier"}
          </button>
        ) : null}
      </div>

      <div className="mt-3 rounded-md border border-gray-200 bg-surface-light p-4">
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-1/2 rounded bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-2/3 rounded bg-gray-200" />
          </div>
        ) : error ? (
          <p className="text-sm font-semibold text-warning">{error}</p>
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-text-main">
            {content && content.trim().length ? content : "Rien à résumer."}
          </pre>
        )}
      </div>
    </section>
  );
}
