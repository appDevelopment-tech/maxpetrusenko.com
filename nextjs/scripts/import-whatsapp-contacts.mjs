import { execFileSync } from "node:child_process";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
const DEFAULT_DB_PATH =
  process.env.WHATSAPP_DB_PATH?.trim() ??
  "/Users/maxpetrusenko/Desktop/Projects/nanoclaw/store/messages.db";
const PEOPLE_TABLE = "maxpetrusenko_workspace_people";
const TOUCHPOINTS_TABLE = "maxpetrusenko_workspace_touchpoints";

function cleanText(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizePhone(value) {
  const digits = String(value ?? "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function phoneFromJid(jid) {
  const raw = String(jid ?? "").split("@")[0] ?? "";
  return normalizePhone(raw);
}

function runSqliteJson(dbPath, sql) {
  const raw = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
  });
  return raw.trim() ? JSON.parse(raw) : [];
}

async function findPerson(supabase, row) {
  const sourceMatch = await supabase
    .from(PEOPLE_TABLE)
    .select("id, phone, whatsapp_number")
    .eq("source", "whatsapp")
    .eq("source_ref", `whatsapp:${row.jid}`)
    .maybeSingle();

  if (sourceMatch.data) return sourceMatch.data;

  if (row.phone) {
    const phoneMatch = await supabase
      .from(PEOPLE_TABLE)
      .select("id, phone, whatsapp_number")
      .eq("whatsapp_number", row.phone)
      .limit(1)
      .maybeSingle();

    if (phoneMatch.data) return phoneMatch.data;

    const altPhoneMatch = await supabase
      .from(PEOPLE_TABLE)
      .select("id, phone, whatsapp_number")
      .eq("phone", row.phone)
      .limit(1)
      .maybeSingle();

    if (altPhoneMatch.data) return altPhoneMatch.data;
  }

  return null;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const dbPath = process.argv[2] || DEFAULT_DB_PATH;
  const rows = runSqliteJson(
    dbPath,
    `
      select
        c.jid as jid,
        c.name as name,
        c.last_message_time as last_message_time,
        (
          select m.content
          from messages m
          where m.chat_jid = c.jid
          order by m.timestamp desc
          limit 1
        ) as last_content,
        (
          select m.timestamp
          from messages m
          where m.chat_jid = c.jid
          order by m.timestamp desc
          limit 1
        ) as touched_at
      from chats c
      where c.channel = 'whatsapp'
        and coalesce(c.is_group, 0) = 0
        and c.jid not like '__group_sync__'
      order by coalesce(
        (
          select m.timestamp
          from messages m
          where m.chat_jid = c.jid
          order by m.timestamp desc
          limit 1
        ),
        c.last_message_time
      ) desc;
    `
  );

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let imported = 0;

  for (const rawRow of rows) {
    const jid = cleanText(rawRow.jid);
    if (!jid) continue;

    const phone = phoneFromJid(jid);
    const name =
      cleanText(rawRow.name) ??
      (phone ? `WhatsApp ${phone.slice(-4)}` : `WhatsApp ${jid.slice(0, 8)}`);
    const lastTouchAt =
      cleanText(rawRow.touched_at) ??
      cleanText(rawRow.last_message_time) ??
      new Date().toISOString();
    const preview = cleanText(rawRow.last_content)?.slice(0, 600) ?? null;

    const existing = await findPerson(supabase, { jid, phone });
    const personPayload = {
      name,
      phone: existing?.phone ?? phone,
      whatsapp_number: phone,
      preferred_contact_method: "whatsapp",
      source: "whatsapp",
      source_ref: `whatsapp:${jid}`,
      status: "active",
      last_touch_at: lastTouchAt,
      last_contact_at: lastTouchAt,
      metadata: {
        whatsapp_jid: jid,
        imported_from: dbPath,
      },
    };

    let personId = existing?.id ?? null;
    if (personId) {
      const { data, error } = await supabase
        .from(PEOPLE_TABLE)
        .update(personPayload)
        .eq("id", personId)
        .select("id")
        .single();
      if (error) throw error;
      personId = data?.id ?? personId;
    } else {
      const { data, error } = await supabase
        .from(PEOPLE_TABLE)
        .insert(personPayload)
        .select("id")
        .single();
      if (error) throw error;
      personId = data?.id ?? null;
    }

    const { error: touchpointError } = await supabase
      .from(TOUCHPOINTS_TABLE)
      .upsert(
        {
          person_id: personId,
          source: "whatsapp",
          source_ref: `whatsapp:${jid}`,
          channel: "whatsapp",
          direction: "inbound",
          summary: `${name} reached out on WhatsApp`,
          content_preview: preview,
          stage: "active",
          score: 35,
          touched_at: lastTouchAt,
          last_contact_at: lastTouchAt,
          updated_at: new Date().toISOString(),
          metadata: {
            whatsapp_jid: jid,
            imported_from: dbPath,
          },
        },
        { onConflict: "source,source_ref" }
      );

    if (touchpointError) throw touchpointError;
    imported += 1;
  }

  console.log(`Imported ${imported} WhatsApp contacts from ${dbPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
