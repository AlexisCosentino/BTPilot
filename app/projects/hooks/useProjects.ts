import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { listProjects } from "../services/projectsApi";
import type { ProjectSummary } from "../types";

export function useProjects() {
  const { isLoaded, isSignedIn } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isLoaded) return;

    if (!isSignedIn) {
      if (active) {
        setProjects([]);
        setError("Merci de vous connecter pour voir vos chantiers.");
        setLoading(false);
      }
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await listProjects();

        if (!active) return;

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          const message =
            response.status === 401
              ? "Connectez-vous pour voir vos chantiers."
              : body.error || "Impossible de charger les chantiers.";

          setProjects([]);
          setError(message);
          setLoading(false);
          return;
        }

        const body = (await response.json().catch(() => ({}))) as {
          projects?: ProjectSummary[];
        };

        setProjects(Array.isArray(body.projects) ? body.projects : []);
        setLoading(false);
      } catch (err) {
        console.error("[dashboard] Impossible de charger les chantiers", err);
        if (!active) return;
        setProjects([]);
        setError("Chargement des chantiers impossible.");
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn]);

  return { projects, loading, error };
}
