import { useCallback, useEffect, useState } from "react";

import {
  fetchProjectSummaries,
  generateProjectSummariesApi
} from "../services/projectApi";
import type { ProjectSummaries } from "../types";

type SummaryState = ProjectSummaries & { loading: boolean; error: string | null };

const emptySummaries: ProjectSummaries = {
  ai_summary_artisan: null,
  ai_summary_artisan_short: null,
  ai_summary_artisan_detail: null,
  ai_summary_client: null,
  ai_summary_client_short: null,
  ai_summary_client_detail: null,
  ai_summary_updated_at: null
};

export function useSummaries(projectId: string | null) {
  const [state, setState] = useState<SummaryState>({
    ...emptySummaries,
    loading: false,
    error: null
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const loadSummaries = useCallback(async () => {
    if (!projectId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchProjectSummaries(projectId);
      const body = (await response.json().catch(() => ({}))) as ProjectSummaries & { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Synthèse indisponible.");
      }

      setState({ ...emptySummaries, ...body, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Synthèse indisponible."
      }));
    }
  }, [projectId]);

  const generateSummaries = useCallback(async () => {
    if (!projectId) return false;
    setIsGenerating(true);
    setState((prev) => ({ ...prev, error: null }));

    try {
      const response = await generateProjectSummariesApi(projectId);
      const body = (await response.json().catch(() => ({}))) as ProjectSummaries & { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Génération impossible.");
      }

      setState({ ...emptySummaries, ...body, loading: false, error: null });
      return true;
    } catch (err) {
      setState((prev) => ({ ...prev, error: "Génération impossible." }));
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [projectId]);

  useEffect(() => {
    setState({ ...emptySummaries, loading: false, error: null });
    setIsGenerating(false);
    if (projectId) {
      void loadSummaries();
    }
  }, [projectId, loadSummaries]);

  return {
    summaries: state,
    isGenerating,
    generateSummaries,
    reloadSummaries: loadSummaries
  };
}
