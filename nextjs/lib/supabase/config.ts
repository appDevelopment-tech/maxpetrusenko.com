const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
} {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  };
}

export function getWorkspaceAllowedEmails(): string[] {
  return (process.env.WORKSPACE_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getWorkspaceAllowedDomains(): string[] {
  return (process.env.WORKSPACE_ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase().replace(/^@+/, ""))
    .filter(Boolean);
}

export function isWorkspaceUserAllowed(email?: string | null): boolean {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const allowlist = getWorkspaceAllowedEmails();
  if (allowlist.includes(normalizedEmail)) {
    return true;
  }

  const allowedDomains = getWorkspaceAllowedDomains();
  if (allowedDomains.length === 0) {
    return allowlist.length === 0;
  }

  const emailDomain = normalizedEmail.split("@")[1] ?? "";
  return allowedDomains.includes(emailDomain);
}

export function getWorkspaceAuthErrorMessage(
  errorCode?: string | null
): string | null {
  switch (errorCode) {
    case "missing-config":
      return "Workspace auth is not configured yet.";
    case "unauthorized":
      return "That Google account is not approved for this private workspace.";
    case "oauth":
      return "Google sign-in did not complete. Try again.";
    default:
      return null;
  }
}
