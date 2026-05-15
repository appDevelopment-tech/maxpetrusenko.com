import { NextResponse } from "next/server";

export const runtime = "edge";

const HERMES_WHATSAPP_NUMBER = "19542759666";
const HERMES_WHATSAPP_URL = `https://wa.me/${HERMES_WHATSAPP_NUMBER}`;

type IntakeContact = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  method?: unknown;
};

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function line(label: string, value: unknown, max?: number): string | null {
  const text = clean(value, max);
  return text ? `${label}: ${text}` : null;
}

function buildHandoffText(body: Record<string, unknown>): string {
  const questionnaire =
    body.questionnaire && typeof body.questionnaire === "object"
      ? (body.questionnaire as Record<string, unknown>)
      : {};
  const contact =
    body.contact && typeof body.contact === "object"
      ? (body.contact as IntakeContact)
      : {};

  const parts = [
    "New tantra/somatic future-fit inquiry from maxpetrusenko.com",
    line("Name", contact.name ?? questionnaire.name, 120),
    line("Visitor WhatsApp/phone", contact.phone ?? questionnaire.phone, 80),
    line("Email", contact.email ?? questionnaire.email, 160),
    line("Preferred reply", contact.method ?? questionnaire.contactMethod, 80),
    line("Where they want a session", body.location ?? questionnaire.location, 180),
    line("Preferred timing", body.preferredTiming ?? questionnaire.preferredTiming ?? questionnaire.requestedWindow, 180),
    line("Intention", body.intention ?? questionnaire.intention, 700),
    line("What feels blocked/important", body.blocker ?? questionnaire.blocker, 700),
    line("Expectation", body.expectations ?? questionnaire.expectations, 700),
    line("Inquiry type", body.serviceType ?? questionnaire.serviceType, 80),
    line("Practitioner preference", body.practitionerPreference ?? questionnaire.practitionerPreference, 80),
    line("Original message", body.initialMessage, 500),
    line("Page", body.pathname, 180),
  ].filter((item): item is string => Boolean(item));

  return parts.join("\n");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const handoffText = buildHandoffText(body);
  const url = new URL(HERMES_WHATSAPP_URL);
  url.searchParams.set("text", handoffText);

  return NextResponse.json(
    {
      nextStep: "handoff",
      message:
        "Thanks. I’ve prepared the context for Max’s Hermes assistant on WhatsApp. Send the message there so it can route the inquiry without showing public calendar slots.",
      handoffUrl: url.toString(),
      handoffText,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
