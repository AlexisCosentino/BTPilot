import "server-only";

import { supabaseAdmin, type Database } from "./supabaseAdmin";

const ALLOWED_ROLES = ["owner", "admin", "member"] as const;

export type MembershipRole = (typeof ALLOWED_ROLES)[number];

export type UserCompany = Database["public"]["Tables"]["companies"]["Row"] & {
  role: MembershipRole;
};

type MembershipWithCompany = Database["public"]["Tables"]["company_members"]["Row"] & {
  companies: Database["public"]["Tables"]["companies"]["Row"] | null;
};

function isAllowedRole(role: string | null | undefined): role is MembershipRole {
  return ALLOWED_ROLES.includes(role as MembershipRole);
}

export async function getUserCompanies(userId: string): Promise<UserCompany[]> {
  if (!userId) {
    throw new Error("User id is required");
  }

  const { data, error } = await supabaseAdmin
    .from("company_members")
    .select(
      `
        role,
        companies:company_id (
          id,
          name,
          owner_user_id,
          metadata,
          created_at,
          updated_at
        )
      `
    )
    .eq("user_id", userId)
    .in("role", [...ALLOWED_ROLES])
    .order("created_at", { ascending: true })
    .returns<MembershipWithCompany[]>();

  if (error) {
    throw new Error(`Failed to fetch user companies: ${error.message}`);
  }

  const memberships = data ?? [];

  return memberships
    .map((membership) => {
      if (!membership.companies || !isAllowedRole(membership.role)) {
        return null;
      }

      return {
        ...membership.companies,
        role: membership.role
      };
    })
    .filter((company): company is UserCompany => Boolean(company));
}
