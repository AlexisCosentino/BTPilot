export async function listProjects(companyId?: string) {
  const search = companyId ? `?company_id=${companyId}` : "";
  return fetch(`/api/projects${search}`, { cache: "no-store" });
}

export type CreateProjectPayload = {
  name: string;
  description?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_postal_code?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
};

export async function createProject(payload: CreateProjectPayload, companyId?: string) {
  const body = { ...payload, company_id: companyId };

  return fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
