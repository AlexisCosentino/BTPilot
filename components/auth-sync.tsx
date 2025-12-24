"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

/**
 * Silently syncs the signed-in Clerk user into Supabase once per user session.
 */
export function AuthSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      lastSyncedUserId.current = null;
      return;
    }
    if (lastSyncedUserId.current === user.id) return;

    lastSyncedUserId.current = user.id;

    const controller = new AbortController();

    // Auth sync is idempotent and non-blocking; we log outcomes but do not block the UI flow.
    (async () => {
      try {
        const response = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          signal: controller.signal
        });

        if ([200, 204, 409].includes(response.status)) {
          console.log("[AuthSync] Sync completed", { userId: user.id });
        } else {
          console.warn("[AuthSync] Sync not successful", { status: response.status, userId: user.id });
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.warn("[AuthSync] Sync request error", { error, userId: user.id });
      }
    })();

    return () => controller.abort();
  }, [isLoaded, isSignedIn, user]);

  return null;
}
