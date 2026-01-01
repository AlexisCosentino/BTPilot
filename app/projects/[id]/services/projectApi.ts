import type { ClientInfo, Entry, Project, ProjectStatus, StatusEvent } from "../types";

export type ProjectDetailResponse = {
  project?: Project;
  entries?: Entry[];
  status_events?: StatusEvent[];
  error?: string;
};

function withCompany(path: string, companyId?: string | null) {
  if (!companyId) return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("company_id", companyId);
  return url.pathname + url.search;
}

export function fetchProjectDetail(projectId: string, companyId?: string | null) {
  return fetch(withCompany(`/api/projects/${projectId}`, companyId), {
    cache: "no-store",
    credentials: "include"
  });
}

export function archiveProject(projectId: string, companyId?: string | null) {
  return fetch(withCompany(`/api/projects/${projectId}/archive`, companyId), {
    method: "PATCH",
    credentials: "include"
  });
}

export function restoreProject(projectId: string, companyId?: string | null) {
  return fetch(withCompany(`/api/projects/${projectId}/restore`, companyId), {
    method: "PATCH",
    credentials: "include"
  });
}

export function updateProjectClient(
  projectId: string,
  payload: Partial<ClientInfo>,
  companyId?: string | null
) {
  return fetch(withCompany(`/api/projects/${projectId}/client`, companyId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
}

export function updateProjectStatus(
  projectId: string,
  newStatus: ProjectStatus,
  companyId?: string | null
) {
  return fetch(withCompany(`/api/projects/${projectId}/status`, companyId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_status: newStatus }),
    credentials: "include"
  });
}

export function fetchProjectSummaries(projectId: string, companyId?: string | null) {
  return fetch(withCompany(`/api/projects/${projectId}/summaries`, companyId), {
    cache: "no-store",
    credentials: "include"
  });
}

export function generateProjectSummariesApi(projectId: string, companyId?: string | null) {
  return fetch(withCompany(`/api/projects/${projectId}/summaries/generate`, companyId), {
    method: "POST",
    credentials: "include"
  });
}
