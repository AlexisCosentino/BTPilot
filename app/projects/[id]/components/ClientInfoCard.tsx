import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import type { ClientInfo } from "../types";

type ClientInfoCardProps = {
  client: ClientInfo | null;
  saving: boolean;
  error: string | null;
  onSave: (updates: Partial<ClientInfo>) => Promise<boolean> | boolean;
};

type ClientFormState = {
  [K in keyof ClientInfo]: string;
};

const emptyForm: ClientFormState = {
  client_first_name: "",
  client_last_name: "",
  client_address: "",
  client_city: "",
  client_postal_code: "",
  client_phone: "",
  client_email: ""
};

export function ClientInfoCard({ client, saving, error, onSave }: ClientInfoCardProps) {
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!client) {
      setForm(emptyForm);
      setDirty(false);
      return;
    }

    setForm({
      client_first_name: client.client_first_name ?? "",
      client_last_name: client.client_last_name ?? "",
      client_address: client.client_address ?? "",
      client_city: client.client_city ?? "",
      client_postal_code: client.client_postal_code ?? "",
      client_phone: client.client_phone ?? "",
      client_email: client.client_email ?? ""
    });
    setDirty(false);
  }, [client]);

  const handleChange = (field: keyof ClientInfo) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
    setDirty(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!client || saving || !dirty) return;

    const payload: Partial<ClientInfo> = {
      ...form
    };

    const ok = await onSave(payload);
    if (ok) {
      setDirty(false);
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Client</p>
          <h2 className="text-lg font-semibold text-text-main">Coordonnees du client</h2>
          <p className="text-sm text-text-muted">
            Modifiez les informations client a tout moment. Les champs vides seront enregistres comme
            optionnels.
          </p>
        </div>
        {error ? <p className="text-sm font-semibold text-warning">{error}</p> : null}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-first-name">
              Prenom
            </label>
            <input
              id="client-first-name"
              type="text"
              value={form.client_first_name}
              onChange={handleChange("client_first_name")}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              disabled={!client || saving}
              placeholder="Marie"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-last-name">
              Nom
            </label>
            <input
              id="client-last-name"
              type="text"
              value={form.client_last_name}
              onChange={handleChange("client_last_name")}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              disabled={!client || saving}
              placeholder="Durand"
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
            value={form.client_address}
            onChange={handleChange("client_address")}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            disabled={!client || saving}
            placeholder="10 rue des Fleurs"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-city">
              Ville
            </label>
            <input
              id="client-city"
              type="text"
              value={form.client_city}
              onChange={handleChange("client_city")}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              disabled={!client || saving}
              placeholder="Lyon"
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-xs font-semibold uppercase text-text-muted"
              htmlFor="client-postal-code"
            >
              Code postal
            </label>
            <input
              id="client-postal-code"
              type="text"
              value={form.client_postal_code}
              onChange={handleChange("client_postal_code")}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              disabled={!client || saving}
              placeholder="69000"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-text-muted" htmlFor="client-phone">
              Telephone
            </label>
            <input
              id="client-phone"
              type="text"
              value={form.client_phone}
              onChange={handleChange("client_phone")}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              disabled={!client || saving}
              placeholder="0612345678"
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
            value={form.client_email}
            onChange={handleChange("client_email")}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            disabled={!client || saving}
            placeholder="client@example.com"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <p className="text-xs text-text-muted">Les informations sont visibles pour votre equipe.</p>
          <button
            type="submit"
            disabled={!client || saving || !dirty}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
}
