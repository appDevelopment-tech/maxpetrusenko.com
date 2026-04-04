import type {
  ConciergeContext,
  ConciergeCrmState,
  ConciergeLane,
  ConciergeLead,
  ConciergeLeadIntent,
  ConciergeLeadStage,
  ConciergeLeadProfile,
  ConciergeMessage,
  ConciergeThread,
} from "./types";

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE =
  /(?:\+?\d[\d\s().-]{7,}\d)/;
const URL_RE =
  /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?\b/i;

const TIMEZONE_PATTERNS = [
  /\b(?:utc|gmt)\s*[+-]?\d{1,2}(?::\d{2})?\b/i,
  /\b(?:pst|pdt|mst|mdt|cst|cdt|est|edt|cet|cest|eet|eest|ist|sgt|aest|aedt)\b/i,
  /\b(?:eastern|central|mountain|pacific)\s+time\b/i,
];

const CONTACT_METHODS = [
  { method: "whatsapp" as const, pattern: /\bwhatsapp\b/i },
  { method: "zoom" as const, pattern: /\bzoom\b/i },
  { method: "phone" as const, pattern: /\b(?:phone|call|sms|text me)\b/i },
  { method: "email" as const, pattern: /\bemail\b/i },
];

function cleanValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed : null;
}

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function pickFirstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return cleanValue(match[0]);
  }

  return null;
}

function extractName(text: string): string | null {
  const patterns = [
    /\bmy name is ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})\b/,
    /\bi am ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})\b/,
    /\bi'm ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})\b/,
    /\bthis is ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return titleCaseName(match[1]);
  }

  return null;
}

