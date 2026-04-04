import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkspaceAccessCheck } from "@/lib/workspace/access";
import { syncConciergeToWorkspace } from "@/lib/workspace/crm";

export const runtime = "edge";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getWorkspaceAccessCheck(supabase, user.email);
  if (!access.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await syncConciergeToWorkspace(supabase);
  return NextResponse.json({ ok: true });
}
