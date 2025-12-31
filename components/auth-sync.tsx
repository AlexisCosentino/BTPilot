"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useActiveCompany } from "./active-company-context";

/**
 * Silently syncs the signed-in Clerk user into Supabase once per user session.
 */
export function AuthSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { activeCompanyId, loading: companyLoading } = useActiveCompany();
  const lastSyncedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || companyLoading) return;
    if (!isSignedIn || !user) {
      lastSyncedKey.current = null;
      return;
    }
    if (!activeCompanyId) return;

    const syncKey = `${user.id}:${activeCompanyId}`;
    if (lastSyncedKey.current === syncKey) return;
    lastSyncedKey.current = syncKey;

    const controller = new AbortController();

    // Auth sync is idempotent and non-blocking; we log outcomes but do not block the UI flow.
    (async () => {
      try {
        const response = await fetch(`/api/auth/sync?company_id=${activeCompanyId}`, {
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
