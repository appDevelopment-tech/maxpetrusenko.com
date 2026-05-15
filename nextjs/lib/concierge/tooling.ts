import { siteConfig } from "@/config/site";
import { projects } from "@/lib/cms/projects";
import type {
  ConciergeContext,
  ConciergeLinkCard,
  ConciergeLane,
  ConciergeCalendarSlot,
  ConciergeMessage,
  ConciergePickerOption,
  ConciergeQuestionnaireField,
  ConciergeToolBlock,
} from "./types";

const STUDIO_URL = "https://studio.maxpetrusenko.com";

const SOMATIC_INTENTION_OPTIONS = [
  {
    id: "nervous-system",
    label: "Nervous system regulation",
    message:
      "My intention is nervous system regulation and I want a calm, grounded session.",
  },
  {
    id: "emotional-release",
    label: "Emotional release",
    message:
      "My intention is emotional release and I want support with what feels held or blocked.",
  },
  {
    id: "intimacy-trust",
    label: "Intimacy and trust",
    message:
      "My intention is intimacy, trust, and feeling more open in my body and relationships.",
  },
  {
    id: "first-time",
    label: "First time, curious",
    message:
      "I am curious and this would be my first time, so I want something gentle and clear.",
  },
];

const PRACTITIONER_OPTIONS = [
  {
    id: "female",
    label: "Female practitioner",
    message: "I would prefer a female practitioner.",
  },
  {
    id: "male",
    label: "Male practitioner",
    message: "I would prefer a male practitioner.",
  },
  {
    id: "no-preference",
    label: "No preference",
    message: "I do not have a practitioner preference.",
  },
];

function sanitizeText(value: unknown, max = 240): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function sanitizeLinkCard(card: unknown): ConciergeLinkCard | null {
  if (!card || typeof card !== "object") return null;
  const value = card as Record<string, unknown>;
  const id = sanitizeText(value.id, 80);
  const title = sanitizeText(value.title, 120);
  const href = sanitizeText(value.href, 500);

  if (!id || !title || !href) return null;

  return {
    id,
    title,
    href,
    imageSrc: sanitizeText(value.imageSrc, 500),
    imageAlt: sanitizeText(value.imageAlt, 160),
    eyebrow: sanitizeText(value.eyebrow, 80),
    description: sanitizeText(value.description, 280),
    buttonLabel: sanitizeText(value.buttonLabel, 80),
  };
}

function sanitizePickerOption(option: unknown): ConciergePickerOption | null {
  if (!option || typeof option !== "object") return null;
  const value = option as Record<string, unknown>;
  const id = sanitizeText(value.id, 80);
  const label = sanitizeText(value.label, 120);
  const message = sanitizeText(value.message, 280);

  if (!id || !label || !message) return null;

  return {
    id,
    label,
    message,
    description: sanitizeText(value.description, 240),
  };
}

function sanitizeCalendarSlot(slot: unknown): ConciergeCalendarSlot | null {
  if (!slot || typeof slot !== "object") return null;
  const value = slot as Record<string, unknown>;
  const id = sanitizeText(value.id, 80);
  const label = sanitizeText(value.label, 140);

  if (!id || !label) return null;

  return {
    id,
    label,
    description: sanitizeText(value.description, 200),
    message: sanitizeText(value.message, 280),
    href: sanitizeText(value.href, 500),
  };
}

function sanitizeQuestionnaireField(
  field: unknown
): ConciergeQuestionnaireField | null {
  if (!field || typeof field !== "object") return null;
  const value = field as Record<string, unknown>;
  const id = sanitizeText(value.id, 80);
  const label = sanitizeText(value.label, 120);
  const type = sanitizeText(value.type, 32);

  if (
    !id ||
    !label ||
    !type ||
    !["text", "email", "tel", "textarea", "select"].includes(type)
  ) {
    return null;
  }

  return {
    id,
    label,
    type: type as ConciergeQuestionnaireField["type"],
    placeholder: sanitizeText(value.placeholder, 200),
    required: Boolean(value.required),
    initialValue: sanitizeText(value.initialValue, 240),
    options: Array.isArray(value.options)
      ? value.options
          .map((option) => {
            if (!option || typeof option !== "object") return null;
            const item = option as Record<string, unknown>;
            const optionLabel = sanitizeText(item.label, 120);
            const optionValue = sanitizeText(item.value, 120);
            if (!optionLabel || !optionValue) return null;
            return { label: optionLabel, value: optionValue };
          })
          .filter((option): option is NonNullable<typeof option> => Boolean(option))
          .slice(0, 12)
      : undefined,
  };
}

