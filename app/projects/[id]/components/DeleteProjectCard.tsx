import { Trash2 } from "lucide-react";

type DeleteProjectCardProps = {
  isDeleting: boolean;
  projectActionError: string | null;
  onDelete: () => void;
};

export function DeleteProjectCard({ isDeleting, projectActionError, onDelete }: DeleteProjectCardProps) {
  return (
    <div className="rounded-lg border border-warning/30 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-warning">Suppression chantier</p>
        <p className="text-sm text-text-muted">
          Supprimer définitivement ce chantier et tous les éléments associés.
        </p>
        {projectActionError ? (
          <p className="text-xs font-semibold text-warning">{projectActionError}</p>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b61f1f] disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          <span>{isDeleting ? "Suppression du chantier..." : "Supprimer le chantier"}</span>
        </button>
      </div>
    </div>
  );
}
