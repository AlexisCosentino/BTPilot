"use client";

import { SignedIn, UserButton, useUser } from "@clerk/nextjs";

export function AppHeader() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <header className="border-b border-brand bg-brand px-4 py-3 shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 text-white">
        <div className="text-sm font-semibold tracking-wide">BTPilot</div>
        <SignedIn>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">{email}</span>
            <UserButton showName={false} afterSignOutUrl="/" />
          </div>
        </SignedIn>
      </div>
    </header>
  );
}
