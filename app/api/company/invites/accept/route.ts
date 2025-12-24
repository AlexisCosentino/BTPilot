import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getInviteByToken, markInviteAccepted } from "../invites.service";
import {
  getMembershipForUser,
  stripInviteToken,
  type InviteResponse
} from "../helpers";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = (body as { token?: string })?.token;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const invite = await getInviteByToken(token);

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Invite is not pending" }, { status: 400 });
  }

  const expiresAt = new Date(invite.expires_at);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
  }

  const existingMembership = await getMembershipForUser(userId);

  if (existingMembership) {
    return NextResponse.json(
      { error: "User already belongs to a company" },
      { status: 400 }
    );
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("company_members")
    .insert({
      company_id: invite.company_id,
      user_id: userId,
      role: invite.role
    })
    .select("id, company_id, user_id, role")
    .single();

  if (membershipError) {
    console.error("[company/invites] Failed to add user to company", {
      inviteId: invite.id,
      userId,
      error: membershipError
    });
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }

  const acceptedInvite = await markInviteAccepted({
    token,
    acceptedUserId: userId
  });

  if (!acceptedInvite) {
    console.error("[company/invites] Failed to update invite after acceptance", {
      inviteId: invite.id,
      userId
    });
    return NextResponse.json({ error: "Failed to finalize invite acceptance" }, { status: 500 });
  }

  const sanitizedInvite: InviteResponse = stripInviteToken(acceptedInvite);

  return NextResponse.json({ invite: sanitizedInvite, membership });
}
