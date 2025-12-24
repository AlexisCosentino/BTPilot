export async function fetchAuthSync() {
  return fetch("/api/auth/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store"
  });
}

export async function listInvites() {
  return fetch("/api/company/invites", { cache: "no-store" });
}

export async function createInvite(payload: { email: string; role?: string }) {
  return fetch("/api/company/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function revokeInvite(inviteId: string) {
  return fetch("/api/company/invites/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteId })
  });
}
