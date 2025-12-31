export type UserCompany = {
  id: string;
  name: string;
  owner_user_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  role: "owner" | "admin" | "member";
};

export async function createCompany(payload: { name: string }) {
  return fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
