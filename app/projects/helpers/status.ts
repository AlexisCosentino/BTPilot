export const projectStatusTone: Record<string, { label: string; tone: string }> = {
  draft: { label: "Brouillon", tone: "bg-gray-100 text-text-main" },
  planned: { label: "PlanifiǸ", tone: "bg-info/10 text-info" },
  in_progress: { label: "Chantier en cours", tone: "bg-accent/15 text-accent" },
  on_hold: { label: "En pause", tone: "bg-warning/10 text-warning" },
  completed: { label: "TerminǸ", tone: "bg-success/15 text-success" },
  canceled: { label: "AnnulǸ", tone: "bg-warning/10 text-warning" }
};

export function getProjectStatusTone(status: string) {
  return projectStatusTone[status] ?? { label: status, tone: "bg-gray-100 text-text-main" };
}