function extractCompany(text: string): string | null {
  const patterns = [
    /\b(?:i work at|i'm with|i am with|we are at|we're at|from) ([A-Z][\w&' -]{1,60})/i,
    /\bcompany(?: is|:)? ([A-Z][\w&' -]{1,60})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanValue(match[1]);
  }

  return null;
}

function extractTimeframe(text: string): string | null {
  const patterns = [
    /\b(?:today|tonight|asap|urgent|this week|next week|this month|next month)\b/i,
    /\b(?:within|in)\s+\d+\s+(?:day|days|week|weeks|month|months)\b/i,
    /\bby\s+[A-Z][a-z]+\s+\d{1,2}\b/i,
  ];

  return pickFirstMatch(text, patterns);
}

function extractBudgetSignal(text: string): string | null {
  const patterns = [
    /\$\s?\d[\d,]*(?:\s?-\s?\$?\d[\d,]*)?/,
    /\b\d[\d,]*\s?(?:usd|eur|gbp)\b/i,
    /\b(?:budget|price|pricing|cost|rate|retainer)\b[^.!?\n]{0,80}/i,
  ];

  return pickFirstMatch(text, patterns);
}

function extractDesiredOutcome(texts: string[]): string | null {
  const candidate = texts.find((text) =>
    /\b(?:need|looking for|want to|trying to|would like to|interested in)\b/i.test(
      text
    )
  );

  return cleanValue(candidate?.slice(0, 180) ?? null);
}

function detectIntent(
  lane: ConciergeLane,
  lowerText: string
): { intent: ConciergeLeadIntent; label: string } {
  if (
    /\b(?:price|pricing|cost|rate|budget|quote)\b/.test(lowerText)
  ) {
    return { intent: "pricing", label: "Pricing" };
  }

  if (lane === "somatic") {
    if (/\b(?:book|booking|session|availability|schedule|call)\b/.test(lowerText)) {
      return { intent: "book_session", label: "Book session" };
    }

    if (/\b(?:fit|boundaries|pace|pacing|safe|consent)\b/.test(lowerText)) {
      return { intent: "fit_check", label: "Somatic fit check" };
    }
  }

  if (lane === "tech") {
    if (
      /\b(?:project|automation|agent|consulting|hire|build|implementation|scope)\b/.test(
        lowerText
      )
    ) {
      return { intent: "project_inquiry", label: "Project inquiry" };
    }
  }

  if (lane === "bridge") {
    if (/\b(?:practice|meditation|consciousness|philosophy|bridge)\b/.test(lowerText)) {
      return { intent: "bridge_exploration", label: "Bridge exploration" };
    }
  }

  if (/\b(?:fit|help|question|understand)\b/.test(lowerText)) {
    return { intent: "fit_check", label: "Fit check" };
  }

  return { intent: "general_question", label: "General question" };
}

function detectUrgency(lowerText: string): "low" | "medium" | "high" {
  if (/\b(?:urgent|asap|today|tonight|right away|immediately|this week)\b/.test(lowerText)) {
    return "high";
  }

  if (/\b(?:next week|soon|this month|next month)\b/.test(lowerText)) {
    return "medium";
  }

  return "low";
}

function detectServiceFit(
  lane: ConciergeLane,
  lowerText: string
): "low" | "medium" | "high" {
  if (
    lane === "tech" &&
    /\b(?:automation|ai|agents|workflow|product|engineering|integration)\b/.test(
      lowerText
    )
  ) {
    return "high";
  }

  if (
    lane === "somatic" &&
    /\b(?:session|somatic|boundaries|nervous system|tantra|consent)\b/.test(
      lowerText
    )
  ) {
    return "high";
  }

  if (
    lane === "bridge" &&
    /\b(?:consciousness|meditation|practice|performance)\b/.test(lowerText)
  ) {
    return "medium";
  }

  return "low";
}

function buildTags(params: {
  lane: ConciergeLane;
  lowerText: string;
  hasImages: boolean;
  profile: ConciergeLeadProfile;
  intent: ConciergeLeadIntent;
}): string[] {
  const tags = new Set<string>([params.lane, params.intent]);

  if (params.hasImages) tags.add("image-context");
  if (params.profile.email || params.profile.phone) tags.add("contact-captured");
  if (/\b(?:price|pricing|budget|quote|rate)\b/.test(params.lowerText)) {
    tags.add("pricing");
  }
  if (/\b(?:book|call|schedule|availability|zoom|whatsapp)\b/.test(params.lowerText)) {
    tags.add("handoff-ready");
  }
  if (/\b(?:urgent|asap|this week)\b/.test(params.lowerText)) {
    tags.add("urgent");
  }

  return [...tags];
}

export function mergeLeadProfiles(
  base?: ConciergeLeadProfile | null,
  incoming?: ConciergeLeadProfile | null
): ConciergeLeadProfile {
  return {
    name: incoming?.name ?? base?.name ?? null,
    email: incoming?.email ?? base?.email ?? null,
    phone: incoming?.phone ?? base?.phone ?? null,
    company: incoming?.company ?? base?.company ?? null,
    website: incoming?.website ?? base?.website ?? null,
    timezone: incoming?.timezone ?? base?.timezone ?? null,
    preferredContactMethod:
      incoming?.preferredContactMethod ?? base?.preferredContactMethod ?? null,
  };
}

export function getEffectiveLeadStage(thread: Pick<ConciergeThread, "crm" | "lead">): ConciergeLeadStage | null {
  return thread.crm?.stage ?? thread.lead?.insight.stage ?? null;
}

export function normalizeCrmState(
  base?: ConciergeCrmState | null,
  incoming?: Partial<ConciergeCrmState> | null
): ConciergeCrmState | null {
  const next = {
    stage: incoming?.stage ?? base?.stage ?? null,
    owner: cleanValue(incoming?.owner ?? base?.owner ?? null),
    notes: cleanValue(incoming?.notes ?? base?.notes ?? null),
    followUpAt: cleanValue(incoming?.followUpAt ?? base?.followUpAt ?? null),
    lastContactAt: cleanValue(incoming?.lastContactAt ?? base?.lastContactAt ?? null),
    updatedAt: incoming?.updatedAt ?? base?.updatedAt ?? new Date().toISOString(),
  };

  const hasValue = Boolean(
    next.stage ||
      next.owner ||
      next.notes ||
      next.followUpAt ||
      next.lastContactAt
  );

  return hasValue ? next : null;
}

export function inferLeadFromConversation(params: {
  messages: ConciergeMessage[];
  lane: ConciergeLane;
  context: ConciergeContext;
  existingProfile?: ConciergeLeadProfile | null;
}): ConciergeLead {
  const userMessages = params.messages.filter((message) => message.role === "user");
  const userTexts = userMessages.map((message) => message.content.trim()).filter(Boolean);
  const joined = userTexts.join("\n");
  const lowerText = joined.toLowerCase();
  const hasImages = userMessages.some((message) => Boolean(message.attachments?.length));

  const profile = mergeLeadProfiles(params.existingProfile, {
    name: extractName(joined),
    email: cleanValue(joined.match(EMAIL_RE)?.[0] ?? null),
    phone: cleanValue(joined.match(PHONE_RE)?.[0] ?? null),
    company: extractCompany(joined),
    website: cleanValue(joined.match(URL_RE)?.[0] ?? null),
    timezone: pickFirstMatch(joined, TIMEZONE_PATTERNS),
    preferredContactMethod:
      CONTACT_METHODS.find(({ pattern }) => pattern.test(joined))?.method ?? null,
  });

  const { intent, label } = detectIntent(params.lane, lowerText);
  const urgency = detectUrgency(lowerText);
  const serviceFit = detectServiceFit(params.lane, lowerText);
  const timeframe = extractTimeframe(joined);
  const budgetSignal = extractBudgetSignal(joined);
  const desiredOutcome = extractDesiredOutcome(userTexts);

  let score = 10;
  if (profile.name) score += 10;
  if (profile.email) score += 25;
  if (profile.phone) score += 20;
  if (profile.company) score += 10;
  if (profile.website) score += 5;
  if (profile.timezone) score += 5;
  if (profile.preferredContactMethod) score += 5;
  if (intent === "book_session" || intent === "project_inquiry") score += 20;
  if (intent === "pricing" || intent === "fit_check") score += 10;
  if (timeframe) score += 10;
  if (budgetSignal) score += 5;
  if (serviceFit === "high") score += 10;
  if (urgency === "high") score += 10;
  score = Math.min(score, 100);

  const hasContact = Boolean(profile.email || profile.phone);
  const stage =
    score >= 70 || (hasContact && (intent === "book_session" || intent === "project_inquiry"))
      ? "qualified"
      : hasContact || score >= 35
        ? "captured"
        : "new";

  const nextStep = !hasContact
    ? "Ask for one clear contact method and timezone."
    : intent === "pricing"
      ? "Reply with fit and pricing path."
      : intent === "book_session" || intent === "project_inquiry"
        ? "Follow up directly and offer one remote next step."
        : "Keep thread warm and clarify the real need.";

  const summaryParts = [
    label,
    profile.company ? `from ${profile.company}` : null,
    desiredOutcome ? desiredOutcome.slice(0, 90) : null,
  ].filter(Boolean);

  return {
    profile,
    insight: {
      stage,
      score,
      primaryIntent: intent,
      intentLabel: label,
      urgency,
      serviceFit,
      summary:
        summaryParts.join(" · ") ||
        `New ${params.lane} conversation from ${params.context.pathname}`,
      desiredOutcome,
      timeframe,
      budgetSignal,
      nextStep,
      tags: buildTags({
        lane: params.lane,
        lowerText,
        hasImages,
        profile,
        intent,
      }),
      capturedAt: new Date().toISOString(),
    },
  };
}
