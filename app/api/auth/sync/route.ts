import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST() {
  const { userId, sessionId } = await auth();

  if (!userId) {
    console.warn("[auth/sync] Unauthorized request", { sessionId });
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  console.log("[auth/sync] Starting sync", { userId });

  const user = await currentUser().catch((error) => {
    console.error("[auth/sync] Failed to load Clerk user", { userId, error });
    return null;
  });

  const primaryEmail = user?.primaryEmailAddress?.emailAddress;

  if (!primaryEmail) {
    console.error("[auth/sync] Missing primary email for Clerk user", { userId });
    return NextResponse.json(
      { success: false, error: "Primary email required for sync" },
      { status: 400 }
    );
  }

  const { data: supabaseUsersPage, error: supabaseLookupError } =
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });

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
    const { data: createdSupabaseUser, error: createSupabaseUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: primaryEmail,
        email_confirm: true,
        user_metadata: { clerk_user_id: userId }
      });

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

  const supabaseUserId = supabaseUser.id;
  const companyLabel =
    user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "New Company";

  const { data: existingMembership, error: membershipError } = await supabaseAdmin
    .from("company_members")
    .select("company_id, role, supabase_user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .maybeSingle();

  if (membershipError) {
    console.error("[auth/sync] Membership check failed", { userId, error: membershipError });
    return NextResponse.json(
      { success: false, error: "Failed checking membership" },
      { status: 500 }
    );
  }

  let companyId = existingMembership?.company_id;

  if (!companyId) {
    const { data: ownedCompany, error: ownedCompanyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true })
      .maybeSingle();

    if (ownedCompanyError) {
      console.error("[auth/sync] Owned company lookup failed", { userId, error: ownedCompanyError });
      return NextResponse.json(
        { success: false, error: "Failed checking existing company" },
        { status: 500 }
      );
    }

    companyId = ownedCompany?.id;

    if (!companyId) {
      const { data: newCompany, error: createCompanyError } = await supabaseAdmin
        .from("companies")
        .insert({
          name: `${companyLabel}'s Company`,
          owner_user_id: userId
        })
        .select("id")
        .single();

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

  const { error: membershipUpsertError } = await supabaseAdmin
    .from("company_members")
    .upsert(
      {
        company_id: companyId,
        user_id: userId,
        supabase_user_id: supabaseUserId,
        role: existingMembership?.role ?? "owner"
      },
      { onConflict: "company_id,user_id" }
    );

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
