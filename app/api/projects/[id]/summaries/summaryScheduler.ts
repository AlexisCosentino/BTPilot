import "server-only";

import {
  extractSummaryMetadata,
  generateProjectSummaries,
  mergeSummaryMetadata,
  type SummaryMetadata,
  type SummaryState
} from "../../../../../lib/ai/summaries";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getProjectEntries } from "../project.service";

const SUMMARY_DEBOUNCE_MS = 45_000;
const MIN_ELIGIBLE_ENTRIES = 2;
const ELIGIBLE_ENTRY_TYPES = new Set(["text", "audio"]);

const scheduledTimers = new Map<string, NodeJS.Timeout>();
const inFlightGenerations = new Set<string>();

type GenerationMode = "manual" | "scheduled";

type GenerationOutcome =
  | { status: "generated"; metadata: SummaryMetadata }
  | { status: "blocked"; reason: "not_enough_entries"; metadata: SummaryMetadata }
  | {
      status: "skipped";
      reason:
        | "already_generating"
        | "fetch_failed"
        | "metadata_missing"
        | "not_scheduled"
        | "not_due"
        | "update_failed"
        | "generation_failed";
    };

function buildKey(companyId: string, projectId: string) {
  return `${companyId}:${projectId}`;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function scheduleTimer(companyId: string, projectId: string, scheduledFor: Date) {
  const key = buildKey(companyId, projectId);
  if (scheduledTimers.has(key)) return;
  const delay = Math.max(0, scheduledFor.getTime() - Date.now());
  const timeout = setTimeout(() => {
    scheduledTimers.delete(key);
    void generateProjectSummariesForProject({ projectId, companyId, mode: "scheduled" }).catch(
      (error) => {
        console.error("[summaries] Background generation failed", { projectId, companyId, error });
      }
    );
  }, delay);
  scheduledTimers.set(key, timeout);
  console.log("[summaries] Scheduled generation", {
    projectId,
    companyId,
    scheduledFor: scheduledFor.toISOString(),
    delayMs: delay
  });
}

function clearTimer(companyId: string, projectId: string) {
  const key = buildKey(companyId, projectId);
  const timer = scheduledTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    scheduledTimers.delete(key);
  }
}

function resolveSummaryState(value: SummaryMetadata["ai_summary_state"]): SummaryState {
  return value ?? "idle";
}

export async function scheduleSummaryGeneration({
  projectId,
  companyId,
  entryType
}: {
  projectId: string;
  companyId: string;
  entryType: string;
}) {
  if (!ELIGIBLE_ENTRY_TYPES.has(entryType)) return;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[summaries] Failed to fetch metadata for scheduling", {
      projectId,
      companyId,
      error
    });
    return;
  }

  const now = new Date();
  const currentMetadata = (data?.metadata as Record<string, unknown>) ?? null;
  const summaryMetadata = extractSummaryMetadata(currentMetadata);
  const currentState = resolveSummaryState(summaryMetadata.ai_summary_state);
  const existingSchedule = parseIsoDate(summaryMetadata.ai_summary_scheduled_for);
  const scheduledFor =
    existingSchedule && existingSchedule.getTime() > now.getTime()
      ? existingSchedule
      : new Date(now.getTime() + SUMMARY_DEBOUNCE_MS);
  const nextState: SummaryState = currentState === "generating" ? "generating" : "scheduled";

  const nextMetadata: SummaryMetadata = {
    ...(currentMetadata ?? {}),
    ai_summary_state: nextState,
    ai_summary_dirty_at: now.toISOString(),
    ai_summary_last_entry_at: now.toISOString(),
    ai_summary_scheduled_for: scheduledFor.toISOString()
  };

  const { error: updateError } = await supabaseAdmin
    .from("projects")
    .update({ metadata: nextMetadata })
    .eq("id", projectId)
    .eq("company_id", companyId);

  if (updateError) {
    console.error("[summaries] Failed to update metadata for scheduling", {
      projectId,
      companyId,
      updateError
    });
    return;
  }

  console.log("[summaries] Dirty -> scheduled", {
    projectId,
    companyId,
    entryType,
    state: nextState
  });

  if (nextState === "generating") {
    return;
  }

  scheduleTimer(companyId, projectId, scheduledFor);
}

