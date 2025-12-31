"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { LogIn, Plus } from "lucide-react";

import { useActiveCompany } from "../../../components/active-company-context";
import { createProject } from "../services/projectsApi";

type FormValues = {
  name: string;
  description?: string;
  client_first_name?: string;
  client_last_name?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
  client_phone?: string;
  client_email?: string;
};

export default function NewProjectPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { activeCompanyId, loading: companiesLoading, error: companiesError } = useActiveCompany();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      client_first_name: "",
      client_last_name: "",
      client_address: "",
      client_city: "",
      client_postal_code: "",
      client_phone: "",
      client_email: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      const response = await createProject(values, activeCompanyId || undefined);

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setSubmitError(body.error || "Creation impossible. Reessayez.");
        return;
      }

      const { id } = (await response.json()) as { id?: string };
      if (!id) {
        setSubmitError("Creation impossible. Reessayez.");
        return;
      }

      router.replace(`/projects/${id}`);
    } catch (error) {
      console.error("[projects/new] Create project failed", error);
      setSubmitError("Creation impossible. Reessayez.");
    }
  });

  if (!isLoaded || companiesLoading) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-text-muted">Verification de la session...</p>
        </div>
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Chantiers</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-text-main">Connexion requise</h1>
          <p className="mt-1 text-sm text-text-muted">Connectez-vous pour creer un nouveau chantier.</p>
        </header>
        <SignInButton mode="modal">
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Se connecter ou creer un compte</span>
          </button>
        </SignInButton>
      </section>
    );
  }

  if (!activeCompanyId || companiesError) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="rounded-lg border border-warning/30 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-warning">
            {companiesError || "Aucune entreprise active selectionnée."}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Choisissez une entreprise depuis l&apos;en-tête pour créer un chantier.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Chantiers</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-text-main">Nouveau chantier</h1>
        <p className="mt-1 text-sm text-text-muted">
          Nom du chantier et informations utiles pour l'equipe terrain.
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
            placeholder="Ex : Refection toiture - Lot 3"
            {...register("name", { required: "Nom du chantier obligatoire" })}
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-xs text-warning">{errors.name.message}</p>}
        </div>

        <div className="space-y-4 rounded-lg border border-surface-light bg-surface-light/40 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-text-main">Client (optionnel)</h2>
            <p className="text-xs text-text-muted">Ajoutez ce que vous avez sous la main.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-first-name">
                Prenom
              </label>
              <input
                id="client-first-name"
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
                placeholder="Marie"
                {...register("client_first_name")}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-last-name">
                Nom
              </label>
              <input
                id="client-last-name"
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
                placeholder="Durand"
                {...register("client_last_name")}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-address">
              Adresse
            </label>
            <input
              id="client-address"
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
              placeholder="10 rue des Fleurs"
              {...register("client_address")}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-city">
                Ville
              </label>
              <input
                id="client-city"
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
                placeholder="Lyon"
                {...register("client_city")}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-postal-code">
                Code postal
              </label>
              <input
                id="client-postal-code"
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
                placeholder="69000"
                {...register("client_postal_code")}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-phone">
                Telephone
              </label>
              <input
                id="client-phone"
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
                placeholder="0612345678"
                {...register("client_phone")}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-email">
              Email
            </label>
            <input
              id="client-email"
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
              placeholder="client@example.com"
              {...register("client_email")}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-main" htmlFor="description">
            Details pour l'equipe (optionnel)
          </label>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
            placeholder="Adresse, contact chantier, contraintes d'acces..."
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
          <span>{isSubmitting ? "Enregistrement..." : "Creer le chantier"}</span>
        </button>
      </form>
    </section>
  );
}
