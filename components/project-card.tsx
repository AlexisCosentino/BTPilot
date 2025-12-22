import "server-only";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { formatProjectDate } from "../app/projects/helpers/date";
import { getProjectStatusTone } from "../app/projects/helpers/status";
import type { ProjectSummary } from "../app/projects/types";

type ProjectCardProps = ProjectSummary & { createdAt?: string | Date };

export function ProjectCard({ id, name, status, created_at, createdAt }: ProjectCardProps) {
  const tone = getProjectStatusTone(status);
  const createdValue = createdAt ?? created_at;

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
          CrǸǸ le {formatProjectDate(createdValue)}
        </p>
      </div>
    </Link>
  );
}