export function sanitizeConciergeToolBlocks(
  blocks: ConciergeToolBlock[] | undefined
): ConciergeToolBlock[] {
  if (!Array.isArray(blocks)) return [];

  const sanitized = blocks.map((block): ConciergeToolBlock | null => {
      if (!block || typeof block !== "object") return null;

      switch (block.type) {
        case "cards": {
          const cards = block.cards
            .map(sanitizeLinkCard)
            .filter((card): card is ConciergeLinkCard => Boolean(card))
            .slice(0, 6);
          if (cards.length === 0) return null;
          return {
            type: "cards" as const,
            title: sanitizeText(block.title, 120),
            description: sanitizeText(block.description, 240),
            cards,
          };
        }
        case "picker": {
          const options = block.options
            .map(sanitizePickerOption)
            .filter((option): option is ConciergePickerOption => Boolean(option))
            .slice(0, 6);
          if (options.length === 0) return null;
          return {
            type: "picker" as const,
            title: sanitizeText(block.title, 120),
            description: sanitizeText(block.description, 240),
            options,
          };
        }
        case "calendar": {
          const slots = block.slots
            .map(sanitizeCalendarSlot)
            .filter((slot): slot is ConciergeCalendarSlot => Boolean(slot))
            .slice(0, 12);
          return {
            type: "calendar" as const,
            title: sanitizeText(block.title, 120),
            description: sanitizeText(block.description, 240),
            slots,
            ctaLabel: sanitizeText(block.ctaLabel, 80),
            ctaHref: sanitizeText(block.ctaHref, 500),
          };
        }
        case "questionnaire": {
          const fields = block.fields
            .map(sanitizeQuestionnaireField)
            .filter(
              (field): field is ConciergeQuestionnaireField => Boolean(field)
            )
            .slice(0, 16);
          const endpoint = sanitizeText(block.endpoint, 500);
          if (!endpoint || fields.length === 0) return null;
          return {
            type: "questionnaire" as const,
            title: sanitizeText(block.title, 120),
            description: sanitizeText(block.description, 240),
            endpoint,
            submitLabel: sanitizeText(block.submitLabel, 80),
            successMessage: sanitizeText(block.successMessage, 240),
            fields,
          };
        }
        default:
          return null;
      }
    });

  return sanitized.filter((block): block is ConciergeToolBlock => block !== null);
}

function userMessages(messages: ConciergeMessage[]): ConciergeMessage[] {
  return messages.filter((message) => message.role === "user");
}

function latestUserText(messages: ConciergeMessage[]): string {
  return userMessages(messages).at(-1)?.content.trim() ?? "";
}

