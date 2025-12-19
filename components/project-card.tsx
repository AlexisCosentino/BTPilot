import "server-only";

import Link from "next/link";

type ProjectCardProps = {
  id: string;
  name: string;
  status: string;
  createdAt: string | Date;
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

export function ProjectCard({ id, name, status, createdAt }: ProjectCardProps) {
  const tone = statusTone[status] ?? "bg-slate-100 text-slate-700";

  return (
    <Link
      href={`/projects/${id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Created {dateFormatter.format(new Date(createdAt))}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
          {status.replace("_", " ")}
        </span>
      </div>
    </Link>
  );
}
