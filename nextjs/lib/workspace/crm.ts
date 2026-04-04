import type { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveLeadStage } from "@/lib/concierge/lead";
import { listConciergeThreads } from "@/lib/concierge/storage";
import type { ConciergeThread } from "@/lib/concierge/types";
import {
  WORKSPACE_PEOPLE_TABLE,
  WORKSPACE_TOUCHPOINTS_TABLE,
} from "./schema";

interface WorkspacePersonRecord {
  id: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  source: string | null;
  source_ref: string | null;
  status: string | null;
  notes: string | null;
}

export interface WorkspaceTouchpointRecord {
  id: string;
  person_id: string | null;
  source: string;
  channel: string;
  summary: string;
  content_preview: string | null;
  lane: string | null;
  pathname: string | null;
  title: string | null;
  intent: string | null;
  stage: string | null;
  score: number | null;
  owner: string | null;
  touched_at: string | null;
  updated_at: string | null;
  follow_up_at: string | null;
  last_contact_at: string | null;
  people?: {
    name: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

function cleanText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizePhone(value?: string | null): string | null {
  const digits = (value ?? "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function buildVisitorName(thread: ConciergeThread): string {
  return (
    cleanText(thread.lead?.profile.name) ??
    `Visitor ${thread.visitorId?.slice(0, 8) ?? thread.id.slice(0, 8)}`
  );
}

async function findWorkspacePerson(
  supabase: SupabaseClient,
  params: {
    source: string;
    sourceRef: string;
    email: string | null;
    phone: string | null;
  }
): Promise<WorkspacePersonRecord | null> {
  const bySource = await supabase
    .from(WORKSPACE_PEOPLE_TABLE)
    .select("id, email, phone, whatsapp_number, source, source_ref, status, notes")
    .eq("source", params.source)
    .eq("source_ref", params.sourceRef)
    .maybeSingle();

  if (bySource.data) return bySource.data as WorkspacePersonRecord;

  if (params.email) {
    const byEmail = await supabase
      .from(WORKSPACE_PEOPLE_TABLE)
      .select("id, email, phone, whatsapp_number, source, source_ref, status, notes")
      .ilike("email", params.email)
      .limit(1)
      .maybeSingle();

    if (byEmail.data) return byEmail.data as WorkspacePersonRecord;
  }

  if (params.phone) {
    const byPhone = await supabase
      .from(WORKSPACE_PEOPLE_TABLE)
      .select("id, email, phone, whatsapp_number, source, source_ref, status, notes")
      .eq("phone", params.phone)
      .limit(1)
      .maybeSingle();

    if (byPhone.data) return byPhone.data as WorkspacePersonRecord;

    const byWhatsapp = await supabase
      .from(WORKSPACE_PEOPLE_TABLE)
      .select("id, email, phone, whatsapp_number, source, source_ref, status, notes")
      .eq("whatsapp_number", params.phone)
      .limit(1)
      .maybeSingle();

    if (byWhatsapp.data) return byWhatsapp.data as WorkspacePersonRecord;
  }

  return null;
}

async function upsertConciergeThread(
  supabase: SupabaseClient,
  thread: ConciergeThread
): Promise<void> {
  const email = cleanText(thread.lead?.profile.email);
  const phone = normalizePhone(thread.lead?.profile.phone);
  const website = cleanText(thread.lead?.profile.website);
  const timezone = cleanText(thread.lead?.profile.timezone);
  const preferredContactMethod = cleanText(
    thread.lead?.profile.preferredContactMethod ?? null
  );
  const stage = getEffectiveLeadStage(thread);
  const score = thread.lead?.insight.score ?? 0;
  const owner = cleanText(thread.crm?.owner);
  const followUpAt = cleanText(thread.crm?.followUpAt);
  const lastContactAt = cleanText(thread.crm?.lastContactAt);
  const intent = cleanText(thread.lead?.insight.intentLabel);
  const notes = cleanText(thread.crm?.notes) ?? cleanText(thread.lead?.insight.nextStep);
  const company = cleanText(thread.lead?.profile.company);
  const pathname = cleanText(thread.pathname);
  const title = cleanText(thread.title);
  const sourceRef = thread.id;

  const existing = await findWorkspacePerson(supabase, {
    source: "concierge",
    sourceRef,
    email,
    phone,
  });

  const payload = {
    name: buildVisitorName(thread),
    email,
    phone,
    whatsapp_number:
      preferredContactMethod === "whatsapp" ? phone : existing?.whatsapp_number ?? null,
    company,
    role: thread.lane,
    team_name: null,
    website,
    timezone,
    preferred_contact_method: preferredContactMethod,
    source: "concierge",
    source_ref: sourceRef,
    lane: thread.lane,
    intent,
    score,
    owner,
    follow_up_at: followUpAt,
    last_contact_at: lastContactAt,
    status: stage ?? existing?.status ?? "active",
    notes,
    last_touch_at: thread.updatedAt,
    metadata: {
      visitorId: thread.visitorId ?? null,
      pathname,
      title,
      tags: thread.lead?.insight.tags ?? [],
    },
  };

  let personId = existing?.id ?? null;

  if (personId) {
    const { data } = await supabase
      .from(WORKSPACE_PEOPLE_TABLE)
      .update(payload)
      .eq("id", personId)
      .select("id")
      .single();
    personId = data?.id ?? personId;
  } else {
    const { data } = await supabase
      .from(WORKSPACE_PEOPLE_TABLE)
      .insert(payload)
      .select("id")
      .single();
    personId = data?.id ?? null;
  }

  await supabase.from(WORKSPACE_TOUCHPOINTS_TABLE).upsert(
    {
      person_id: personId,
      source: "concierge",
      source_ref: sourceRef,
      channel: "site-chat",
      direction: "inbound",
      summary: thread.summary,
      content_preview: cleanText(
        thread.messages
          .slice(-3)
          .map((message) => `${message.role}: ${message.content}`)
          .join("\n")
          .slice(0, 600)
      ),
      lane: thread.lane,
      pathname,
      title,
      intent,
      stage,
      score,
      owner,
      follow_up_at: followUpAt,
      last_contact_at: lastContactAt,
      touched_at: thread.updatedAt,
      updated_at: new Date().toISOString(),
      metadata: {
        threadId: thread.id,
        proactivePrompt: thread.proactivePrompt ?? null,
        tags: thread.lead?.insight.tags ?? [],
      },
    },
    { onConflict: "source,source_ref" }
  );
}

export async function syncConciergeToWorkspace(
  supabase: SupabaseClient
): Promise<void> {
  const threads = await listConciergeThreads(80).catch(() => []);
  for (const thread of threads) {
    await upsertConciergeThread(supabase, thread);
  }
}

export async function listWorkspaceTouchpoints(
  supabase: SupabaseClient,
  limit = 12
): Promise<WorkspaceTouchpointRecord[]> {
  const result = await supabase
    .from(WORKSPACE_TOUCHPOINTS_TABLE)
    .select(
      "id, person_id, source, channel, summary, content_preview, lane, pathname, title, intent, stage, score, owner, touched_at, updated_at, follow_up_at, last_contact_at, people:person_id(name, company, email, phone)"
    )
    .order("touched_at", { ascending: false })
    .limit(limit);

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).map((row) => {
    const people =
      Array.isArray(row.people) && row.people.length > 0
        ? row.people[0]
        : row.people && !Array.isArray(row.people)
          ? row.people
          : null;

    return {
      id: row.id,
      person_id: row.person_id,
      source: row.source,
      channel: row.channel,
      summary: row.summary,
      content_preview: row.content_preview,
      lane: row.lane,
      pathname: row.pathname,
      title: row.title,
      intent: row.intent,
      stage: row.stage,
      score: row.score,
      owner: row.owner,
      touched_at: row.touched_at,
      updated_at: row.updated_at,
      follow_up_at: row.follow_up_at,
      last_contact_at: row.last_contact_at,
      people: people
        ? {
            name: people.name ?? null,
            company: people.company ?? null,
            email: people.email ?? null,
            phone: people.phone ?? null,
          }
        : null,
    } satisfies WorkspaceTouchpointRecord;
  });
}
