import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ActiveCompanyProvider } from "../components/active-company-context";
import { AuthHeader } from "../components/auth-header";
import { AuthSync } from "../components/auth-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTPilot | Outil chantier BTP",
  description: "Notes, photos et suivi chantier pensés pour les équipes terrain.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#0F2A44"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-surface-light text-text-main antialiased">
        <ClerkProvider>
          <ActiveCompanyProvider>
            <AuthSync />
            <div className="flex min-h-screen flex-col">
              <AuthHeader />
              <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
            </div>
          </ActiveCompanyProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
