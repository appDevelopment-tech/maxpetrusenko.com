import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/workspace/GoogleSignInButton";
import { WorkspaceUnauthorizedSessionReset } from "@/components/workspace/UnauthorizedSessionReset";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceAccessCheck } from "@/lib/workspace/access";

export const metadata = {
  title: "Workspace Sign In",
  robots: {
    index: false,
    follow: false,
  },
};

interface WorkspaceSignInPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function WorkspaceSignInPage({
  searchParams,
}: WorkspaceSignInPageProps) {
  let shouldResetSession = false;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = await getWorkspaceAccessCheck(supabase, user?.email);
    if (access.allowed) {
      redirect("/workspace");
    }

    if (user) {
      shouldResetSession = true;
    }
  }

  const params = searchParams ? await searchParams : undefined;
  const authErrorCode = params?.error ?? null;

  return (
    <div className="relative isolate min-h-[calc(100vh-8rem)] overflow-hidden bg-[#f2ecdf]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,126,67,0.2),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(14,96,108,0.18),transparent_24%),linear-gradient(180deg,#f2ecdf_0%,#e8dcc6_100%)]" />
      <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-[#d86d36]/20 blur-3xl" />
      <div className="absolute right-[-6rem] top-12 h-72 w-72 rounded-full bg-[#0c5f6b]/18 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center justify-center px-4 py-8 md:px-6 md:py-12">
        <section className="w-full max-w-md rounded-[32px] bg-[#221a16] p-6 text-[#f6ecdc] shadow-[0_16px_40px_rgba(34,26,22,0.18)] md:p-7">
          {shouldResetSession ? <WorkspaceUnauthorizedSessionReset /> : null}
          {isSupabaseConfigured() ? (
            <GoogleSignInButton initialErrorCode={authErrorCode} />
          ) : (
            <div className="rounded-[22px] border border-[#d86d36]/24 bg-[#352720] p-4 text-sm leading-7 text-[#ffd7bf]">
              Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
