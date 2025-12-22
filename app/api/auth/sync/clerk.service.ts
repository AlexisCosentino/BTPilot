import { auth, currentUser } from "@clerk/nextjs/server";

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
