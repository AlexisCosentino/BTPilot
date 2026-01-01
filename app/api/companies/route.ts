import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getUserCompanies } from "../../../lib/getUserCompanies";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companies = await getUserCompanies(userId);
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[companies] Failed to list companies", { userId, error });
    return NextResponse.json({ error: "Failed to load companies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body as { name?: string })?.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }

  try {
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({ name, owner_user_id: userId })
      .select("id, name, owner_user_id, metadata, created_at, updated_at")
      .single();

    if (companyError || !company) {
      throw companyError || new Error("Insertion failed");
    }

    // If a unique constraint on user_id exists, update the existing membership to point to the new company.
    const { data: existingMembership, error: membershipLookupError } = await supabaseAdmin
      .from("company_members")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipLookupError) {
      console.warn("[companies] Membership lookup failed", { userId, error: membershipLookupError });
    }

    const { error: membershipError } = existingMembership
      ? await supabaseAdmin
          .from("company_members")
          .update({ company_id: company.id, role: "owner" })
          .eq("id", existingMembership.id)
          .select("id")
          .single()
      : await supabaseAdmin
          .from("company_members")
          .insert({
            company_id: company.id,
            user_id: userId,
            role: "owner"
          })
          .select("id")
          .single();

    if (membershipError) {
      console.error("[companies] Membership creation failed", {
        userId,
        companyId: company.id,
        error: membershipError
      });
      return NextResponse.json(
        { error: "Entreprise créée mais l'adhésion a échoué : " + membershipError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      company: {
        ...company,
        role: "owner" as const
      }
    });
  } catch (error) {
    console.error("[companies] Failed to create company", { userId, error });
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
}
