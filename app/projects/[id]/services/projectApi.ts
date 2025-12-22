import type { ClientInfo, Entry, Project, ProjectStatus, StatusEvent } from "../types";

export type ProjectDetailResponse = {
  project?: Project;
  entries?: Entry[];
  status_events?: StatusEvent[];
  error?: string;
};

export function fetchProjectDetail(projectId: string) {
  return fetch(`/api/projects/${projectId}`, { cache: "no-store" });
}

export function deleteProject(projectId: string) {
  return fetch(`/api/projects/${projectId}`, { method: "DELETE" });
}

export function updateProjectClient(projectId: string, payload: Partial<ClientInfo>) {
  return fetch(`/api/projects/${projectId}/client`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function updateProjectStatus(projectId: string, newStatus: ProjectStatus) {
  return fetch(`/api/projects/${projectId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_status: newStatus })
  });
}
