import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createInvite, listInvites } from "./invites.service";
import { getCompanyIdForUser, stripInviteToken, type InviteResponse } from "./helpers";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyIdForUser(userId);

  if (!companyId) {
    return NextResponse.json({ error: "No company found for the current user" }, { status: 400 });
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

    return NextResponse.json({ invite: stripInviteToken(invite) }, { status: 201 });
  } catch (error) {
    console.error("[company/invites] Create invite failed", { companyId, userId, error });
    return NextResponse.json({ error: "Invalid invite payload" }, { status: 400 });
  }
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getCompanyIdForUser(userId);

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
