import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import {
  buildContextSummary,
  inferLaneFromContext,
  sanitizeVisitHistory,
} from "@/lib/concierge/context";
import {
  getConciergeThread,
  getConciergeUser,
  saveConciergeThread,
  saveConciergeUser,
} from "@/lib/concierge/storage";
import {
  inferLeadFromConversation,
  mergeLeadProfiles,
} from "@/lib/concierge/lead";
import type {
  ConciergeAttachment,
  ConciergeContext,
  ConciergeLead,
  ConciergeMessage,
  ConciergeThread,
  ConciergeUser,
} from "@/lib/concierge/types";

export const runtime = "edge";

const SYSTEM_PROMPT = `You are the site concierge for Max Petrusenko.

Voice:
- gentle
- humble
- grounded
- concise
- informed without being showy

Primary job:
- help visitors understand Max's work
- answer useful questions
- route them gently toward the right next step
- help the right people move toward a remote call, WhatsApp conversation, or booking path when there is clear intent

Lanes:
1. Somatic: tantra, somatic work, nervous system regulation, boundaries, sessions
2. Tech: AI automation, agent systems, product engineering, consulting
3. Bridge: consciousness, meditation, philosophy, flow, contemplative technology

Operating rules:
- educate first, then guide
- do not act like a research tool
- do not over-answer when one clear paragraph and one clarifying question would do
- avoid hype, guru language, and certainty theater
- after helping, offer one practical next step when it fits
- if the visitor is clearly exploring a service, help qualify gently
- when buying or booking intent is clear, ask for the smallest missing detail that helps follow-up: name, email or WhatsApp, timezone, company, or use case
- capture details lightly inside the conversation instead of dropping into a long intake form
- if they are just browsing ideas, stay light and useful
- do not offer in-person meetings
- Max only does remote intro calls and remote qualification conversations through phone, Zoom, WhatsApp, or email
- when someone is ready to continue, prefer one clear remote CTA over multiple options

Safety:
- tantra and somatic work must be framed as professional, consent-led, boundaries-first, and non-sexual-services
- do not present this as medical, psychiatric, legal, or crisis support
- if someone sounds in crisis, unstable, or asks for medical/trauma emergency guidance, respond briefly, set boundaries, and suggest appropriate in-person professional support
- if someone sexualizes the somatic work, correct the frame and refuse to continue in that direction

Style:
- short paragraphs
- plain language
- warm, not salesy
- never mention model names or provider fallback
- never say you are a research assistant`;

interface RequestBody {
  messages: ConciergeMessage[];
  turnstileToken?: string;
  threadId?: string;
  visitorId?: string;
  context?: ConciergeContext;
}

interface ModelProvider {
  name: string;
  baseUrl: string;
  model: string;
  apiKeyEnv: string;
}

interface KvStore {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
}

const PROVIDERS: ModelProvider[] = [
  {
    name: "GPT-5 Mini",
    baseUrl: "https://api.openai.com/v1/responses",
    model: "gpt-5-mini",
    apiKeyEnv: "OPENAI_API_KEY",
  },
];

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const RATE_LIMIT_PREFIX = "concierge:rate:";
const ALERT_COOLDOWN_KEY = "concierge:alert-cooldown";
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
const MAX_MESSAGE_COUNT = 12;
const MAX_MESSAGE_CHARS = 1200;
const MAX_TOTAL_TEXT_CHARS = 12_000;
const MAX_ATTACHMENT_DATA_URL_CHARS = 450_000;
const MAX_TOTAL_ATTACHMENT_CHARS = 900_000;
const ipTimestamps = new Map<string, number[]>();
let lastAlertAt = 0;

function getCloudflareEnv(): CloudflareEnv | null {
  try {
    return getRequestContext().env as CloudflareEnv;
  } catch {
    return null;
  }
}

function getEnvValue(key: string): string | null {
  const env = getCloudflareEnv();
  const value = env?.[key as keyof CloudflareEnv];
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  const nodeValue = process.env[key];
  return nodeValue?.trim() ? nodeValue : null;
}

function getRateLimitKv(): KvStore | null {
  const env = getCloudflareEnv();
  return (env?.AI_RATE_LIMITS ?? null) as KvStore | null;
}

function isRateLimitedInMemory(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipTimestamps.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return true;
  recent.push(now);
  ipTimestamps.set(ip, recent);
  return false;
}

