"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface WorkspaceCrmBootstrapProps {
  enabled: boolean;
}

export function WorkspaceCrmBootstrap({
  enabled,
}: WorkspaceCrmBootstrapProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const key = "mp-workspace-crm-bootstrap";
    if (window.sessionStorage.getItem(key) === "done") {
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const response = await fetch("/api/workspace/sync", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok || cancelled) {
          return;
        }

        window.sessionStorage.setItem(key, "done");
        router.refresh();
      } catch {
        // Keep the page usable even if sync fails.
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, router]);

  return null;
}
