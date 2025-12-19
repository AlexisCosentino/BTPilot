"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

type Project = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

const statusTone: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  planned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-emerald-100 text-emerald-700",
  canceled: "bg-rose-100 text-rose-700"
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isLoaded) return;

    if (!isSignedIn) {
      if (active) {
        setProjects([]);
        setError("Please sign in to view your projects.");
        setLoading(false);
      }
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/projects", { cache: "no-store" });

        if (!active) return;

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          const message =
            response.status === 401
              ? "Please sign in to view your projects."
              : body.error || "Failed to load projects.";

          setProjects([]);
          setError(message);
          setLoading(false);
          return;
        }

        const body = (await response.json().catch(() => ({}))) as {
          projects?: Project[];
        };

        setProjects(Array.isArray(body.projects) ? body.projects : []);
        setLoading(false);
      } catch (error) {
        console.error("[dashboard] Failed to load projects", error);
        if (!active) return;
        setProjects([]);
        setError("Failed to load projects.");
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn]);

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Dashboard
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900">
            Projects
          </h1>
          <p className="text-sm text-slate-600">
            View your latest chantiers and keep work moving.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Create new project
        </Link>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          <p className="mt-1 text-sm text-slate-600">
            Refresh the page or try again in a moment.
          </p>
        </div>
      ) : !projects.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <span className="text-sm font-semibold">P</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">No projects yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Start your first chantier to track status, dates, and updates.
          </p>
          <div className="mt-4">
            <Link
              href="/projects/new"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Create new project
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => {
            const tone = statusTone[project.status] ?? "bg-slate-100 text-slate-700";

            return (
              <article
                key={project.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{project.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Created {dateFormatter.format(new Date(project.created_at))}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}
                  >
                    {project.status.replace("_", " ")}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
