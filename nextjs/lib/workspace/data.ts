import {
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  WorkspaceDashboardState,
  WorkspacePerson,
  WorkspaceSignal,
  WorkspaceTeam,
} from "./types";
import { getWorkspaceAccessCheck } from "./access";
import {
  WORKSPACE_PEOPLE_TABLE,
  WORKSPACE_TOUCHPOINTS_TABLE,
  WORKSPACE_TEAMS_TABLE,
} from "./schema";
import {
  listWorkspaceTouchpoints,
  syncConciergeToWorkspace,
  type WorkspaceTouchpointRecord,
} from "./crm";

interface WorkspacePersonRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  company: string | null;
  role: string | null;
  team_name: string | null;
  website: string | null;
  timezone: string | null;
  preferred_contact_method: string | null;
  source: string | null;
  source_ref: string | null;
  lane: string | null;
  intent: string | null;
  score: number | null;
  owner: string | null;
  follow_up_at: string | null;
  last_contact_at: string | null;
  status: string | null;
  last_touch_at: string | null;
  notes: string | null;
}

interface WorkspaceTeamRow {
  id: string;
  name: string;
  company: string | null;
  focus: string | null;
  status: string | null;
  member_count: number | null;
  last_touch_at: string | null;
}

function normalizePeople(rows: WorkspacePersonRow[] | null): WorkspacePerson[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    company: row.company,
    role: row.role,
    teamName: row.team_name,
    website: row.website,
    timezone: row.timezone,
    preferredContactMethod: row.preferred_contact_method,
    source: row.source,
    sourceRef: row.source_ref,
    lane: row.lane,
    intent: row.intent,
    score: row.score,
    owner: row.owner,
    followUpAt: row.follow_up_at,
    lastContactAt: row.last_contact_at,
    status: row.status,
    lastTouchAt: row.last_touch_at,
    notes: row.notes,
  }));
}

function normalizeTeams(rows: WorkspaceTeamRow[] | null): WorkspaceTeam[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    company: row.company,
    focus: row.focus,
    status: row.status,
    memberCount: row.member_count,
    lastTouchAt: row.last_touch_at,
  }));
}

function normalizeSignals(rows: WorkspaceTouchpointRecord[]): WorkspaceSignal[] {
  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    channel: row.channel,
    lane: row.lane ?? "general",
    summary: row.summary,
    pathname: row.pathname ?? "/",
    updatedAt: row.updated_at ?? row.touched_at ?? new Date().toISOString(),
    touchedAt: row.touched_at,
    title: row.title,
    stage: row.stage,
    score: row.score,
    intent: row.intent,
    contentPreview: row.content_preview,
    contactName: row.people?.name ?? null,
    company: row.people?.company ?? null,
    email: row.people?.email ?? null,
    phone: row.people?.phone ?? null,
    owner: row.owner,
    followUpAt: row.follow_up_at,
  }));
}

export async function loadWorkspaceDashboard(): Promise<WorkspaceDashboardState> {
  if (!isSupabaseConfigured()) {
    return { kind: "missing-config" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { kind: "unauthenticated" };
  }

  const access = await getWorkspaceAccessCheck(supabase, user.email);
  if (!access.allowed) {
    return {
      kind: "unauthorized",
      email: user.email ?? null,
    };
  }

  const diagnostics: string[] = [...access.diagnostics];
  await syncConciergeToWorkspace(supabase).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    diagnostics.push(`Concierge sync: ${message}`);
  });

  const [peopleResult, teamsResult, signalsResult] = await Promise.all([
    supabase
      .from(WORKSPACE_PEOPLE_TABLE)
      .select(
        "id, name, email, phone, whatsapp_number, company, role, team_name, website, timezone, preferred_contact_method, source, source_ref, lane, intent, score, owner, follow_up_at, last_contact_at, status, last_touch_at, notes"
      )
      .order("last_touch_at", { ascending: false })
      .limit(12),
    supabase
      .from(WORKSPACE_TEAMS_TABLE)
      .select("id, name, company, focus, status, member_count, last_touch_at")
      .order("last_touch_at", { ascending: false })
      .limit(12),
    listWorkspaceTouchpoints(supabase, 8).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      diagnostics.push(`Touchpoints query (${WORKSPACE_TOUCHPOINTS_TABLE}): ${message}`);
      return [];
    }),
  ]);

  if (peopleResult.error) {
    diagnostics.push(`People query: ${peopleResult.error.message}`);
  }

  if (teamsResult.error) {
    diagnostics.push(`Teams query: ${teamsResult.error.message}`);
  }

  return {
    kind: "ready",
    userEmail: user.email ?? "authenticated user",
    people: normalizePeople((peopleResult.data ?? null) as WorkspacePersonRow[] | null),
    teams: normalizeTeams((teamsResult.data ?? null) as WorkspaceTeamRow[] | null),
    signals: normalizeSignals(signalsResult),
    diagnostics,
  };
}
