import { ClientInfoCard } from "./ClientInfoCard";
import { StatusSelector } from "./StatusSelector";
import type { ClientInfo, Project } from "../types";

type ProjectEditPanelProps = {
  project: Project;
  savingClient: boolean;
  savingStatus: boolean;
  clientError: string | null;
  statusError: string | null;
  onSaveClient: (updates: Partial<ClientInfo>) => Promise<boolean> | boolean;
  onChangeStatus: (status: Project["status"]) => Promise<boolean> | boolean;
  onClose: () => void;
};

export function ProjectEditPanel({
  project,
  savingClient,
  savingStatus,
  clientError,
  statusError,
  onSaveClient,
  onChangeStatus,
  onClose
}: ProjectEditPanelProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Edition</p>
          <h2 className="text-lg font-semibold text-text-main">Mettre a jour le chantier</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-semibold text-text-muted underline underline-offset-2"
        >
          Fermer
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusSelector
          status={project.status}
          saving={savingStatus}
          error={statusError}
          onChange={onChangeStatus}
        />
        <ClientInfoCard
          client={project}
          saving={savingClient}
          error={clientError}
          onSave={onSaveClient}
        />
      </div>
    </section>
  );
}