export async function generateProjectSummariesForProject({
  projectId,
  companyId,
  mode
}: {
  projectId: string;
  companyId: string;
  mode: GenerationMode;
}): Promise<GenerationOutcome> {
  const key = buildKey(companyId, projectId);
  if (inFlightGenerations.has(key)) {
    console.warn("[summaries] Generation already in progress", { projectId, companyId, mode });
    return { status: "skipped", reason: "already_generating" };
  }

  inFlightGenerations.add(key);
  if (mode === "manual") {
    clearTimer(companyId, projectId);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("metadata")
      .eq("id", projectId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      console.error("[summaries] Failed to fetch metadata", { projectId, companyId, error });
      return { status: "skipped", reason: "fetch_failed" };
    }

    if (!data) {
      return { status: "skipped", reason: "metadata_missing" };
    }

    const baseMetadata = (data.metadata as Record<string, unknown>) ?? null;
    const summaryMetadata = extractSummaryMetadata(baseMetadata);
    const currentState = resolveSummaryState(summaryMetadata.ai_summary_state);

    if (currentState === "generating") {
      console.warn("[summaries] Generation already marked in progress", {
        projectId,
        companyId,
        mode
      });
      return { status: "skipped", reason: "already_generating" };
    }

    if (mode === "scheduled") {
      if (currentState !== "scheduled" && currentState !== "dirty") {
        console.log("[summaries] Skipped generation (not scheduled)", {
          projectId,
          companyId,
          state: currentState
        });
        return { status: "skipped", reason: "not_scheduled" };
      }

      const scheduledFor = parseIsoDate(summaryMetadata.ai_summary_scheduled_for);
      if (scheduledFor && scheduledFor.getTime() > Date.now() + 1000) {
        scheduleTimer(companyId, projectId, scheduledFor);
        return { status: "skipped", reason: "not_due" };
      }
    }

    const generationStartedAt = new Date().toISOString();
    const inProgressMetadata: SummaryMetadata = {
      ...(baseMetadata ?? {}),
      ai_summary_state: "generating",
      ai_summary_generation_started_at: generationStartedAt
    };

    const { error: lockError } = await supabaseAdmin
      .from("projects")
      .update({ metadata: inProgressMetadata })
      .eq("id", projectId)
      .eq("company_id", companyId);

    if (lockError) {
      console.error("[summaries] Failed to mark generation in progress", {
        projectId,
        companyId,
        lockError
      });
      return { status: "skipped", reason: "update_failed" };
    }

    const entries = (await getProjectEntries(projectId, companyId)) ?? [];
    const eligibleCount = entries.filter(
      (entry) => entry.is_active !== false && ELIGIBLE_ENTRY_TYPES.has(entry.entry_type)
    ).length;

    if (eligibleCount < MIN_ELIGIBLE_ENTRIES) {
      const blockedMetadata: SummaryMetadata = {
        ...(inProgressMetadata ?? {}),
        ai_summary_state: "blocked",
        ai_summary_scheduled_for: null,
        ai_summary_generation_started_at: null
      };
      await supabaseAdmin
        .from("projects")
        .update({ metadata: blockedMetadata })
        .eq("id", projectId)
        .eq("company_id", companyId);

      console.log("[summaries] Skipped generation (not enough entries)", {
        projectId,
        companyId,
        eligibleCount
      });

      return {
        status: "blocked",
        reason: "not_enough_entries",
        metadata: extractSummaryMetadata(blockedMetadata)
      };
    }

    let summaries;
    try {
      // NOTE: Full history is used because the existing AI generator only accepts the full timeline.
      summaries = await generateProjectSummaries(entries);
    } catch (generationError) {
      console.error("[summaries] Generation failed", { projectId, companyId, generationError });
      const failedMetadata: SummaryMetadata = {
        ...(inProgressMetadata ?? {}),
        ai_summary_state: "dirty",
        ai_summary_generation_started_at: null,
        ai_summary_scheduled_for: null
      };
      await supabaseAdmin
        .from("projects")
        .update({ metadata: failedMetadata })
        .eq("id", projectId)
        .eq("company_id", companyId);
      return { status: "skipped", reason: "generation_failed" };
    }

    const { data: latest, error: latestError } = await supabaseAdmin
      .from("projects")
      .select("metadata")
      .eq("id", projectId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (latestError) {
      console.error("[summaries] Failed to refresh metadata after generation", {
        projectId,
        companyId,
        latestError
      });
    }

    const latestMetadata = (latest?.metadata as Record<string, unknown>) ?? inProgressMetadata;
    const latestSummaryMetadata = extractSummaryMetadata(latestMetadata);
    const lastEntryAt = parseIsoDate(latestSummaryMetadata.ai_summary_last_entry_at);
    const generationStart = parseIsoDate(generationStartedAt) ?? new Date();
    const hasNewEntries =
      lastEntryAt !== null && lastEntryAt.getTime() > generationStart.getTime();

    let mergedMetadata = mergeSummaryMetadata(latestMetadata, summaries);
    mergedMetadata = {
      ...mergedMetadata,
      ai_summary_generation_started_at: null
    };

    if (hasNewEntries && lastEntryAt) {
      const nextSchedule = new Date(
        Math.max(lastEntryAt.getTime() + SUMMARY_DEBOUNCE_MS, Date.now())
      );
      mergedMetadata = {
        ...mergedMetadata,
        ai_summary_state: "scheduled",
        ai_summary_dirty_at: latestSummaryMetadata.ai_summary_dirty_at ?? lastEntryAt.toISOString(),
        ai_summary_scheduled_for: nextSchedule.toISOString()
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from("projects")
      .update({ metadata: mergedMetadata })
      .eq("id", projectId)
      .eq("company_id", companyId);

    if (updateError) {
      console.error("[summaries] Failed to persist summaries", {
        projectId,
        companyId,
        updateError
      });
      return { status: "skipped", reason: "update_failed" };
    }

    if (hasNewEntries && mergedMetadata.ai_summary_scheduled_for) {
      scheduleTimer(companyId, projectId, new Date(mergedMetadata.ai_summary_scheduled_for));
      console.log("[summaries] Generated summaries, rescheduled due to new entries", {
        projectId,
        companyId
      });
    } else {
      console.log("[summaries] Generated summaries", { projectId, companyId });
    }

    return { status: "generated", metadata: extractSummaryMetadata(mergedMetadata) };
  } finally {
    inFlightGenerations.delete(key);
  }
}
