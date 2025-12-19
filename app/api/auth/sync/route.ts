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

  const companyLabel =
    user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "New Company";

  const { data: existingMembership, error: membershipError } = await supabaseAdmin
    .from("company_members")
    .select("company_id")
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

  if (existingMembership?.company_id) {
    console.log("[auth/sync] Existing membership found", {
      userId,
      companyId: existingMembership.company_id
    });
    return NextResponse.json({ success: true });
  }

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

  let companyId = ownedCompany?.id;

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

  const { error: membershipUpsertError } = await supabaseAdmin
    .from("company_members")
    .upsert(
      {
        company_id: companyId,
        user_id: userId,
        role: "owner"
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

  console.log("[auth/sync] Sync complete", { userId, companyId });

  return NextResponse.json({ success: true });
}
