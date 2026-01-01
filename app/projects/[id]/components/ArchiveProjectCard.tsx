import { Archive } from "lucide-react";

type ArchiveProjectCardProps = {
  isArchiving: boolean;
  projectActionError: string | null;
  onArchive: () => void;
};

export function ArchiveProjectCard({
  isArchiving,
  projectActionError,
  onArchive
}: ArchiveProjectCardProps) {
  return (
    <div className="rounded-lg border border-warning/30 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-warning">Archivage chantier</p>
        <p className="text-sm text-text-muted">
          Archiver ce chantier pour le retrouver dans les archives de l'entreprise.
        </p>
        {projectActionError ? (
          <p className="text-xs font-semibold text-warning">{projectActionError}</p>
        ) : null}
        <button
          type="button"
          onClick={onArchive}
          disabled={isArchiving}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b61f1f] disabled:opacity-60"
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          <span>{isArchiving ? "Archivage du chantier..." : "Archiver le chantier"}</span>
        </button>
      </div>
    </div>
  );
}
