import { useEffect, useState } from "react";

import type { Entry, Project } from "../types";

type ProjectResponse = {
  project?: Project;
  entries?: Entry[];
  error?: string;
};

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [initialEntries, setInitialEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProject(null);
    setInitialEntries([]);
    setError(null);

    if (!projectId) {
      setLoading(false);
      setError("Identifiant du chantier manquant.");
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as ProjectResponse;

        if (!active) return;

        if (!response.ok || !body.project) {
          const message =
            response.status === 401
              ? "Connectez-vous pour ouvrir ce chantier."
              : body.error || "Chantier introuvable.";
          setProject(null);
          setInitialEntries([]);
          setError(message);
          setLoading(false);
          return;
        }

        setProject(body.project);
        setInitialEntries(Array.isArray(body.entries) ? body.entries : []);
        setLoading(false);
      } catch (err) {
        console.error("[project-detail] Chargement chantier impossible", err);
        if (!active) return;
        setProject(null);
        setInitialEntries([]);
        setError("Impossible de charger ce chantier. Recommencez.");
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [projectId]);

  return { project, initialEntries, loading, error };
}
