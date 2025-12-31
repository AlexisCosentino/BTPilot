"use client";

import { ChevronsUpDown, Factory } from "lucide-react";
import { useMemo, useState } from "react";

import { useActiveCompany } from "./active-company-context";

export function CompanySelector() {
  const { companies, activeCompanyId, setActiveCompany, loading, error } = useActiveCompany();
  const [open, setOpen] = useState(false);

  const activeCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) || null,
    [activeCompanyId, companies]
  );

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-inner">
        <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
        <span>Entreprises...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs font-semibold text-white/80" title={error}>
        Entreprises indisponibles
      </div>
    );
  }

  if (!companies.length) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-md border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:border-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Factory className="h-4 w-4" aria-hidden="true" />
        <span>{activeCompany?.name || "Sélectionner une entreprise"}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-[220px] rounded-md border border-white/20 bg-[#0f2a44] shadow-lg ring-1 ring-black/5">
          <ul className="divide-y divide-white/10 text-sm text-white">
            {companies.map((company) => {
              const isActive = company.id === activeCompanyId;
              return (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setActiveCompany(company.id);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-white/10 ${
                      isActive ? "bg-white/10 font-semibold" : ""
                    }`}
                  >
                    <span className="truncate">{company.name}</span>
                    <span className="text-[11px] uppercase tracking-wide text-white/70">
                      {company.role}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
