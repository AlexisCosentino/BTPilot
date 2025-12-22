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
    <header className="border-b border-brand bg-brand px-4 py-3 shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center justify-between text-white">
        <div className="text-sm font-semibold tracking-wide">BTPilot</div>
        <ClerkLoaded>
          <div className="flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Se connecter
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <SignOutButton>
                <button className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Se déconnecter
                </button>
              </SignOutButton>
            </SignedIn>
          </div>
        </ClerkLoaded>
        <ClerkLoading>
          <div className="h-9 w-20 rounded-md bg-white/30" />
        </ClerkLoading>
      </div>
    </header>
  );
}
