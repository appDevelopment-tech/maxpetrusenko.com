import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/concierge/auth";
import { normalizeCrmState } from "@/lib/concierge/lead";
import {
  getConciergeThread,
  saveConciergeThread,
} from "@/lib/concierge/storage";
import type {
  ConciergeCrmState,
  ConciergeLeadStage,
} from "@/lib/concierge/types";

export const runtime = "edge";

interface UpdateThreadBody {
  crm?: Partial<ConciergeCrmState>;
}

const ALLOWED_STAGES = new Set<ConciergeLeadStage>([
  "new",
  "captured",
  "qualified",
  "follow_up",
  "archived",
]);

function sanitizeStage(value: unknown): ConciergeLeadStage | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  return ALLOWED_STAGES.has(value as ConciergeLeadStage)
    ? (value as ConciergeLeadStage)
    : undefined;
}

function sanitizeText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  const authorized = await isAdminRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await context.params;
  const thread = await getConciergeThread(threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as UpdateThreadBody;
  const crm = body.crm ?? {};

  const nextCrm = normalizeCrmState(thread.crm, {
    stage: sanitizeStage(crm.stage),
    owner: sanitizeText(crm.owner, 120),
    notes: sanitizeText(crm.notes, 2000),
    followUpAt: sanitizeText(crm.followUpAt, 40),
    lastContactAt: sanitizeText(crm.lastContactAt, 40),
    updatedAt: new Date().toISOString(),
  });

  const updatedThread = {
    ...thread,
    crm: nextCrm,
    updatedAt: new Date().toISOString(),
  };

  await saveConciergeThread(updatedThread);
  return NextResponse.json({ thread: updatedThread });
}