function allUserText(messages: ConciergeMessage[]): string {
  return userMessages(messages)
    .map((message) => message.content)
    .join("\n");
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function isSomaticIntent(text: string): boolean {
  return includesAny(text, [
    /\bmassage\b/i,
    /\btantra\b/i,
    /\bsomatic\b/i,
    /\bsession\b/i,
    /\bbook\b/i,
    /\bpractitioner\b/i,
    /\bavailability\b/i,
  ]);
}

function isAppIntent(text: string): boolean {
  return includesAny(text, [
    /\bapp\b/i,
    /\bapps\b/i,
    /\btool\b/i,
    /\btools\b/i,
    /\bproduct\b/i,
    /\bprojects?\b/i,
    /\bbuilds?\b/i,
    /\bshow\b.{0,24}\bapp\b/i,
  ]);
}

function isWritingIntent(text: string): boolean {
  return includesAny(text, [
    /\bwriting\b/i,
    /\barticles?\b/i,
    /\bblog\b/i,
    /\bessay\b/i,
    /\bessays\b/i,
    /\bmedium\b/i,
    /\bread\b/i,
  ]);
}

function isTechIntent(text: string): boolean {
  return includesAny(text, [
    /\bautomation\b/i,
    /\bagent\b/i,
    /\bai\b/i,
    /\bconsulting\b/i,
    /\bproject\b/i,
    /\bbuild\b/i,
  ]);
}

function hasPractitionerPreference(text: string): boolean {
  return includesAny(text, [
    /\bfemale practitioner\b/i,
    /\bmale practitioner\b/i,
    /\bno preference\b/i,
    /\bprefer a woman\b/i,
    /\bprefer a man\b/i,
    /\bany practitioner\b/i,
    /\beither\b/i,
  ]);
}

function extractPractitionerPreference(text: string): string {
  if (/\bfemale\b/i.test(text) || /\bwoman\b/i.test(text)) return "female";
  if (/\bmale\b/i.test(text) || /\bman\b/i.test(text)) return "male";
  return "any";
}

function hasSomaticIntention(text: string): boolean {
  return includesAny(text, [
    /\bmy intention\b/i,
    /\bi want\b/i,
    /\bi need\b/i,
    /\bi am looking for\b/i,
    /\bcurious\b/i,
    /\bstress\b/i,
    /\brelease\b/i,
    /\btrust\b/i,
    /\bblocked\b/i,
    /\bregulation\b/i,
    /\breconnect\b/i,
    /\bfeel\b/i,
  ]);
}

function hasContactInfo(text: string): boolean {
  return includesAny(text, [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /(?:\+?\d[\d\s().-]{7,}\d)/,
    /\bwhatsapp\b/i,
  ]);
}

function buildLauncherCards(): ConciergeToolBlock {
  return {
    type: "cards",
    title: "Start here",
    description: "Open the path that fits best.",
    cards: [
      {
        id: "somatic-inquiry",
        title: "Join the inquiry list",
        href: "/spirituality",
        imageSrc: "/images/DSC05871.jpg",
        imageAlt: "Somatic session portrait",
        eyebrow: "Somatic work",
        description: "Boundaries, fit, and future inquiry. No calendar slots are open right now.",
        buttonLabel: "Read practice note",
      },
      {
        id: "open-studio",
        title: "Open studio",
        href: STUDIO_URL,
        imageSrc: "/images/DSC05764.jpg",
        imageAlt: "Studio background portrait",
        eyebrow: "Studio",
        description: "Go straight to the studio surface.",
        buttonLabel: "Open studio",
      },
      {
        id: "open-writing",
        title: "Read writing",
        href: "/blog",
        imageSrc: "/images/DSC05764.jpg",
        imageAlt: "Writing and editorial background",
        eyebrow: "Writing",
        description: "Articles, essays, and topic paths.",
        buttonLabel: "Open writing",
      },
      {
        id: "open-apps",
        title: "Open apps",
        href: "/tech",
        imageSrc: "/images/tech-apps/clawposter.png",
        imageAlt: "App gallery preview",
        eyebrow: "Apps",
        description: "Operator tools, live products, and case studies.",
        buttonLabel: "Open apps",
      },
    ],
  };
}

function buildAppCards(): ConciergeToolBlock {
  return {
    type: "cards",
    title: "Apps and products",
    description: "Live surfaces you can open now.",
    cards: projects
      .filter(
        (project) =>
          project.status === "live" &&
          typeof project.image === "string" &&
          project.image.startsWith("/")
      )
      .slice(0, 4)
      .map((project) => ({
        id: project.id,
        title: project.title,
        href: project.link,
        imageSrc: project.image,
        imageAlt: project.title,
        eyebrow: project.category === "product" ? "Studio product" : "App",
        description: project.description,
        buttonLabel: "Open",
      })),
  };
}

function buildWritingCards(): ConciergeToolBlock {
  return {
    type: "cards",
    title: "Writing",
    description: "Best places to read.",
    cards: [
      {
        id: "writing-hub",
        title: "Writing hub",
        href: "/blog",
        imageSrc: "/images/DSC05764.jpg",
        imageAlt: "Writing hub",
        eyebrow: "On site",
        description: "Articles and essays published here.",
        buttonLabel: "Open blog",
      },
      {
        id: "topics",
        title: "Topic index",
        href: "/blog/topics",
        imageSrc: "/images/DSC05764.jpg",
        imageAlt: "Writing topics",
        eyebrow: "Topics",
        description: "Browse by theme instead of date.",
        buttonLabel: "Open topics",
      },
      {
        id: "medium",
        title: "Medium archive",
        href: siteConfig.social.medium ?? "https://medium.com/@max.petrusenko",
        imageSrc: "/images/DSC05764.jpg",
        imageAlt: "Medium archive",
        eyebrow: "External",
        description: "Older essays and platform-native posts.",
        buttonLabel: "Open Medium",
      },
    ],
  };
}

function buildSomaticQuestionnaire(
  conversationText: string
): ConciergeToolBlock {
  const practitionerPreference = extractPractitionerPreference(conversationText);
  const fields: ConciergeQuestionnaireField[] = [
    {
      id: "intention",
      label: "Intention",
      type: "textarea",
      placeholder: "What are you hoping to explore if the practice reopens?",
      required: true,
    },
    {
      id: "blocker",
      label: "What feels blocked or important right now",
      type: "textarea",
      placeholder: "A few lines is enough.",
      required: true,
    },
    {
      id: "location",
      label: "Where would you want a session?",
      type: "text",
      placeholder: "City / area, or 'not sure yet'",
      required: true,
    },
    {
      id: "preferredTiming",
      label: "Preferred timing",
      type: "text",
      placeholder: "Rough dates or timing, not a booking request",
    },
    {
      id: "expectations",
      label: "Expectation or support needed",
      type: "textarea",
      placeholder: "What would make this feel safe, clear, or useful?",
    },
    {
      id: "serviceType",
      label: "Inquiry type",
      type: "select",
      initialValue: "solo",
      options: [
        { label: "Solo", value: "solo" },
        { label: "Couples", value: "couples" },
      ],
    },
    {
      id: "practitionerPreference",
      label: "Practitioner preference",
      type: "select",
      initialValue: practitionerPreference,
      options: [
        { label: "No preference", value: "any" },
        { label: "Female practitioner", value: "female" },
        { label: "Male practitioner", value: "male" },
      ],
    },
    {
      id: "name",
      label: "Name",
      type: "text",
      placeholder: "Your name",
      required: true,
    },
    {
      id: "phone",
      label: "WhatsApp or phone",
      type: "tel",
      placeholder: "Best number",
    },
    {
      id: "email",
      label: "Email",
      type: "email",
      placeholder: "Best email",
    },
    {
      id: "contactMethod",
      label: "Preferred reply",
      type: "select",
      initialValue: hasContactInfo(conversationText) ? "whatsapp" : "email",
      options: [
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Email", value: "email" },
        { label: "Phone", value: "phone" },
      ],
    },
  ];

  return {
    type: "questionnaire",
    title: "A few details for future-fit inquiry",
    description:
      "Private sessions are paused for now. This only captures context for a future-fit inquiry; it will not show times.",
    endpoint: "/api/somatic-intake",
    submitLabel: "Prepare WhatsApp handoff",
    successMessage: "Thanks. I prepared a private WhatsApp handoff for Max’s Hermes assistant.",
    fields,
  };
}

function buildSomaticCalendar(calendarUrl: string): ConciergeToolBlock {
  return {
    type: "calendar",
    title: "Calendar disabled",
    description:
      "No calendar slots are open right now.",
    slots: [],
    ctaLabel: "No calendar available",
    ctaHref: calendarUrl,
  };
}

export function buildConciergeToolBlocks(params: {
  lane: ConciergeLane;
  context: ConciergeContext;
  messages: ConciergeMessage[];
  somaticCalendarUrl?: string | null;
}): ConciergeToolBlock[] {
  const lastUser = latestUserText(params.messages);
  const conversationText = allUserText(params.messages);
  const lower = `${lastUser}\n${conversationText}`.toLowerCase();
  const blocks: ConciergeToolBlock[] = [];
  const userCount = userMessages(params.messages).length;

  if (!lastUser) {
    return blocks;
  }

  if (
    /\b(start|show me around|what can you help with|what do you do|where should i start)\b/i.test(
      lastUser
    )
  ) {
    blocks.push(buildLauncherCards());
    return blocks;
  }

  if (isWritingIntent(lower)) {
    blocks.push(buildWritingCards());
    return blocks;
  }

  if (isAppIntent(lower) || (params.lane === "tech" && /\bshow\b/i.test(lastUser))) {
    blocks.push(buildAppCards());
    return blocks;
  }

  if (isSomaticIntent(lower) || params.lane === "somatic") {
    blocks.push({
      type: "cards",
      title: "Somatic practice paths",
      description: "Read context or prepare a private future-fit handoff. Private sessions are paused for now.",
      cards: [
        {
          id: "studio",
          title: "Studio",
          href: STUDIO_URL,
          imageSrc: "/images/DSC05871.jpg",
          imageAlt: "Studio practice path",
          eyebrow: "Direct path",
          description: "Open the studio surface.",
          buttonLabel: "Open studio",
        },
        {
          id: "somatic-guide",
          title: "What to expect",
          href: "/spirituality",
          imageSrc: "/images/DSC05764.jpg",
          imageAlt: "Somatic work page",
          eyebrow: "Read first",
          description: "Boundaries, pacing, and how the work is framed.",
          buttonLabel: "Open page",
        },
      ],
    });

    if (!hasSomaticIntention(conversationText) && userCount <= 2) {
      blocks.push({
        type: "picker",
        title: "What are you looking for?",
        description: "Pick the closest starting point.",
        options: SOMATIC_INTENTION_OPTIONS,
      });
      return blocks;
    }

    blocks.push(buildSomaticQuestionnaire(conversationText));
    return blocks;
  }

  if (isTechIntent(lower)) {
    blocks.push(buildAppCards());
    return blocks;
  }

  return blocks;
}
