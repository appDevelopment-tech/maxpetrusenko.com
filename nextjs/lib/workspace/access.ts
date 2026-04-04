import type { SupabaseClient } from "@supabase/supabase-js";
import { isWorkspaceUserAllowed } from "@/lib/supabase/config";
import { WORKSPACE_MEMBERS_TABLE } from "./schema";

export interface WorkspaceAccessCheck {
  allowed: boolean;
  email: string | null;
  role: string | null;
  diagnostics: string[];
}

export async function getWorkspaceAccessCheck(
  supabase: SupabaseClient,
  email?: string | null
): Promise<WorkspaceAccessCheck> {
  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  if (!normalizedEmail || !isWorkspaceUserAllowed(normalizedEmail)) {
    return {
      allowed: false,
      email: normalizedEmail,
      role: null,
      diagnostics: [],
    };
  }

  const membershipResult = await supabase
    .from(WORKSPACE_MEMBERS_TABLE)
    .select("email, role")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (membershipResult.error) {
    return {
      allowed: false,
      email: normalizedEmail,
      role: null,
      diagnostics: [`Membership query: ${membershipResult.error.message}`],
    };
  }

  return {
    allowed: Boolean(membershipResult.data),
    email: normalizedEmail,
    role: membershipResult.data?.role ?? null,
    diagnostics: [],
  };
}
