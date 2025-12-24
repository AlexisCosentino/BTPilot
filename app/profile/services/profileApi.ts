export type UserProfile = {
  id?: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  phone: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function fetchProfile() {
  return fetch("/api/profile", { cache: "no-store" });
}

export async function updateProfile(payload: {
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  phone?: string | null;
}) {
  return fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
