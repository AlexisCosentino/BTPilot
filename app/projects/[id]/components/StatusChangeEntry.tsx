import { getProjectStatusTone } from "../../helpers/status";
import { formatTime } from "../helpers/format";
import type { StatusEvent } from "../types";

type StatusChangeEntryProps = {
  event: StatusEvent;
};

export function StatusChangeEntry({ event }: StatusChangeEntryProps) {
  const fromTone = event.old_status ? getProjectStatusTone(event.old_status) : null;
  const toTone = getProjectStatusTone(event.new_status);

  return (
    <li className="flex gap-3 rounded-lg border border-surface-light bg-surface-light/40 px-4 py-3 shadow-inner sm:px-5">
      <div className="flex flex-col items-center">
        <div className="h-2 w-2 rounded-full bg-text-muted" />
        <div className="flex-1 border-l border-dashed border-text-muted/30" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Statut</p>
          <span className="text-xs text-text-muted">{formatTime(event.changed_at)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-main">
          <span>Statut du chantier change :</span>
          {fromTone ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${fromTone.tone}`}
            >
              {fromTone.label}
            </span>
          ) : (
            <span className="text-text-muted">Non defini</span>
          )}
          <span className="text-text-muted">-&gt;</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${toTone.tone}`}
          >
            {toTone.label}
          </span>
        </div>
        <p className="text-xs text-text-muted">Entree systeme - non modifiable</p>
      </div>
    </li>
  );
}
