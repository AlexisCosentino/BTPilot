"use client";

import Link from "next/link";
import {
  ClerkLoaded,
  ClerkLoading,
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  UserButton
} from "@clerk/nextjs";
import { CompanySelector } from "./company-selector";

export function AuthHeader() {
  return (
    <header className="border-b border-brand bg-brand px-4 py-3 shadow-sm sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold tracking-wide">BTPilot</div>
          <SignedIn>
            <CompanySelector />
          </SignedIn>
        </div>
        <ClerkLoaded>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Se connecter
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/company/team"
                className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Équipe
              </Link>
              <Link
                href="/profile"
                className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Profil
              </Link>
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
