import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTPilot",
  description: "Mobile-first Next.js app boilerplate ready for PWA upgrades.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#0f172a"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-background text-foreground">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
