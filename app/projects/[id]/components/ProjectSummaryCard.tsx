import { getProjectStatusTone } from "../../helpers/status";
import type { Project } from "../types";

type ProjectSummaryCardProps = {
  project: Project | null;
  onEdit?: () => void;
};

function formatClientName(project: Project | null) {
  if (!project) return "";
  const first = project.client_first_name?.trim() || "";
  const last = project.client_last_name?.trim() || "";
  return [first, last].filter(Boolean).join(" ").trim();
}

export function ProjectSummaryCard({ project, onEdit }: ProjectSummaryCardProps) {
  const clientName = formatClientName(project);
  const tone = project ? getProjectStatusTone(project.status) : null;

  return (
    <section className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Chantier</p>
          <h1 className="text-2xl font-bold leading-tight text-text-main sm:text-3xl">
            {project?.name ?? "Chantier"}
          </h1>
        </div>
        {tone ? (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${tone.tone}`}
          >
            {tone.label}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-text-muted sm:grid-cols-3">
        <div className="rounded-md bg-surface-light px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Client</p>
          <p className="mt-1 text-text-main">
            {clientName || "Non renseigne"}
          </p>
        </div>
        <div className="rounded-md bg-surface-light px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Ville</p>
          <p className="mt-1 text-text-main">
            {project?.client_city?.trim() || "Non renseignee"}
          </p>
        </div>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-text-main shadow-sm transition hover:border-brand/50 hover:text-brand"
          >
            Modifier
          </button>
        </div>
      </div>
    </section>
  );
}
