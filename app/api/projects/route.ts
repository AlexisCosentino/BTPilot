import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

async function getCompanyIdForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

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

  const { name, description } = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string | null;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const companyId = await getCompanyIdForUser(userId).catch((error) => {
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
      created_by: userId
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

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyIdForUser(userId).catch((error) => {
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
