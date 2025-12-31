import { useCallback, useEffect, useState } from "react";

import {
  fetchProjectDetail,
  updateProjectClient,
  updateProjectStatus,
  type ProjectDetailResponse
} from "../services/projectApi";
import type { ClientInfo, Entry, Project, ProjectStatus, StatusEvent } from "../types";

export function useProject(projectId: string | null, companyId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [initialEntries, setInitialEntries] = useState<Entry[]>([]);
  const [statusEvents, setStatusEvents] = useState<StatusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    setProject(null);
    setInitialEntries([]);
    setStatusEvents([]);
    setError(null);
    setClientError(null);
    setStatusError(null);

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
        const response = await fetchProjectDetail(projectId, companyId);
        const body = (await response.json().catch(() => ({}))) as ProjectDetailResponse;

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
        setStatusEvents(Array.isArray(body.status_events) ? body.status_events : []);
        setLoading(false);
      } catch (err) {
        console.error("[project-detail] Chargement chantier impossible", err);
        if (!active) return;
        setProject(null);
        setInitialEntries([]);
        setStatusEvents([]);
        setError("Impossible de charger ce chantier. Recommencez.");
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [projectId, companyId]);

  const saveClientInfo = useCallback(
    async (payload: Partial<ClientInfo>) => {
      if (!projectId) {
        setClientError("Identifiant du chantier manquant.");
        return false;
      }

      setSavingClient(true);
      setClientError(null);

      try {
        const response = await updateProjectClient(projectId, payload, companyId);
        const body = (await response.json().catch(() => ({}))) as { project?: Project; error?: string };

        if (!response.ok || !body.project) {
          const message =
            response.status === 401
              ? "Connectez-vous pour modifier ce chantier."
              : body.error || "Mise a jour du client impossible.";
          setClientError(message);
          return false;
        }

        setProject(body.project);
        return true;
      } catch (err) {
        console.error("[project-detail] Mise a jour client impossible", err);
        setClientError("Mise a jour du client impossible.");
        return false;
      } finally {
        setSavingClient(false);
      }
    },
    [projectId, companyId]
  );

  const changeStatus = useCallback(
    async (nextStatus: ProjectStatus) => {
      if (!projectId) {
        setStatusError("Identifiant du chantier manquant.");
        return false;
      }

      setSavingStatus(true);
      setStatusError(null);

      try {
        const response = await updateProjectStatus(projectId, nextStatus, companyId);
        const body = (await response.json().catch(() => ({}))) as { project?: Project; error?: string };

        if (!response.ok || !body.project) {
          const message =
            response.status === 401
              ? "Connectez-vous pour modifier ce chantier."
              : body.error || "Mise a jour du statut impossible.";
          setStatusError(message);
          return false;
        }

        setProject(body.project);
        return true;
      } catch (err) {
        console.error("[project-detail] Mise a jour du statut impossible", err);
        setStatusError("Mise a jour du statut impossible.");
        return false;
      } finally {
        setSavingStatus(false);
      }
    },
    [projectId, companyId]
  );

  return {
    project,
    initialEntries,
    loading,
    error,
    statusEvents,
    clientError,
    statusError,
    savingClient,
    savingStatus,
    saveClientInfo,
    changeStatus
  };
}
