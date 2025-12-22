import Link from "next/link";

import { formatDate, statusLabels } from "../helpers/format";
import type { Project } from "../types";

type ProjectHeaderProps = {
  project: Project | null;
};

export function ProjectHeader({ project }: ProjectHeaderProps) {
  return (
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
              Créé le {formatDate(project.created_at)}
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
  );
}
