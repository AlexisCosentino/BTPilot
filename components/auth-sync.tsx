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

    (async () => {
      try {
        const response = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          console.error("[AuthSync] Sync failed", { status: response.status, userId: user.id });
          lastSyncedUserId.current = null;
        } else {
          console.log("[AuthSync] Sync completed", { userId: user.id });
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("[AuthSync] Sync request error", { error, userId: user.id });
        lastSyncedUserId.current = null;
      }
    })();

    return () => controller.abort();
  }, [isLoaded, isSignedIn, user]);

  return null;
}