async function isRateLimited(ip: string): Promise<boolean> {
  const kv = getRateLimitKv();
  if (!kv) {
    return isRateLimitedInMemory(ip);
  }

  const now = Date.now();
  const key = `${RATE_LIMIT_PREFIX}${ip}`;
  const raw = await kv.get(key);

  let state: { count: number; resetAt: number } | null = null;
  if (raw) {
    try {
      state = JSON.parse(raw) as { count: number; resetAt: number };
    } catch {
      state = null;
    }
  }

  if (!state || state.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    await kv.put(
      key,
      JSON.stringify({ count: 1, resetAt }),
      { expirationTtl: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) }
    );
    return false;
  }

  if (state.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  state.count += 1;
  await kv.put(key, JSON.stringify(state), {
    expirationTtl: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
  });
  return false;
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = getEnvValue("TURNSTILE_SECRET_KEY");
  if (!secret) return true;

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  formData.append("remoteip", ip);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) return false;
  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

function parseCooldownTimestamp(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

async function sendAlert(subject: string, body: string): Promise<void> {
  const now = Date.now();
  const kv = getRateLimitKv();

  if (kv) {
    const raw = await kv.get(ALERT_COOLDOWN_KEY);
    const lastKv = parseCooldownTimestamp(raw);
    if (lastKv !== null && now - lastKv < ALERT_COOLDOWN_MS) {
      lastAlertAt = lastKv;
      return;
    }
  } else if (now - lastAlertAt < ALERT_COOLDOWN_MS) {
    return;
  }

  lastAlertAt = now;
  if (kv) {
    await kv.put(ALERT_COOLDOWN_KEY, String(now), {
      expirationTtl: Math.ceil(ALERT_COOLDOWN_MS / 1000),
    });
  }

  const resendKey = getEnvValue("RESEND_API_KEY");
  if (!resendKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "alerts@maxpetrusenko.com",
        to: "max.petrusenko@gmail.com",
        subject: `[Concierge API] ${subject}`,
        text: `${body}\n\nTimestamp: ${new Date().toISOString()}`,
      }),
    });
  } catch (error) {
    console.error("[concierge] alert failed", error);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithBackoff(
  provider: ModelProvider,
  body: unknown,
  maxRetries = 3
): Promise<Response | null> {
  const apiKey = getEnvValue(provider.apiKeyEnv);
  if (!apiKey) return null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(provider.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (response.ok || (response.status >= 400 && response.status !== 429)) {
      return response;
    }

    if (response.status === 429 && attempt < maxRetries) {
      const delay = Math.min(1000 * 2 ** attempt, 8000);
      await sleep(delay);
      continue;
    }

    return response;
  }

  return null;
}

function sanitizeMessages(messages: ConciergeMessage[]): ConciergeMessage[] {
  const trimmed = messages.slice(-MAX_MESSAGE_COUNT).map((message) => ({
    role: (message.role === "assistant" ? "assistant" : "user") as
      | "assistant"
      | "user",
    content: String(message.content ?? "").trim().slice(0, MAX_MESSAGE_CHARS),
    createdAt: message.createdAt,
    attachments: Array.isArray(message.attachments)
      ? message.attachments
          .filter(
            (attachment): attachment is ConciergeAttachment =>
              attachment?.kind === "image" &&
              typeof attachment.dataUrl === "string" &&
              attachment.dataUrl.startsWith("data:image/") &&
              typeof attachment.name === "string"
          )
          .slice(0, 3)
          .map((attachment) => ({
            id:
              typeof attachment.id === "string" && attachment.id
                ? attachment.id
                : crypto.randomUUID(),
            kind: "image" as const,
            name: attachment.name.slice(0, 120),
            mimeType: attachment.mimeType.slice(0, 120),
            dataUrl: attachment.dataUrl.slice(0, MAX_ATTACHMENT_DATA_URL_CHARS),
          }))
      : undefined,
  }));

  const totalText = trimmed.reduce(
    (sum, message) => sum + message.content.length,
    0
  );
  const totalAttachmentChars = trimmed.reduce(
    (sum, message) =>
      sum +
      (message.attachments?.reduce(
        (attachmentSum, attachment) => attachmentSum + attachment.dataUrl.length,
        0
      ) ?? 0),
    0
  );

  if (totalText > MAX_TOTAL_TEXT_CHARS) {
    throw new Error("Message text is too large.");
  }

  if (totalAttachmentChars > MAX_TOTAL_ATTACHMENT_CHARS) {
    throw new Error("Attached images are too large. Try one smaller image.");
  }

  return trimmed.filter(
    (message) =>
      message.content.length > 0 ||
      Boolean(message.attachments && message.attachments.length > 0)
  );
}

function extractMessage(data: Record<string, unknown>): string | null {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data.output) ? data.output : [];
  const text = output
    .flatMap((item) =>
      Array.isArray((item as { content?: unknown[] }).content)
        ? ((item as { content: unknown[] }).content ?? [])
        : []
    )
    .map((part) =>
      typeof (part as { text?: unknown }).text === "string"
        ? ((part as { text: string }).text ?? "")
        : ""
    )
    .join("")
    .trim();

  return text || null;
}

