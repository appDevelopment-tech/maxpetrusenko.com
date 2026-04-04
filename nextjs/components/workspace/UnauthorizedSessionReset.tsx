"use client";

import { useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function WorkspaceUnauthorizedSessionReset() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    void supabase.auth.signOut();
  }, [supabase]);

  return null;
}
