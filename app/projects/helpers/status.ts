import type { ProjectStatus } from "../types";

export const projectStatuses: ProjectStatus[] = [
  "draft",
  "planned",
  "in_progress",
  "on_hold",
  "completed",
  "canceled"
];

export const projectStatusTone: Record<ProjectStatus, { label: string; tone: string }> = {
  draft: { label: "Brouillon", tone: "bg-gray-100 text-text-main" },
  planned: { label: "Planifie", tone: "bg-info/10 text-info" },
  in_progress: { label: "Chantier en cours", tone: "bg-accent/15 text-accent" },
  on_hold: { label: "En pause", tone: "bg-warning/10 text-warning" },
  completed: { label: "Termine", tone: "bg-success/15 text-success" },
  canceled: { label: "Annule", tone: "bg-warning/10 text-warning" },
  archived: { label: "Archive", tone: "bg-gray-100 text-text-muted" }
};

export function getProjectStatusTone(status: ProjectStatus | string) {
  if (status in projectStatusTone) {
    return projectStatusTone[status as ProjectStatus];
  }

  return { label: status, tone: "bg-gray-100 text-text-main" };
}