function formatAttachmentNote(attachments?: ConciergeAttachment[]): string {
  if (!attachments || attachments.length === 0) return "";
  const names = attachments.map((attachment) => attachment.name).join(", ");
  return `\nAttached image${attachments.length > 1 ? "s" : ""}: ${names}`;
}

function summarizeThread(messages: ConciergeMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  return firstUser?.content.slice(0, 140) || "New concierge conversation";
}

function buildFallbackReply(params: {
  lane: ConciergeThread["lane"];
  context: ConciergeContext;
  messages: ConciergeMessage[];
}): string {
  const lastUserMessage = [...params.messages]
    .reverse()
    .find((message) => message.role === "user");
  const text = lastUserMessage?.content.toLowerCase() ?? "";
  const hasImage = Boolean(lastUserMessage?.attachments?.length);

  if (params.lane === "somatic") {
    if (text.includes("book") || text.includes("session")) {
      return "I can help with that. Max's somatic work is slow, consent-led, and boundaries-first. If you want, tell me what you are seeking, your time zone, and the best way to reach you, and I can guide you to the clearest remote next step.";
    }

    return `You are in the right place. Max's somatic work is professional, grounded, and paced carefully around boundaries and consent.${hasImage ? " I can also use the image you shared as context." : ""} If you want, tell me whether you are curious about sessions, fit, or practical details, and I will keep it simple.`;
  }

  if (params.lane === "tech") {
    return `Happy to help.${hasImage ? " I can use the image you shared as context." : ""} Max usually works best on clear automation, agent, and product-engineering problems. If you tell me the use case, current stack, and where things are stuck, I can suggest the most sensible next step.`;
  }

  if (params.lane === "bridge") {
    return `There is a real bridge here between practice and engineering.${hasImage ? " I can use the image you shared as context too." : ""} If you tell me what pulled you in, I can answer lightly and point you toward the most relevant page, conversation, or next step.`;
  }

  return "You can start anywhere. Tell me what brought you here, and I will help you find the right angle, page, or next conversation without making it heavy.";
}

