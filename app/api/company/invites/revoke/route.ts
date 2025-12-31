import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { revokeInvite } from "../invites.service";
import { getCompanyIdForUser, stripInviteToken, type InviteResponse } from "../helpers";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedCompanyId = url.searchParams.get("company_id");

  const companyId = await getCompanyIdForUser(userId, requestedCompanyId);

  if (!companyId) {
    return NextResponse.json({ error: "No company found for the current user" }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inviteId = (body as { inviteId?: string })?.inviteId;

  if (!inviteId || typeof inviteId !== "string") {
    return NextResponse.json({ error: "inviteId is required" }, { status: 400 });
  }

  const invite = await revokeInvite({ inviteId, companyId });

  if (!invite) {
    console.error("[company/invites] Invite not found for revoke", { inviteId, companyId, userId });
    return NextResponse.json({ error: "Invite not found or cannot be revoked" }, { status: 404 });
  }

  const sanitizedInvite: InviteResponse = stripInviteToken(invite);

  return NextResponse.json({ invite: sanitizedInvite });
}
