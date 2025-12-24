import { randomBytes } from "crypto";

import { supabaseAdmin, type Database } from "../../../../lib/supabaseAdmin";

const INVITE_ROLES = ["member", "owner"] as const;

type InviteRole = (typeof INVITE_ROLES)[number];
type InviteRow = Database["public"]["Tables"]["company_invites"]["Row"];

function normalizeEmail(email: string): string {
  const value = (email ?? "").trim();

  if (!value) {
    throw new Error("Email is required");
  }

  return value.toLowerCase();
}

function normalizeRole(role: string): InviteRole {
  const value = (role ?? "").trim().toLowerCase();

  if (INVITE_ROLES.includes(value as InviteRole)) {
    return value as InviteRole;
  }

  throw new Error("Invalid invite role");
}

function requireToken(token: string): string {
  const value = (token ?? "").trim();

  if (!value) {
    throw new Error("Invite token is required");
  }

  return value;
}

export async function createInvite(params: {
  companyId: string;
  email: string;
  role: string;
  invitedByUserId: string;
}): Promise<InviteRow | null> {
  const { companyId, email, role, invitedByUserId } = params;
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeRole(role);
  const token = randomBytes(32).toString("hex");

  const { data, error } = await supabaseAdmin
    .from("company_invites")
    .insert({
      company_id: companyId,
      email: normalizedEmail,
      role: normalizedRole,
      token,
      invited_by: invitedByUserId,
      status: "pending"
    })
    .select("*")
    .single();

  if (error) {
    console.error("[company/invites] Failed to create invite", {
      companyId,
      email: normalizedEmail,
      role: normalizedRole,
      invitedByUserId,
      error
    });
    return null;
  }

  return data as InviteRow;
}

export async function getInviteByToken(token: string): Promise<InviteRow | null> {
  const normalizedToken = requireToken(token);

  const { data, error } = await supabaseAdmin
    .from("company_invites")
    .select("*")
    .eq("token", normalizedToken)
    .maybeSingle();

  if (error) {
    console.error("[company/invites] Failed to fetch invite by token", {
      token: normalizedToken,
      error
    });
    return null;
  }

  return (data as InviteRow | null) ?? null;
}

export async function markInviteAccepted(params: {
  token: string;
  acceptedUserId: string;
}): Promise<InviteRow | null> {
  const normalizedToken = requireToken(params.token);
  const acceptedUserId = (params.acceptedUserId ?? "").trim();

  if (!acceptedUserId) {
    throw new Error("acceptedUserId is required");
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("company_invites")
    .update({
      status: "accepted",
      accepted_at: now,
      accepted_user_id: acceptedUserId,
      updated_at: now
    })
    .eq("token", normalizedToken)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[company/invites] Failed to mark invite accepted", {
      token: normalizedToken,
      acceptedUserId,
      error
    });
    return null;
  }

  return (data as InviteRow | null) ?? null;
}

export async function revokeInvite(params: {
  inviteId: string;
  companyId: string;
}): Promise<InviteRow | null> {
  const { inviteId, companyId } = params;
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("company_invites")
    .update({ status: "revoked", updated_at: now })
    .eq("id", inviteId)
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[company/invites] Failed to revoke invite", {
      inviteId,
      companyId,
      error
    });
    return null;
  }

  return (data as InviteRow | null) ?? null;
}

export async function listInvites(companyId: string): Promise<InviteRow[] | null> {
  const { data, error } = await supabaseAdmin
    .from("company_invites")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[company/invites] Failed to list invites", { companyId, error });
    return null;
  }

  return (data as InviteRow[] | null) ?? [];
}
