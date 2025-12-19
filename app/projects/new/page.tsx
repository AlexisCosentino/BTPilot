"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

type FormValues = {
  name: string;
  description?: string;
};

export default function NewProjectPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: { name: "", description: "" }
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          description: values.description
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setSubmitError(body.error || "Could not create project. Please try again.");
        return;
      }

      const { id } = (await response.json()) as { id?: string };
      if (!id) {
        setSubmitError("Could not create project. Please try again.");
        return;
      }

      router.replace(`/projects/${id}`);
    } catch (error) {
      console.error("[projects/new] Create project failed", error);
      setSubmitError("Could not create project. Please try again.");
    }
  });

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Projects
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-900">
          Create project
        </h1>
        <p className="text-sm text-slate-600">
          Start a new chantier with a name and optional description.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800" htmlFor="name">
            Project name
          </label>
          <input
            id="name"
            type="text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Ex: Renovation Chantier A"
            {...register("name", { required: "Project name is required" })}
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-xs text-rose-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800" htmlFor="description">
            Description (optional)
          </label>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Add context for the crew and stakeholders"
            {...register("description")}
            disabled={isSubmitting}
          />
        </div>

        {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Create project"}
        </button>
      </form>
    </section>
  );
}
