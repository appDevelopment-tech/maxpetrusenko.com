import { redirect } from "next/navigation";
import { WorkspaceDashboard } from "@/components/workspace/WorkspaceDashboard";
import { loadWorkspaceDashboard } from "@/lib/workspace/data";

export const runtime = "edge";

export const metadata = {
  title: "Workspace",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WorkspacePage() {
  const state = await loadWorkspaceDashboard();

  if (state.kind === "missing-config") {
    redirect("/workspace/sign-in?error=missing-config");
  }

  if (state.kind === "unauthenticated") {
    redirect("/workspace/sign-in");
  }

  if (state.kind === "unauthorized") {
    redirect("/workspace/sign-in?error=unauthorized");
  }

  return <WorkspaceDashboard state={state} />;
}