async function persistThread(params: {
  threadId: string;
  priorThread: ConciergeThread | null;
  visitorId: string;
  lane: ConciergeThread["lane"];
  context: ConciergeContext;
  messages: ConciergeMessage[];
  lead: ConciergeLead;
}): Promise<void> {
  const history = sanitizeVisitHistory(params.context.history);
  const now = new Date().toISOString();
  const thread: ConciergeThread = {
    id: params.threadId,
    visitorId: params.visitorId,
    lane: params.lane,
    createdAt: params.priorThread?.createdAt ?? now,
    updatedAt: now,
    pathname: params.context.pathname,
    title: params.context.title,
    summary: params.lead.insight.summary || summarizeThread(params.messages),
    lead: params.lead,
    crm: params.priorThread?.crm ?? null,
    proactivePrompt: params.context.proactivePrompt ?? null,
    history,
    messages: params.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt ?? now,
      attachments: message.attachments,
    })),
  };

  await saveConciergeThread(thread);

  const existingUser = await getConciergeUser(params.visitorId);
  const user: ConciergeUser = {
    id: params.visitorId,
    createdAt: existingUser?.createdAt ?? now,
    updatedAt: now,
    lastSeenAt: now,
    lastPathname: params.context.pathname,
    lastTitle: params.context.title,
    profile: mergeLeadProfiles(existingUser?.profile, params.lead.profile),
    threadIds: [
      params.threadId,
      ...(existingUser?.threadIds ?? []).filter((id) => id !== params.threadId),
    ].slice(0, 50),
  };
  await saveConciergeUser(user);
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const body = (await request.json()) as RequestBody;
    const context: ConciergeContext = {
      pathname:
        typeof body.context?.pathname === "string" && body.context.pathname
          ? body.context.pathname
          : "/",
      title:
        typeof body.context?.title === "string" ? body.context.title.slice(0, 180) : undefined,
      history: sanitizeVisitHistory(body.context?.history),
      proactivePrompt:
        typeof body.context?.proactivePrompt === "string"
          ? body.context.proactivePrompt.slice(0, 240)
          : null,
    };

    const messages = sanitizeMessages(Array.isArray(body.messages) ? body.messages : []);
    if (messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    if (await isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const turnstileToken = body.turnstileToken?.trim() ?? "";
    if (getEnvValue("TURNSTILE_SECRET_KEY")) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: "Captcha verification is required." },
          { status: 400 }
        );
      }

      const turnstileOk = await verifyTurnstile(turnstileToken, ip);
      if (!turnstileOk) {
        return NextResponse.json(
          { error: "Captcha verification failed." },
          { status: 400 }
        );
      }
    }

    const threadId =
      typeof body.threadId === "string" && body.threadId.trim()
        ? body.threadId.trim()
        : crypto.randomUUID();
    const visitorId =
      typeof body.visitorId === "string" && body.visitorId.trim()
        ? body.visitorId.trim()
        : crypto.randomUUID();
    const priorThread = await getConciergeThread(threadId);
    const existingUser = await getConciergeUser(visitorId);
    const lane = inferLaneFromContext(context);
    const contextSummary = buildContextSummary(context);

    const responseInput = messages.map((message) => {
      if (message.attachments && message.attachments.length > 0) {
        return {
          role: message.role,
          content: [
            ...(message.content
              ? [{ type: "input_text", text: message.content }]
              : [
                  {
                    type: "input_text",
                    text: "The visitor attached image context for this message.",
                  },
                ]),
            ...message.attachments.map((attachment) => ({
              type: "input_image",
              image_url: attachment.dataUrl,
            })),
          ],
        };
      }

      return {
        role: message.role,
        content: `${message.content}${formatAttachmentNote(message.attachments)}`,
      };
    });

    for (const provider of PROVIDERS) {
      const apiKey = getEnvValue(provider.apiKeyEnv);
      if (!apiKey) continue;

      const requestBody = {
        model: provider.model,
        instructions: `${SYSTEM_PROMPT}\n\nVisitor context:\n${contextSummary}\n\nCurrent lane: ${lane}`,
        input: responseInput,
        text: {
          verbosity: "low",
        },
      };

      const response = await callWithBackoff(provider, requestBody);
      if (!response) continue;

      if (!response.ok) {
        const errorText = await response.text().catch(() => "unknown error");
        if (response.status === 401 || response.status === 403) {
          void sendAlert(
            `${provider.name} auth failed (${response.status})`,
            errorText.slice(0, 500)
          );
        }
        continue;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const assistantMessage = extractMessage(data);
      if (!assistantMessage) continue;

      const savedMessages: ConciergeMessage[] = [
        ...messages,
        {
          role: "assistant",
          content: assistantMessage,
          createdAt: new Date().toISOString(),
        },
      ];
      const lead = inferLeadFromConversation({
        messages: savedMessages,
        lane,
        context,
        existingProfile: mergeLeadProfiles(
          existingUser?.profile,
          priorThread?.lead?.profile
        ),
      });

      await persistThread({
        threadId,
        priorThread,
        visitorId,
        lane,
        context,
        messages: savedMessages,
        lead,
      });

      return NextResponse.json({
        threadId,
        visitorId,
        lane,
        provider: provider.name,
        message: assistantMessage,
      });
    }

    const fallbackMessage = buildFallbackReply({
      lane,
      context,
      messages,
    });
    const savedMessages: ConciergeMessage[] = [
      ...messages,
      {
        role: "assistant",
        content: fallbackMessage,
        createdAt: new Date().toISOString(),
      },
    ];
    const lead = inferLeadFromConversation({
      messages: savedMessages,
      lane,
      context,
      existingProfile: mergeLeadProfiles(
        existingUser?.profile,
        priorThread?.lead?.profile
      ),
    });

    await persistThread({
      threadId,
      priorThread,
      visitorId,
      lane,
      context,
      messages: savedMessages,
      lead,
    });

    void sendAlert(
      "Concierge provider fallback used",
      "Every configured provider failed or was unavailable for the concierge endpoint."
    );
    return NextResponse.json({
      threadId,
      visitorId,
      lane,
      provider: "fallback",
      message: fallbackMessage,
    });
  } catch (error) {
    console.error("[concierge] unhandled error", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
