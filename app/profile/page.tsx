"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { Building2, Loader2, LogIn, Plus, Save } from "lucide-react";

import { useActiveCompany } from "../../components/active-company-context";
import { createCompany, type UserCompany } from "./services/companyApi";
import { fetchProfile, updateProfile, type UserProfile } from "./services/profileApi";

type ProfileForm = {
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  phone: string;
};

const emptyForm: ProfileForm = {
  email: "",
  first_name: "",
  last_name: "",
  job_title: "",
  phone: ""
};

export default function ProfilePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    companies,
    loading: companiesLoading,
    error: companiesError,
    refreshCompanies,
    setActiveCompany,
    addCompany
  } = useActiveCompany();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (options?: { silent?: boolean }): Promise<boolean> => {
      if (!isLoaded) return false;
      if (!isSignedIn) {
        setForm(emptyForm);
        setLoading(false);
        return false;
      }

      if (!options?.silent) {
        setLoading(true);
        setError(null);
        setSuccess(null);
      }

      try {
        const response = await fetchProfile();

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "Chargement du profil impossible.");
        }

        const body = (await response.json().catch(() => ({}))) as { profile?: UserProfile | null };
        const profile = body.profile;

        setForm({
          email: profile?.email ?? "",
          first_name: profile?.first_name ?? "",
          last_name: profile?.last_name ?? "",
          job_title: profile?.job_title ?? "",
          phone: profile?.phone ?? ""
        });
        if (options?.silent) {
          setError(null);
        }
        return true;
      } catch (err) {
        console.error("[profile] Failed to load profile", err);
        setForm(emptyForm);
        setError("Impossible de charger le profil.");
        return false;
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [isLoaded, isSignedIn]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange =
    (field: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        job_title: form.job_title,
        phone: form.phone
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Enregistrement impossible.");
      }

      const body = (await response.json().catch(() => ({}))) as { profile?: UserProfile | null };
      const profile = body.profile;

      setForm({
        email: profile?.email ?? form.email,
        first_name: profile?.first_name ?? form.first_name,
        last_name: profile?.last_name ?? form.last_name,
        job_title: profile?.job_title ?? form.job_title,
        phone: profile?.phone ?? form.phone
      });
      const refreshed = await loadProfile({ silent: true });
      if (refreshed) {
        setSuccess("Profil enregistre.");
      }
    } catch (err) {
      console.error("[profile] Failed to save profile", err);
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCompany = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCompanyError(null);
    setCompanyFeedback(null);

    const name = newCompanyName.trim();
    if (!name) {
      setCompanyError("Le nom de l'entreprise est requis.");
      return;
    }

    setCreating(true);
    try {
      const response = await createCompany({ name });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Création impossible.");
      }
      const body = (await response.json().catch(() => ({}))) as { company?: UserCompany };
      const createdCompany = body.company;

      setNewCompanyName("");
      setCompanyFeedback("Entreprise créée.");

      if (createdCompany) {
        addCompany(createdCompany);
      }
      // Optionally refresh to keep in sync without losing existing state
      void refreshCompanies();
      if (createdCompany?.id) {
        setActiveCompany(createdCompany.id);
      }
    } catch (err) {
      console.error("[profile] Failed to create company", err);
      setCompanyError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setCreating(false);
    }
  };

  if (!isLoaded) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4 sm:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-text-muted">Verification de la session...</p>
        </div>
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="mx-auto flex max-w-3xl flex-col gap-4 sm:gap-6">
        <header className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Profil</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-text-main">Connexion requise</h1>
          <p className="mt-1 text-sm text-text-muted">Connectez-vous pour acceder a votre profil.</p>
        </header>
        <SignInButton mode="modal">
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Se connecter</span>
          </button>
        </SignInButton>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 sm:gap-6">
      <header className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Profil</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-text-main">Informations personnelles</h1>
        <p className="mt-1 text-sm text-text-muted">
          Mettez a jour vos informations personnelles utilisees dans l&apos;application.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-warning/30 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-warning">{error}</p>
          <p className="mt-1 text-sm text-text-muted">
            Reessayez plus tard ou verifiez votre connexion.
          </p>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-main" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              readOnly
              disabled
              className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-text-main shadow-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-text-main" htmlFor="first-name">
                Prenom
              </label>
              <input
                id="first-name"
                type="text"
                value={form.first_name}
                onChange={handleChange("first_name")}
                placeholder="Jean"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
                disabled={loading || saving}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main" htmlFor="last-name">
                Nom
              </label>
              <input
                id="last-name"
                type="text"
                value={form.last_name}
                onChange={handleChange("last_name")}
                placeholder="Dupont"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
                disabled={loading || saving}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-main" htmlFor="job-title">
              Poste
            </label>
            <input
              id="job-title"
              type="text"
              value={form.job_title}
              onChange={handleChange("job_title")}
              placeholder="Chef de chantier"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
              disabled={loading || saving}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text-main" htmlFor="phone">
              Telephone
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="+33 6 12 34 56 78"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
              disabled={loading || saving}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {success ? (
            <p className="text-sm font-semibold text-success">{success}</p>
          ) : (
            <p className="text-sm text-text-muted">Tous les champs sont optionnels.</p>
          )}
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#15365a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            <span>{saving ? "Enregistrement..." : "Enregistrer"}</span>
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Entreprises</p>
            <h2 className="text-xl font-bold text-text-main">Vos entreprises</h2>
            <p className="text-sm text-text-muted">
              L'ajout se fait via invitation. Créez une entreprise pour démarrer.
            </p>
          </div>
          <Building2 className="h-8 w-8 text-brand" aria-hidden="true" />
        </div>

        <div className="mt-4 space-y-3">
          {companiesLoading ? (
            <div className="rounded-md border border-gray-200 bg-surface-light px-3 py-3 text-sm text-text-muted">
              Chargement des entreprises...
            </div>
          ) : companiesError ? (
            <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-3 text-sm text-warning">
              {companiesError}
            </div>
          ) : !companies.length ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-surface-light px-3 py-3 text-sm text-text-muted">
              Aucune entreprise pour l'instant. Créez-en une pour démarrer.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
              {companies.map((company) => (
                <li key={company.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-text-main">{company.name}</p>
                    <p className="text-xs text-text-muted">ID: {company.id}</p>
                  </div>
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
                    {company.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleCreateCompany} className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-text-main" htmlFor="company-name">
            Créer une entreprise
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="company-name"
              type="text"
              value={newCompanyName}
              onChange={(event) => setNewCompanyName(event.target.value)}
              placeholder="Nom de l'entreprise"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm focus:border-brand focus:outline-none"
              disabled={creating}
            />
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-70"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Créer</span>
            </button>
          </div>
          {companyError ? <p className="text-sm font-semibold text-warning">{companyError}</p> : null}
          {companyFeedback ? (
            <p className="text-sm font-semibold text-success">{companyFeedback}</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
