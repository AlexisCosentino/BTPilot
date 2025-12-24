"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { Loader2, LogIn, Mail, User, UserPlus, Users, X } from "lucide-react";

import { createInvite, fetchAuthSync, listInvites, revokeInvite } from "./services/teamApi";

type TeamMember = {
  id: string;
  user_id: string;
  email?: string | null;
  role?: string | null;
  display_name?: string | null;
  created_at?: string;
};

type Invite = {
  id: string;
  email: string;
  status: string;
  created_at: string;
  invited_by?: string;
  role?: string;
  company_id?: string;
  expires_at?: string;
  accepted_at?: string | null;
  accepted_user_id?: string | null;
  updated_at?: string;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" });

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${dateFormatter.format(date)} - ${timeFormatter.format(date)}`;
}

export default function TeamPage() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const [revokingId, setRevokingId] = useState<string | null>(null);

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === "pending"),
    [invites]
  );

  useEffect(() => {
    let active = true;

    if (!isLoaded) return;

    if (!isSignedIn) {
      setMembers([]);
      setInvites([]);
      setLoading(false);
      setError("Connectez-vous pour voir votre equipe.");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let nextMembers: TeamMember[] = [];

        try {
          const authSyncRes = await fetchAuthSync();
          if (authSyncRes.ok) {
            const authBody = (await authSyncRes.json().catch(() => ({}))) as {
              company_members?: TeamMember[];
            };
            nextMembers = Array.isArray(authBody.company_members) ? authBody.company_members : [];
          } else {
            console.error("[company/team] Auth sync did not succeed", { status: authSyncRes.status });
          }
        } catch (authError) {
          console.error("[company/team] Auth sync failed", authError);
        }

        const invitesRes = await listInvites();

        if (!active) return;

        if (!invitesRes.ok) {
          const body = (await invitesRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "Chargement des invitations impossible.");
        }

        const invitesBody = (await invitesRes.json().catch(() => ({}))) as { invites?: Invite[] };

        setMembers(nextMembers);
        setInvites(Array.isArray(invitesBody.invites) ? invitesBody.invites : []);
        setLoading(false);
      } catch (err) {
        console.error("[company/team] Failed to load data", err);
        if (!active) return;
        setMembers([]);
        setInvites([]);
        setError("Impossible de charger les donnees de l'equipe.");
        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn]);

  const handleCreateInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!inviteEmail.trim()) {
      setInviteError("Email requis.");
      return;
    }

    setInviteError(null);
    setIsInviting(true);

    try {
      const response = await createInvite({ email: inviteEmail.trim(), role: "member" });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setInviteError(body.error || "Invitation impossible. Reessayez.");
        setIsInviting(false);
        return;
      }

      setInviteEmail("");

      const invitesRes = await listInvites();
      if (invitesRes.ok) {
        const invitesBody = (await invitesRes.json().catch(() => ({}))) as { invites?: Invite[] };
        setInvites(Array.isArray(invitesBody.invites) ? invitesBody.invites : []);
      }
    } catch (err) {
      console.error("[company/team] Failed to create invite", err);
      setInviteError("Invitation impossible. Reessayez.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setInviteError(null);
    setRevokingId(inviteId);

    try {
      const response = await revokeInvite(inviteId);

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setInviteError(body.error || "Revocation impossible.");
        setRevokingId(null);
        return;
      }

      const invitesRes = await listInvites();
      if (invitesRes.ok) {
        const invitesBody = (await invitesRes.json().catch(() => ({}))) as { invites?: Invite[] };
        setInvites(Array.isArray(invitesBody.invites) ? invitesBody.invites : []);
      }
    } catch (err) {
      console.error("[company/team] Failed to revoke invite", err);
      setInviteError("Revocation impossible.");
    } finally {
      setRevokingId(null);
    }
  };

  if (!isLoaded) {
    return (
      <section className="mx-auto flex max-w-4xl flex-col gap-4 sm:gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-text-muted">Verification de la session...</p>
        </div>
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="mx-auto flex max-w-4xl flex-col gap-4 sm:gap-6">
        <header className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Equipe</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight text-text-main">Connexion requise</h1>
          <p className="mt-1 text-sm text-text-muted">
            Connectez-vous pour gerer les membres de votre entreprise.
          </p>
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
    <section className="mx-auto flex max-w-5xl flex-col gap-4 overflow-x-hidden sm:gap-6">
      <header className="rounded-lg border border-brand/15 bg-white px-4 py-4 shadow-sm sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Equipe</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-text-main">Gestion d&apos;equipe</h1>
        <p className="mt-1 text-sm text-text-muted">
          Invitez vos collaborateurs et suivez les membres actifs de l&apos;entreprise.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-warning/30 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-warning">{error}</p>
          <p className="mt-1 text-sm text-text-muted">
            Rafraichissez la page ou reessayez dans quelques instants.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light text-brand">
                <Users className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-text-main">Membres</h2>
                <p className="text-xs text-text-muted">Membres actuels de l&apos;entreprise.</p>
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <p className="text-sm text-text-muted">Chargement des membres...</p>
              ) : !members.length ? (
                <p className="text-sm text-text-muted">Aucun membre trouve.</p>
              ) : (
                <ul className="grid gap-3">
                  {members.map((member) => {
                    const normalizedDisplayName = member.display_name?.trim();
                    const normalizedEmail = member.email?.trim();
                    const displayName =
                      normalizedDisplayName || normalizedEmail || "Utilisateur interne";
                    const showEmail =
                      Boolean(normalizedDisplayName) &&
                      Boolean(normalizedEmail) &&
                      normalizedDisplayName?.toLowerCase() !== normalizedEmail?.toLowerCase();
                    const isCurrent = member.user_id === userId;
                    return (
                      <li
                        key={member.id}
                        className="flex flex-col gap-3 rounded-md border border-gray-100 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-light text-brand">
                            <User className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="break-all text-sm font-semibold text-text-main">
                              {displayName}
                            </p>
                            {showEmail ? (
                              <p className="break-all text-xs text-text-muted">{member.email}</p>
                            ) : null}
                            <p className="text-xs text-text-muted">
                              {member.role ? member.role : "Membre"}
                            </p>
                          </div>
                        </div>
                        {isCurrent ? (
                          <span className="inline-flex w-fit items-center rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                            Vous
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light text-accent">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-text-main">Invitations en attente</h2>
                <p className="text-xs text-text-muted">Collaborateurs invites, en attente.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-text-muted">Chargement des invitations...</p>
              ) : !pendingInvites.length ? (
                <p className="text-sm text-text-muted">Aucune invitation en attente.</p>
              ) : (
                pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-2 rounded-md border border-gray-100 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-main break-all">{invite.email}</p>
                      <p className="text-xs text-text-muted">Envoye le {formatDate(invite.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                        En attente
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRevoke(invite.id)}
                        disabled={revokingId === invite.id}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-text-main shadow-sm transition hover:border-gray-300 hover:bg-surface-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto w-full justify-center sm:justify-normal"
                      >
                        {revokingId === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <X className="h-4 w-4" aria-hidden="true" />
                        )}
                        Revoquer
                      </button>
                    </div>
                  </div>
                ))
              )}

              {inviteError ? (
                <p className="text-xs font-semibold text-warning">{inviteError}</p>
              ) : null}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-light text-success">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-text-main">Inviter un collaborateur</h2>
              <p className="text-xs text-text-muted">Envoi d&apos;une invitation par email.</p>
            </div>
          </div>

          <form onSubmit={handleCreateInvite} className="mt-4 space-y-3">
            <label className="block text-sm font-semibold text-text-main" htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="prenom.nom@email.fr"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-text-main shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
              required
            />
            <button
              type="submit"
              disabled={isInviting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#15365a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Mail className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{isInviting ? "Envoi..." : "Envoyer l'invitation"}</span>
            </button>
            {inviteError ? (
              <p className="text-sm font-semibold text-warning">{inviteError}</p>
            ) : null}
          </form>
        </section>
      </div>
    </section>
  );
}
