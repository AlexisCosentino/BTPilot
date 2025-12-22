import "server-only";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

type ProjectCardProps = {
  id: string;
  name: string;
  status: string;
  createdAt: string | Date;
};

const statusTone: Record<string, { label: string; tone: string }> = {
  draft: { label: "Brouillon", tone: "bg-gray-100 text-text-main" },
  planned: { label: "Planifié", tone: "bg-info/10 text-info" },
  in_progress: { label: "Chantier en cours", tone: "bg-accent/15 text-accent" },
  on_hold: { label: "En pause", tone: "bg-warning/10 text-warning" },
  completed: { label: "Terminé", tone: "bg-success/15 text-success" },
  canceled: { label: "Annulé", tone: "bg-warning/10 text-warning" }
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export function ProjectCard({ id, name, status, createdAt }: ProjectCardProps) {
  const tone = statusTone[status] ?? { label: status, tone: "bg-gray-100 text-text-main" };

  return (
    <Link
      href={`/projects/${id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-light text-brand">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="text-base font-semibold text-text-main">{name}</h3>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${tone.tone}`}>
            {tone.label}
          </span>
        </div>
        <p className="text-xs text-text-muted">
          Créé le {dateFormatter.format(new Date(createdAt))}
        </p>
      </div>
    </Link>
  );
}
