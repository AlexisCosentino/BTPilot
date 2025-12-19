import "server-only";

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { createSupabaseServerClient } from "../../../lib/supabaseServer";

type Project = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

async function getProject(id: string, accessToken: string): Promise<Project | null> {
  const supabase = createSupabaseServerClient(accessToken);

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, description, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[project-detail] Failed to load project", { id, error });
    return null;
  }

  return data ?? null;
}

export default async function ProjectDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const { userId, getToken } = auth();

  if (!userId) {
    notFound();
  }

  const accessToken = await getToken({ template: "supabase" });

  if (!accessToken) {
    console.warn("[project-detail] Missing Clerk Supabase token", { userId });
    notFound();
  }

  const project = await getProject(id, accessToken);

  if (!project) {
    notFound();
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Project
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Created {dateFormatter.format(new Date(project.created_at))}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            {project.status.replace("_", " ")}
          </span>
        </div>
        {project.description ? (
          <p className="text-sm text-slate-700">{project.description}</p>
        ) : (
          <p className="text-sm text-slate-500">No description provided.</p>
        )}
      </header>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-700 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Project entries coming next</h2>
        <p className="mt-2 text-slate-600">
          Logs, photos, and updates will appear here once the feature ships.
        </p>
      </div>
    </section>
  );
}
