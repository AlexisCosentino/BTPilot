import { NextResponse } from "next/server";

import { buildCompanyLabel, getAuthContext, getPrimaryEmail, loadClerkUser } from "./clerk.service";
import { createCompany, getOwnedCompany } from "./company.service";
import { getExistingMembership, upsertMembership } from "./membership.service";
import { createSupabaseUser, listSupabaseUsers } from "./supabaseAuth.service";

export async function POST() {
  const { userId, sessionId } = await getAuthContext();

  if (!userId) {
    console.warn("[auth/sync] Unauthorized request", { sessionId });
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  console.log("[auth/sync] Starting sync", { userId });

  const user = await loadClerkUser(userId);
  const primaryEmail = getPrimaryEmail(user);

  if (!primaryEmail) {
    console.error("[auth/sync] Missing primary email for Clerk user", { userId });
    return NextResponse.json(
      { success: false, error: "Primary email required for sync" },
      { status: 400 }
    );
  }

  const { data: supabaseUsersPage, error: supabaseLookupError } = await listSupabaseUsers(1, 200);

  if (supabaseLookupError) {
    console.error("[auth/sync] Supabase user lookup failed", {
      userId,
      error: supabaseLookupError
    });
    return NextResponse.json(
      { success: false, error: "Failed finding Supabase user" },
      { status: 500 }
    );
  }

  let supabaseUser =
    supabaseUsersPage?.users.find(
      (candidate) => candidate.email?.toLowerCase() === primaryEmail.toLowerCase()
    ) ?? null;

  if (!supabaseUser) {
    const { data: createdSupabaseUser, error: createSupabaseUserError } = await createSupabaseUser(
      primaryEmail,
      userId
    );

    if (createSupabaseUserError || !createdSupabaseUser?.user) {
      console.error("[auth/sync] Supabase user creation failed", {
        userId,
        error: createSupabaseUserError
      });
      return NextResponse.json(
        { success: false, error: "Failed creating Supabase user" },
        { status: 500 }
      );
    }

    supabaseUser = createdSupabaseUser.user;
    console.log("[auth/sync] Created Supabase auth user", { userId, supabaseUserId: supabaseUser.id });
  }

  if (!supabaseUser) {
    return NextResponse.json(
      { success: false, error: "Failed creating Supabase user" },
      { status: 500 }
    );
  }

  const supabaseUserId = supabaseUser.id;
  const companyLabel = buildCompanyLabel(user);

  const { data: existingMembership, error: membershipError } = await getExistingMembership(userId);

  if (membershipError) {
    console.error("[auth/sync] Membership check failed", { userId, error: membershipError });
    return NextResponse.json(
      { success: false, error: "Failed checking membership" },
      { status: 500 }
    );
  }

  let companyId = existingMembership?.company_id;

  if (!companyId) {
    const { data: ownedCompany, error: ownedCompanyError } = await getOwnedCompany(userId);

    if (ownedCompanyError) {
      console.error("[auth/sync] Owned company lookup failed", { userId, error: ownedCompanyError });
      return NextResponse.json(
        { success: false, error: "Failed checking existing company" },
        { status: 500 }
      );
    }

    companyId = ownedCompany?.id;

    if (!companyId) {
      const { data: newCompany, error: createCompanyError } = await createCompany(
        `${companyLabel}'s Company`,
        userId
      );

      if (createCompanyError || !newCompany) {
        console.error("[auth/sync] Company creation failed", { userId, error: createCompanyError });
        return NextResponse.json(
          { success: false, error: "Failed creating company" },
          { status: 500 }
        );
      }

      companyId = newCompany.id;
      console.log("[auth/sync] Created company", { userId, companyId });
    } else {
      console.log("[auth/sync] Reusing owned company", { userId, companyId });
    }
  }

  const { error: membershipUpsertError } = await upsertMembership({
    companyId,
    userId,
    supabaseUserId,
    role: existingMembership?.role ?? "owner"
  });

  if (membershipUpsertError) {
    console.error("[auth/sync] Membership upsert failed", { userId, error: membershipUpsertError });
    return NextResponse.json(
      { success: false, error: "Failed creating membership" },
      { status: 500 }
    );
  }

  console.log("[auth/sync] Sync complete", { userId, companyId, supabaseUserId });

  return NextResponse.json({ success: true });
}
