import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const ALLOWED_ROLES = ["owner", "admin", "member"] as const;

async function resolveCompanyIdForUser(
  userId: string,
  requestedCompanyId?: string | null
): Promise<string | null> {
  const query = supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .in("role", ALLOWED_ROLES)
    .order("created_at", { ascending: true })
    .limit(1);

  if (requestedCompanyId) {
    query.eq("company_id", requestedCompanyId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve company: ${error.message}`);
  }

  return data?.company_id ?? null;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedCompanyIdFromUrl = url.searchParams.get("company_id");

  const {
    name,
    description,
    client_first_name,
    client_last_name,
    client_address,
    client_city,
    client_postal_code,
    client_phone,
    client_email,
    company_id
  } = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string | null;
    client_first_name?: string | null;
    client_last_name?: string | null;
    client_address?: string | null;
    client_city?: string | null;
    client_postal_code?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    company_id?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const companyId = await resolveCompanyIdForUser(
    userId,
    company_id || requestedCompanyIdFromUrl
  ).catch((error) => {
    console.error("[api/projects] Company lookup failed", { userId, error });
    return null;
  });

  if (!companyId) {
    return NextResponse.json(
      { error: "No company found for the current user" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({
      company_id: companyId,
      name: name.trim(),
      description: description?.trim() || null,
      status: "draft",
      created_by: userId,
      client_first_name: client_first_name?.trim() || null,
      client_last_name: client_last_name?.trim() || null,
      client_address: client_address?.trim() || null,
      client_city: client_city?.trim() || null,
      client_postal_code: client_postal_code?.trim() || null,
      client_phone: client_phone?.trim() || null,
      client_email: client_email?.trim() || null
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[api/projects] Create project failed", error);
    return NextResponse.json(
      { error: "Could not create project. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedCompanyId = url.searchParams.get("company_id");

  const companyId = await resolveCompanyIdForUser(userId, requestedCompanyId).catch((error) => {
    console.error("[api/projects] Company lookup failed", { userId, error });
    return null;
  });

  if (!companyId) {
    return NextResponse.json({ projects: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, status, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/projects] Failed to list projects", { userId, companyId, error });
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}
