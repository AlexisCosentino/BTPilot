import { type ChangeEvent } from "react";

import { getProjectStatusTone, projectStatuses } from "../../helpers/status";
import type { ProjectStatus } from "../types";

type StatusSelectorProps = {
  status: ProjectStatus | null;
  saving: boolean;
  error: string | null;
  onChange: (status: ProjectStatus) => Promise<boolean> | boolean;
};

export function StatusSelector({ status, saving, error, onChange }: StatusSelectorProps) {
  const currentTone = status ? getProjectStatusTone(status) : null;

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value as ProjectStatus;
    if (!status || nextStatus === status) return;
    onChange(nextStatus);
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Statut</p>
          <h2 className="text-lg font-semibold text-text-main">Etat du chantier</h2>
          <p className="text-sm text-text-muted">
            Choisissez le statut actuel. Chaque changement est enregistre dans l'historique.
          </p>
        </div>
        {currentTone ? (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${currentTone.tone}`}
          >
            {currentTone.label}
          </span>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm font-semibold text-warning">{error}</p> : null}

      <div className="mt-4 space-y-2">
        <label className="text-sm font-semibold text-text-main" htmlFor="project-status">
          Mettre a jour le statut
        </label>
        <select
          id="project-status"
          value={status ?? ""}
          onChange={handleStatusChange}
          disabled={!status || saving}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-light"
        >
          <option value="" disabled>
            Choisir un statut
          </option>
          {projectStatuses.map((value) => {
            const tone = getProjectStatusTone(value);
            return (
              <option key={value} value={value}>
                {tone.label}
              </option>
            );
          })}
        </select>
        <p className="text-xs text-text-muted">Le statut se met a jour immediatement.</p>
      </div>
    </section>
  );
}
