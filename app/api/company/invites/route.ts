import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { createInvite, listInvites } from "./invites.service";
import {
  getCompanyIdForUser,
  getMembershipForUser,
  stripInviteToken,
  type InviteResponse
} from "./helpers";
import { sendInviteEmail } from "../../../../lib/email/resend";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedCompanyId = url.searchParams.get("company_id");

  const companyId = await getCompanyIdForUser(userId, requestedCompanyId);

  if (!companyId) {
    return NextResponse.json({ error: "No company found for the current user" }, { status: 400 });
  }

  const membership = await getMembershipForUser(userId, companyId);

  if (!membership || membership.company_id !== companyId || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, role } = (body ?? {}) as { email?: string; role?: string };

  try {
    const invite = await createInvite({
      companyId,
      email: email ?? "",
      role: role ?? "member",
      invitedByUserId: userId
    });

    if (!invite) {
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    const inviteLink = new URL("/invite/accept", request.url);
    inviteLink.searchParams.set("token", invite.token);

    void (async () => {
      try {
        const [{ data: company }, { data: inviterProfile }] = await Promise.all([
          supabaseAdmin
            .from("companies")
            .select("name")
            .eq("id", companyId)
            .maybeSingle(),
          supabaseAdmin
            .from("user_profiles")
            .select("first_name, last_name, email")
            .eq("user_id", userId)
            .maybeSingle()
        ]);

        const inviterName = [inviterProfile?.first_name, inviterProfile?.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || inviterProfile?.email || "Membre BTPilot";

        const companyName = company?.name ?? "Votre entreprise";

        await sendInviteEmail({
          toEmail: invite.email,
          inviterName,
          companyName,
          inviteLink: inviteLink.toString()
        });
      } catch (emailError) {
        console.error("[company/invites] Invite email send failed", {
          companyId,
          inviteId: invite.id,
          userId,
          error: emailError
        });
      }
    })();

    return NextResponse.json({ invite: stripInviteToken(invite) }, { status: 201 });
  } catch (error) {
    console.error("[company/invites] Create invite failed", { companyId, userId, error });
    return NextResponse.json({ error: "Invalid invite payload" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedCompanyId = url.searchParams.get("company_id");

  const companyId = await getCompanyIdForUser(userId, requestedCompanyId);

  if (!companyId) {
    return NextResponse.json({ error: "No company found for the current user" }, { status: 400 });
  }

  const invites = await listInvites(companyId);

  if (!invites) {
    return NextResponse.json({ error: "Failed to list invites" }, { status: 500 });
  }

  const sanitizedInvites: InviteResponse[] = invites.map(stripInviteToken);

  return NextResponse.json({ invites: sanitizedInvites });
}
