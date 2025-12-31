"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { HardHat, LogIn, Plus } from "lucide-react";

import { useActiveCompany } from "../components/active-company-context";
import { formatProjectDate } from "./projects/helpers/date";
import { getProjectStatusTone } from "./projects/helpers/status";
import { useProjects } from "./projects/hooks/useProjects";

export default function DashboardPage() {
  const { activeCompanyId, loading: companiesLoading, error: companiesError } = useActiveCompany();
  const { projects, loading, error } = useProjects(activeCompanyId);

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 sm:gap-6">
      <header className="rounded-lg border border-brand/15 bg-white px-4 py-5 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Vue chantier
            </p>
            <h1 className="text-3xl font-bold leading-tight text-text-main">Chantiers</h1>
            <p className="text-sm text-text-muted">Suivi rapide des chantiers et actions terrain.</p>
          </div>
          <div className="flex items-center gap-2">
            <SignedIn>
              <Link
                href="/projects/new"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Ajouter un chantier</span>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center gap-2 rounded-md border border-white/0 bg-brand px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#15365a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>Se connecter</span>
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </header>

      {companiesLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-text-muted">Chargement des entreprises...</p>
        </div>
      ) : companiesError ? (
        <div className="rounded-lg border border-warning/30 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-warning">{companiesError}</p>
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-text-muted">Chargement des chantiers...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-warning/30 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-warning">{error}</p>
          <p className="mt-1 text-sm text-text-muted">
            Rafraichissez la page et vérifiez votre connexion.
          </p>
        </div>
      ) : !projects.length ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-light text-brand shadow-inner">
            <HardHat className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-3 text-lg font-semibold text-text-main">Aucun chantier</h2>
          <p className="mt-2 text-sm text-text-muted">
            Lancez votre premier chantier pour suivre l&apos;avancement et les Ǹchanges terrain.
          </p>
          <div className="mt-4">
            <Link
              href="/projects/new"
              className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Ajouter un chantier
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => {
            const status = getProjectStatusTone(project.status);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-text-main">{project.name}</h3>
                    <p className="mt-1 text-xs text-text-muted">
                      Créé le {formatProjectDate(project.created_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${status.tone}`}
                  >
                    {status.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
