export async function listProjects() {
  return fetch("/api/projects", { cache: "no-store" });
}

export async function createProject(payload: { name: string; description?: string | null }) {
  return fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
