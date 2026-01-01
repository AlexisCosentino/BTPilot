export type ProjectListStatus = "archived" | "active";

export async function listProjects(companyId?: string, status?: ProjectListStatus) {
  const url = new URL("/api/projects", window.location.origin);

  if (companyId) {
    url.searchParams.set("company_id", companyId);
  }

  if (status === "archived") {
    url.searchParams.set("status", "archived");
  }

  return fetch(url.pathname + url.search, { cache: "no-store", credentials: "include" });
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
    body: JSON.stringify(body),
    credentials: "include"
  });
}
