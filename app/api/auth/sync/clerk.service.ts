import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

export async function getAuthContext() {
  return auth();
}

export async function loadClerkUser(userId: string) {
  return currentUser().catch((error) => {
    console.error("[auth/sync] Failed to load Clerk user", { userId, error });
    return null;
  });
}

export function getPrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  return user?.primaryEmailAddress?.emailAddress ?? null;
}

export function buildCompanyLabel(user: Awaited<ReturnType<typeof currentUser>>) {
  return (
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "New Company"
  );
}

export async function loadClerkUserById(userId: string) {
  try {
    const user = await (await clerkClient()).users.getUser(userId);


    if (!user) {
      console.warn("[auth/sync] Clerk user not found", { userId });
      return null;
    }

    const email =
      user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || null;

    if (!email) {
      console.warn("[auth/sync] Clerk user missing email", { userId });
      return null;
    }

    return { user, email };
  } catch (error) {
    console.error("[auth/sync] Failed to load Clerk user by id", { userId, error });
    return null;
  }
}
