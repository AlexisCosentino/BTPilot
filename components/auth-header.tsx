"use client";

import {
  ClerkLoaded,
  ClerkLoading,
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  UserButton
} from "@clerk/nextjs";

export function AuthHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-slate-700">
          BTPilot
        </div>
        <ClerkLoaded>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <SignOutButton>
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50">
                  Sign out
                </button>
              </SignOutButton>
            </SignedIn>
          </div>
        </ClerkLoaded>
        <ClerkLoading>
          <div className="h-9 w-20 rounded-lg bg-slate-200" />
        </ClerkLoading>
      </div>
    </header>
  );
}
