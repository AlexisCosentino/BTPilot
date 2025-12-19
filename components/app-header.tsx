"use client";

import { SignedIn, UserButton, useUser } from "@clerk/nextjs";

export function AppHeader() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <header className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold tracking-wide text-slate-800">
          BTPilot
        </div>
        <SignedIn>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">{email}</span>
            <UserButton showName={false} afterSignOutUrl="/" />
          </div>
        </SignedIn>
      </div>
    </header>
  );
}
