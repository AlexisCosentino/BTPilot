import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function getCompanyIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id] Company lookup failed", { userId, error });
    return null;
  }

  return data?.company_id ?? null;
}

type CompanyLookupResult =
  | { companyId: string | null; errorType?: undefined }
  | { companyId: null; errorType: "network" };

function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const message = typeof error === "object" && "message" in error ? String((error as any).message) : "";
  return message.includes("fetch failed") || message.includes("ECONNRESET");
}

async function fetchCompanyId(userId: string): Promise<CompanyLookupResult> {
  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id] Company lookup failed", { userId, error });
    if (isNetworkError(error)) {
      return { companyId: null, errorType: "network" };
    }
    return { companyId: null };
  }

  return { companyId: data?.company_id ?? null };
}

export async function getCompanyIdForUserWithRetry(userId: string): Promise<CompanyLookupResult> {
  const firstAttempt = await fetchCompanyId(userId);
  if (firstAttempt.errorType !== "network") {
    return firstAttempt;
  }

  // Simple retry after a short delay for transient network issues
  await new Promise((resolve) => setTimeout(resolve, 150));
  return fetchCompanyId(userId);
}

type MembershipResult =
  | { ok: true }
  | { ok: false; errorType?: "network" | "forbidden" };

export async function checkMembership(userId: string, companyId: string): Promise<MembershipResult> {
  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[api/projects/:id] Membership lookup failed", { userId, companyId, error });
    if (isNetworkError(error)) {
      return { ok: false, errorType: "network" };
    }
    return { ok: false };
  }

  if (!data) {
    return { ok: false, errorType: "forbidden" };
  }

  return { ok: true };
}
