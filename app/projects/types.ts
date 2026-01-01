export type ProjectStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "canceled"
  | "archived";

export type ProjectSummary = {
  id: string;
  name: string;
  status: ProjectStatus;
  created_at: string;
};
