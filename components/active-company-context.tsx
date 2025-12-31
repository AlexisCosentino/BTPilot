"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useRouter } from "next/navigation";

type Company = {
  id: string;
  name: string;
  owner_user_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  role: "owner" | "admin" | "member";
};

type ActiveCompanyContextValue = {
  companies: Company[];
  activeCompanyId: string | null;
  loading: boolean;
  error: string | null;
  setActiveCompany: (companyId: string | null) => void;
  addCompany: (company: Company) => void;
  refreshCompanies: () => Promise<void>;
};

const ActiveCompanyContext = createContext<ActiveCompanyContextValue | undefined>(undefined);

const STORAGE_KEY = "btpilot:active-company-id";

async function fetchCompanies(): Promise<Company[]> {
  const response = await fetch("/api/companies", { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Chargement des entreprises impossible.");
  }
  const body = (await response.json().catch(() => ({}))) as { companies?: Company[] };
  return Array.isArray(body.companies) ? body.companies : [];
}

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialised = useRef(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await fetchCompanies();
      const storedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

      setCompanies((prev) => {
        const mergedMap = new Map<string, Company>();
        prev.forEach((company) => mergedMap.set(company.id, company));
        list.forEach((company) => mergedMap.set(company.id, company));
        const merged = Array.from(mergedMap.values());

        const nextActive =
          (storedId && merged.some((company) => company.id === storedId) && storedId) ||
          merged[0]?.id ||
          null;

        setActiveCompanyId(nextActive);
        return merged;
      });
    } catch (err) {
      console.error("[companies] Failed to load", err);
      setCompanies([]);
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setActiveCompanyId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    void loadCompanies();
  }, [loadCompanies]);

  const setActiveCompany = useCallback(
    (companyId: string | null) => {
      setActiveCompanyId(companyId);
      if (typeof window !== "undefined") {
        if (companyId) {
          localStorage.setItem(STORAGE_KEY, companyId);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        window.dispatchEvent(new Event("btpilot-active-company-changed"));
      }
      router.refresh();
    },
    [router]
  );

  const value = useMemo<ActiveCompanyContextValue>(
    () => ({
      companies,
      activeCompanyId,
      loading,
      error,
      setActiveCompany,
      addCompany: (company: Company) =>
        setCompanies((prev) => {
          const exists = prev.some((item) => item.id === company.id);
          return exists ? prev : [...prev, company];
        }),
      refreshCompanies: loadCompanies
    }),
    [companies, activeCompanyId, loading, error, setActiveCompany, loadCompanies]
  );

  return <ActiveCompanyContext.Provider value={value}>{children}</ActiveCompanyContext.Provider>;
}

export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext);

  if (!ctx) {
    throw new Error("useActiveCompany must be used within ActiveCompanyProvider");
  }

  return ctx;
}
