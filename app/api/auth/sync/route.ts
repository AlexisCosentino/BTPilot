import { NextResponse } from "next/server";

import {
  buildCompanyLabel,
  getAuthContext,
  getPrimaryEmail,
  loadClerkUser
} from "./clerk.service";
import { createCompany, getOwnedCompany } from "./company.service";
import { getExistingMembership, upsertMembership } from "./membership.service";
import { createSupabaseUser, listSupabaseUsers } from "./supabaseAuth.service";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

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

  const { data: existingUserProfile, error: userProfileLookupError } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (userProfileLookupError) {
    console.warn("[auth/sync] Failed checking user profile", {
      userId,
      error: userProfileLookupError
    });
  } else if (!existingUserProfile) {
    const { error: createUserProfileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        user_id: userId,
        email: primaryEmail
      });

    if (createUserProfileError) {
      console.warn("[auth/sync] User profile creation failed", { userId, error: createUserProfileError });
    } else {
      console.log("[auth/sync] User profile created", { userId });
    }
  } else {
    console.log("[auth/sync] User profile exists", { userId });
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

  if (!existingMembership) {
    console.log("[auth/sync] Auto-created membership for owner", {
      userId,
      companyId,
      role: "owner"
    });
  }

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id, name, owner_user_id")
    .eq("id", companyId)
    .maybeSingle();

  const { data: company_members, error: companyMembersError } = await supabaseAdmin
    .from("company_members")
    .select(
      `
        id,
        company_id,
        user_id,
        role,
        supabase_user_id,
        created_at,
        user_profiles:user_profiles!left (
          email,
          first_name,
          last_name
        )
      `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (companyMembersError) {
    console.error("[auth/sync] Company members fetch failed", {
      userId,
      companyId,
      error: companyMembersError
    });
    return NextResponse.json(
      { success: false, error: "Failed fetching company members" },
      { status: 500 }
    );
  }

  const company_members_with_profile =
    company_members?.map((member) => {
      const profile = (member as {
        user_profiles?:
          | {
              email?: string | null;
              first_name?: string | null;
              last_name?: string | null;
            }
          | null;
      }).user_profiles;

      const firstName = profile?.first_name?.trim();
      const lastName = profile?.last_name?.trim();
      const hasName = Boolean(firstName || lastName);
      const email = profile?.email ?? null;
      const display_name = hasName ? [firstName, lastName].filter(Boolean).join(" ") : email ?? "";

      return {
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        created_at: member.created_at,
        supabase_user_id: member.supabase_user_id,
        email,
        display_name: display_name || email || "Utilisateur interne"
      };
    }) ?? [];

  console.log("[auth/sync] Sync complete", { userId, companyId, supabaseUserId });

  return NextResponse.json({
    success: true,
    company,
    company_members: company_members_with_profile
  });
}
