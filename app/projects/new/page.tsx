"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { ClipboardList, LogIn, Plus } from "lucide-react";
import { createProject } from "../services/projectsApi";

type FormValues = {
  name: string;
  description?: string;
};

export default function NewProjectPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
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
      const response = await createProject({
        name: values.name,
        description: values.description
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setSubmitError(body.error || "Création impossible. Réessayez.");
        return;
      }

      const { id } = (await response.json()) as { id?: string };
      if (!id) {
        setSubmitError("Création impossible. Réessayez.");
        return;
      }

      router.replace(`/projects/${id}`);
    } catch (error) {
      console.error("[projects/new] Create project failed", error);
      setSubmitError("Création impossible. Réessayez.");
    }
  });

  if (!isLoaded) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-text-muted">Vérification de la session...</p>
        </div>
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Chantiers
          </p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-text-main">
            Connexion requise
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Connectez-vous pour créer un nouveau chantier.
          </p>
        </header>
        <SignInButton mode="modal">
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Se connecter ou créer un compte</span>
          </button>
        </SignInButton>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Chantiers
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-text-main">
          Nouveau chantier
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Nom du chantier et informations utiles pour l'équipe terrain.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-main" htmlFor="name">
            Nom du chantier
          </label>
          <input
            id="name"
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
            placeholder="Ex : Réfection toiture - Lot 3"
            {...register("name", { required: "Nom du chantier obligatoire" })}
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-xs text-warning">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-main" htmlFor="description">
            Détails pour l'équipe (optionnel)
          </label>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
            placeholder="Adresse, contact chantier, contraintes d'accès..."
            {...register("description")}
            disabled={isSubmitting}
          />
        </div>

        {submitError && <p className="text-sm text-warning">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{isSubmitting ? "Enregistrement..." : "Créer le chantier"}</span>
        </button>
      </form>
    </section>
  );
}
