export async function fetchAuthSync(companyId?: string | null) {
  return fetch(withCompanyQuery("/api/auth/sync", companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "include"
  });
}

function withCompanyQuery(path: string, companyId?: string | null) {
  if (!companyId) return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("company_id", companyId);
  return url.pathname + url.search;
}

export async function listInvites(companyId?: string | null) {
  return fetch(withCompanyQuery("/api/company/invites", companyId), {
    cache: "no-store",
    credentials: "include"
  });
}

export async function createInvite(payload: { email: string; role?: string }, companyId?: string | null) {
  return fetch(withCompanyQuery("/api/company/invites", companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
}

export async function revokeInvite(inviteId: string, companyId?: string | null) {
  return fetch(withCompanyQuery("/api/company/invites/revoke", companyId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteId }),
    credentials: "include"
  });
}
