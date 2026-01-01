import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type ProfilePayload = {
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  phone?: string | null;
};

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

const profileSelect = "user_id, email, first_name, last_name, job_title, phone";

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select(profileSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[api/profile] Failed to load profile", { userId, error });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}

export async function PATCH(request: NextRequest) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ProfilePayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Partial<ProfilePayload> = {};

  if ("first_name" in payload) {
    updates.first_name = normalizeNullableText(payload.first_name);
  }

  if ("last_name" in payload) {
    updates.last_name = normalizeNullableText(payload.last_name);
  }

  if ("job_title" in payload) {
    updates.job_title = normalizeNullableText(payload.job_title);
  }

  if ("phone" in payload) {
    updates.phone = normalizeNullableText(payload.phone);
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .update(updates)
    .eq("user_id", userId)
    .select(profileSelect)
    .maybeSingle();

  if (error) {
    console.error("[api/profile] Failed to update profile", { userId, error });
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: data });
}
