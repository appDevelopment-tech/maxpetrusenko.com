"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CalendarDays, Check, ImagePlus, SendHorizontal, Smile, X } from "lucide-react";
import { siteConfig } from "@/config/site";
import type {
  ConciergeContext,
  ConciergeAttachment,
  ConciergeCalendarSlot,
  ConciergeMessage,
  ConciergeToolBlock,
  ConciergeVisit,
} from "@/lib/concierge/types";
import styles from "./ConciergeWidget.module.css";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

const THREAD_STORAGE_KEY = "mp-concierge-thread-id";
const VISITOR_STORAGE_KEY = "mp-concierge-visitor-id";
const HISTORY_STORAGE_KEY = "mp-concierge-visit-history";
const MESSAGE_STORAGE_KEY = "mp-concierge-messages";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const MIN_THINKING_MS = 700;
const STREAM_INTERVAL_MS = 28;
const STREAM_CHUNK_SIZE = 3;
const MAX_ATTACHMENT_DATA_URL_CHARS = 280_000;
const EMOJI_SET = ["🙂", "🙏", "✨", "🤍", "🔥", "🧠", "🌿", "📍"];
const WELCOME_TEXT =
  "Hi. I can help with sessions, bookings, writing, apps, or questions. Tell me what you're looking for.";
const STARTER_QUESTIONS = [
  "I want to book a session.",
  "Show me the apps.",
  "Show me the writing.",
  "I have a tech project question.",
];
const WHATSAPP_FALLBACK_URL = "https://wa.me/19542759666";

type ConciergeAssistantResponse = {
  error?: string;
  message?: string;
  threadId?: string;
  visitorId?: string;
  messageData?: ConciergeMessage;
  tools?: ConciergeToolBlock[];
};

type ConciergeQuestionnaireResponse = {
  error?: string;
  message?: string;
  tools?: ConciergeToolBlock[];
  bookingPath?: string;
  bookingUrl?: string;
  handoffUrl?: string;
  handoffText?: string;
  nextStep?: "book" | "follow_up" | "handoff";
  offer?: {
    slots?: Array<{
      id: string;
      practitionerName?: string;
      start?: string;
      end?: string;
    }>;
    practitioners?: Array<{
      id: string;
      name?: string;
      bookingUrl?: string;
    }>;
  };
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function formatOfferSlotLabel(start?: string, end?: string) {
  if (!start) return "Available time";

  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const dateLabel = startDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLabel = startDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endDate) return `${dateLabel} at ${timeLabel}`;

  const endLabel = endDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateLabel} at ${timeLabel} to ${endLabel}`;
}

function formatCalendarSlotDescription(slot: ConciergeCalendarSlot) {
  return slot.description || "";
}

function buildToolKey(
  message: ConciergeMessage,
  messageIndex: number,
  block: ConciergeToolBlock,
  blockIndex: number
) {
  return [
    message.createdAt ?? `${message.role}-${messageIndex}`,
    block.type,
    "id" in block ? block.id : "",
    blockIndex,
  ].join(":");
}

function buildQuestionnaireSummary(
  form: HTMLFormElement,
  fields: Extract<ConciergeToolBlock, { type: "questionnaire" }>["fields"]
) {
  const formData = new FormData(form);
  const entries = Array.from(formData.entries())
    .map(([key, value]) => [key, String(value).trim()] as const)
    .filter(([, value]) => value.length > 0);
  const fieldLabels = new Map(fields.map((field) => [field.id, field.label]));

  return {
    payload: Object.fromEntries(entries),
    text:
      entries.length > 0
        ? entries
            .map(([key, value]) => `${fieldLabels.get(key) || key}: ${value}`)
            .join("\n")
        : "Questionnaire completed.",
  };
}

function buildQuestionnaireWhatsappSummary(
  block: Extract<ConciergeToolBlock, { type: "questionnaire" }>,
  payload: Record<string, string>
) {
  const entries = block.fields
    .map((field) => {
      const value = payload[field.id]?.trim();
      if (!value) return null;
      return `${field.label}\n${value}`;
    })
    .filter((entry): entry is string => Boolean(entry));

  const sections = [
    block.title?.trim() || "Session intake",
    block.description?.trim(),
    entries.join("\n\n"),
  ].filter((section): section is string => Boolean(section && section.trim()));

  return sections.join("\n\n");
}

function buildWhatsappHref(summary?: string) {
  if (!summary?.trim()) return WHATSAPP_FALLBACK_URL;

  try {
    const url = new URL(WHATSAPP_FALLBACK_URL);
    url.searchParams.set("text", summary.trim());
    return url.toString();
  } catch {
    return `${WHATSAPP_FALLBACK_URL}?text=${encodeURIComponent(summary.trim())}`;
  }
}

function normalizeQuestionnaireResponse(
  payload: ConciergeQuestionnaireResponse,
  successMessage?: string,
  fallbackWhatsappHref?: string
) {
  const tools = Array.isArray(payload.tools) ? [...payload.tools] : [];
  const handoffHref = payload.handoffUrl || fallbackWhatsappHref;

  if (handoffHref && !tools.some((tool) => tool.type === "cards")) {
    tools.push({
      type: "cards",
      title: "Private WhatsApp handoff",
      description:
        "Send the prepared context to Max’s Hermes assistant. No public calendar slots are shown here.",
      cards: [
        {
          id: "whatsapp-handoff",
          title: "Send inquiry to WhatsApp",
          href: handoffHref,
          eyebrow: "Next step",
          description: "Includes intention, location, preferred timing, and expectations.",
          buttonLabel: "Send",
        },
      ],
    });
  }

  return {
    content:
      payload.message ||
      successMessage ||
      "Thanks. I prepared the private WhatsApp handoff.",
    tools,
    redirectHref: handoffHref,
    shouldRedirectToWhatsapp: Boolean(handoffHref),
  };
}

function readHistory(): ConciergeVisit[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ConciergeVisit[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(history: ConciergeVisit[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-12)));
}

function getThreadId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(THREAD_STORAGE_KEY);
}

function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(VISITOR_STORAGE_KEY);
}

function setThreadId(threadId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THREAD_STORAGE_KEY, threadId);
}

function setVisitorId(visitorId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
}

function readMessages(): ConciergeMessage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(MESSAGE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ConciergeMessage[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMessages(messages: ConciergeMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MESSAGE_STORAGE_KEY,
    JSON.stringify(messages.filter((message) => !message.status).slice(-20))
  );
}

async function fileToAttachment(file: File): Promise<ConciergeAttachment> {
  const readUrl = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const rawDataUrl = await readUrl();
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error(`Failed to load ${file.name}`));
    element.src = rawDataUrl;
  });

  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable.");
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.8;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (dataUrl.length > MAX_ATTACHMENT_DATA_URL_CHARS && quality > 0.42) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_ATTACHMENT_DATA_URL_CHARS) {
    const resizeScale = Math.sqrt(MAX_ATTACHMENT_DATA_URL_CHARS / dataUrl.length) * 0.92;
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = Math.max(1, Math.round(canvas.width * resizeScale));
    resizedCanvas.height = Math.max(1, Math.round(canvas.height * resizeScale));
    const resizedCtx = resizedCanvas.getContext("2d");

    if (!resizedCtx) {
      throw new Error("Canvas unavailable.");
    }

    resizedCtx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
    quality = Math.min(quality, 0.68);
    dataUrl = resizedCanvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_ATTACHMENT_DATA_URL_CHARS) {
    throw new Error("Image is still too large. Try a smaller screenshot.");
  }

  return {
    id: crypto.randomUUID(),
    kind: "image",
    name: file.name,
    mimeType: "image/jpeg",
    dataUrl,
  };
}

export function ConciergeWidget() {
  const pathname = usePathname();
  const [avatarSrc, setAvatarSrc] = useState("/images/tech-portrait.jpg");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ConciergeMessage[]>([]);
  const [draftAttachments, setDraftAttachments] = useState<ConciergeAttachment[]>(
    []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ConciergeVisit[]>([]);
  const [threadId, setThreadState] = useState<string | null>(null);
  const [visitorId, setVisitorState] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pickerSelections, setPickerSelections] = useState<Record<string, string>>({});
  const [questionnaireStatus, setQuestionnaireStatus] = useState<
    Record<string, { error?: string; submitted?: boolean; submitting?: boolean }>
  >({});
  const [turnstileLoaded, setTurnstileLoaded] = useState(!TURNSTILE_SITE_KEY);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const turnstileRequired = Boolean(TURNSTILE_SITE_KEY);

  const hidden =
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/chinola") ||
    pathname.startsWith("/ailab/six-pendulum-cartpole");

  useEffect(() => {
    if (hidden) return;

    const nextHistory = (() => {
      const current: ConciergeVisit = {
        pathname,
        title: typeof document !== "undefined" ? document.title : undefined,
        enteredAt: new Date().toISOString(),
      };

      const existing = readHistory().filter((visit) => visit.pathname !== pathname);
      const merged = [...existing, current];
      writeHistory(merged);
      return merged;
    })();

    setHistory(nextHistory);
  }, [pathname, hidden]);

  useEffect(() => {
    if (hidden) return;
    setThreadState(getThreadId());
    setMessages(readMessages());

    const existingVisitorId = getVisitorId() ?? crypto.randomUUID();
    setVisitorId(existingVisitorId);
    setVisitorState(existingVisitorId);
  }, [hidden]);

  useEffect(() => {
    if (hidden) return;
    writeMessages(messages);
  }, [messages, hidden]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (
      !turnstileRequired ||
      !turnstileLoaded ||
      !turnstileRef.current ||
      !window.turnstile ||
      turnstileWidgetIdRef.current
    ) {
      return;
    }

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(null),
      "error-callback": () => setTurnstileToken(null),
    });
  }, [turnstileLoaded, turnstileRequired]);

  if (hidden) return null;

  const welcomeText = messages.length > 0 ? null : WELCOME_TEXT;
  const starterQuestions = STARTER_QUESTIONS;

  function handleAvatarError() {
    if (avatarSrc !== "/images/DSC05871.jpg") {
      setAvatarSrc("/images/DSC05871.jpg");
    }
  }

  async function addImages(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);

    try {
      const next = await Promise.all(
        Array.from(files)
          .filter((file) => file.type.startsWith("image/"))
          .slice(0, 3)
          .map((file) => fileToAttachment(file))
      );
      setDraftAttachments((current) => [...current, ...next].slice(0, 3));
    } catch (attachmentError) {
      setError(
        attachmentError instanceof Error
          ? attachmentError.message
          : "Could not add image."
      );
    }
  }

  function insertEmoji(emoji: string) {
    setInput((current) => `${current}${emoji}`);
    setEmojiOpen(false);
  }

  async function revealAssistantMessage(
    baseMessages: ConciergeMessage[],
    assistantText: string,
    tools?: ConciergeToolBlock[]
  ) {
    const createdAt = new Date().toISOString();

    for (
      let cursor = STREAM_CHUNK_SIZE;
      cursor < assistantText.length;
      cursor += STREAM_CHUNK_SIZE
    ) {
      setMessages([
        ...baseMessages,
        {
          role: "assistant",
          content: assistantText.slice(0, cursor),
          createdAt,
          status: "streaming",
        },
      ]);

      await new Promise((resolve) =>
        window.setTimeout(resolve, STREAM_INTERVAL_MS)
      );
    }

    setMessages([
      ...baseMessages,
      {
        role: "assistant",
        content: assistantText,
        createdAt,
        tools,
      },
    ]);
  }

  function openToolHref(href: string) {
    if (typeof window === "undefined") return;
    if (isExternalHref(href)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    window.location.assign(href);
  }

  async function handleToolAction(message?: string, href?: string) {
    if (message?.trim()) {
      await sendMessage(message);
      return;
    }

    if (href) {
      openToolHref(href);
    }
  }

  async function sendMessage(text: string) {
    if ((!text.trim() && draftAttachments.length === 0) || loading) return;
    if (turnstileRequired && !turnstileToken) {
      setError("Complete the captcha first.");
      return;
    }

    const lastUserMessage: ConciergeMessage = {
      role: "user",
      content: text.trim(),
      createdAt: new Date().toISOString(),
      attachments: draftAttachments,
    };

    const nextMessages = [
      ...messages,
      lastUserMessage,
    ];
    const thinkingMessage: ConciergeMessage = {
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      status: "thinking",
    };

    setMessages([...nextMessages, thinkingMessage]);
    setInput("");
    setDraftAttachments([]);
    setEmojiOpen(false);
    setOpen(true);
    setError(null);
    setLoading(true);
    const requestStartedAt = Date.now();

    const context: ConciergeContext = {
      pathname,
      title: typeof document !== "undefined" ? document.title : undefined,
      history,
      proactivePrompt: null,
    };

    try {
      const response = await fetch("/api/consciousness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          visitorId,
          turnstileToken,
          messages: nextMessages,
          context,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ConciergeAssistantResponse;

      if (!response.ok || (!data.message && !data.messageData?.tools?.length && !data.tools?.length)) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      if (data.threadId) {
        setThreadId(data.threadId);
        setThreadState(data.threadId);
      }
      if (data.visitorId) {
        setVisitorId(data.visitorId);
        setVisitorState(data.visitorId);
      }

      const elapsed = Date.now() - requestStartedAt;
      if (elapsed < MIN_THINKING_MS) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, MIN_THINKING_MS - elapsed)
        );
      }

      await revealAssistantMessage(
        nextMessages,
        data.message || "",
        data.messageData?.tools ?? data.tools
      );
    } catch (requestError) {
      setMessages(messages);
      setInput(text);
      setDraftAttachments(lastUserMessage.attachments ?? []);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong."
      );
    } finally {
      if (turnstileRequired && turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
        setTurnstileToken(null);
      }
      setLoading(false);
    }
  }

  function handleComposerKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  async function handleQuestionnaireSubmit(
    event: FormEvent<HTMLFormElement>,
    blockKey: string,
    block: Extract<ConciergeToolBlock, { type: "questionnaire" }>
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const { payload, text } = buildQuestionnaireSummary(form, block.fields);
    const questionnaire = payload as Record<string, string>;
    const whatsappSummary = buildQuestionnaireWhatsappSummary(block, questionnaire);
    const whatsappHref = buildWhatsappHref(whatsappSummary);
    const submittedAt = new Date().toISOString();

    setQuestionnaireStatus((current) => ({
      ...current,
      [blockKey]: { submitted: false, submitting: true, error: undefined },
    }));

    try {
      const response = await fetch(block.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          threadId,
          visitorId,
          pathname,
          title: typeof document !== "undefined" ? document.title : undefined,
          submittedAt,
          questionnaire,
          initialMessage: messages
            .slice()
            .reverse()
            .find((message) => message.role === "user")
            ?.content,
          intention: questionnaire.intention || "",
          blocker: questionnaire.blocker || "",
          serviceType: questionnaire.serviceType || "solo",
          practitionerPreference: questionnaire.practitionerPreference || "any",
          location: questionnaire.location || "",
          preferredTiming: questionnaire.preferredTiming || questionnaire.requestedWindow || "",
          expectations: questionnaire.expectations || "",
          requestedWindow: questionnaire.requestedWindow || "",
          contact: {
            name: questionnaire.name || "",
            phone: questionnaire.phone || "",
            email: questionnaire.email || "",
            method: questionnaire.contactMethod || "",
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ConciergeQuestionnaireResponse;
      if (!response.ok) {
        throw new Error(data.error || `Questionnaire failed (${response.status})`);
      }

      const normalized = normalizeQuestionnaireResponse(data, block.successMessage, whatsappHref);
      const redirectToWhatsapp = normalized.shouldRedirectToWhatsapp;
      const assistantContent = normalized.content;

      setMessages((current) => [
        ...current,
        {
          role: "user",
          content: text,
          createdAt: submittedAt,
        },
        {
          role: "assistant",
          content: assistantContent,
          createdAt: new Date().toISOString(),
          tools: normalized.tools,
        },
      ]);
      setQuestionnaireStatus((current) => ({
        ...current,
        [blockKey]: { submitted: true, submitting: false, error: undefined },
      }));
      form.reset();
      if (redirectToWhatsapp) {
        window.setTimeout(() => openToolHref(normalized.redirectHref || whatsappHref), 120);
      }
    } catch (requestError) {
      setMessages((current) => [
        ...current,
        {
          role: "user",
          content: text,
          createdAt: submittedAt,
        },
        {
          role: "assistant",
          content: "Something failed here. I’m sending you to WhatsApp now.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setQuestionnaireStatus((current) => ({
        ...current,
        [blockKey]: {
          submitted: false,
          submitting: false,
          error: undefined,
        },
      }));
      window.setTimeout(() => openToolHref(whatsappHref), 120);
    }
  }

  function renderToolBlock(
    message: ConciergeMessage,
    messageIndex: number,
    block: ConciergeToolBlock,
    blockIndex: number
  ) {
    const blockKey = buildToolKey(message, messageIndex, block, blockIndex);
    const questionnaireState = questionnaireStatus[blockKey];

    if (block.type === "cards") {
      return (
        <section key={blockKey} className={styles.toolBlock}>
          {(block.title || block.description) && (
            <div className={styles.toolHeader}>
              {block.title && <p className={styles.toolTitle}>{block.title}</p>}
              {block.description && (
                <p className={styles.toolDescription}>{block.description}</p>
              )}
            </div>
          )}
          <div className={styles.linkCardGrid}>
            {block.cards.map((card) => {
              const external = isExternalHref(card.href);
              return (
                <a
                  key={card.id}
                  className={styles.linkCard}
                  href={card.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                >
                  {card.imageSrc ? (
                    <div className={styles.linkCardImageWrap}>
                      <img
                        src={card.imageSrc}
                        alt={card.imageAlt || card.title}
                        className={styles.linkCardImage}
                      />
                    </div>
                  ) : null}
                  <div className={styles.linkCardBody}>
                    {card.eyebrow && (
                      <span className={styles.linkCardEyebrow}>{card.eyebrow}</span>
                    )}
                    <span className={styles.linkCardTitle}>{card.title}</span>
                    {card.description && (
                      <span className={styles.linkCardDescription}>
                        {card.description}
                      </span>
                    )}
                    <span className={styles.linkCardCta}>
                      {card.buttonLabel || "Open"} <ArrowUpRight size={14} />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      );
    }

    if (block.type === "picker") {
      return (
        <section key={blockKey} className={styles.toolBlock}>
          {(block.title || block.description) && (
            <div className={styles.toolHeader}>
              {block.title && <p className={styles.toolTitle}>{block.title}</p>}
              {block.description && (
                <p className={styles.toolDescription}>{block.description}</p>
              )}
            </div>
          )}
          <div className={styles.pickerList}>
            {block.options.map((option) => {
              const selected = pickerSelections[blockKey] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.pickerOption} ${
                    selected ? styles.pickerOptionActive : ""
                  }`}
                  onClick={() => {
                    setPickerSelections((current) => ({
                      ...current,
                      [blockKey]: option.id,
                    }));
                    void handleToolAction(option.message);
                  }}
                >
                  <span className={styles.pickerLabelRow}>
                    <span className={styles.pickerLabel}>{option.label}</span>
                    {selected && <Check size={14} strokeWidth={2.3} />}
                  </span>
                  {option.description && (
                    <span className={styles.pickerDescription}>
                      {option.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      );
    }

    if (block.type === "calendar") {
      return (
        <section key={blockKey} className={styles.toolBlock}>
          {(block.title || block.description) && (
            <div className={styles.toolHeader}>
              {block.title && <p className={styles.toolTitle}>{block.title}</p>}
              {block.description && (
                <p className={styles.toolDescription}>{block.description}</p>
              )}
            </div>
          )}
          <div className={styles.calendarGrid}>
            {block.slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={styles.calendarSlot}
                onClick={() => void handleToolAction(slot.message || slot.label, slot.href)}
              >
                <span className={styles.calendarSlotMeta}>
                  <CalendarDays size={14} strokeWidth={2.1} />
                  <span className={styles.calendarSlotLabel}>{slot.label}</span>
                </span>
                {formatCalendarSlotDescription(slot) && (
                  <span className={styles.calendarSlotDescription}>
                    {formatCalendarSlotDescription(slot)}
                  </span>
                )}
              </button>
            ))}
          </div>
          {block.ctaHref && block.ctaLabel ? (
            <button
              type="button"
              className={styles.calendarCta}
              onClick={() => openToolHref(block.ctaHref!)}
            >
              {block.ctaLabel} <ArrowUpRight size={14} />
            </button>
          ) : null}
        </section>
      );
    }

    return (
      <section key={blockKey} className={styles.toolBlock}>
        {(block.title || block.description) && (
          <div className={styles.toolHeader}>
            {block.title && <p className={styles.toolTitle}>{block.title}</p>}
            {block.description && (
              <p className={styles.toolDescription}>{block.description}</p>
            )}
          </div>
        )}
        <form
          className={styles.questionnaire}
          onSubmit={(event) => void handleQuestionnaireSubmit(event, blockKey, block)}
        >
          <div className={styles.questionnaireFields}>
            {block.fields.map((field) => (
              <label key={field.id} className={styles.questionnaireField}>
                <span className={styles.questionnaireLabel}>{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.id}
                    className={`${styles.questionnaireInput} ${styles.questionnaireTextarea}`}
                    placeholder={field.placeholder}
                    defaultValue={field.initialValue}
                    required={field.required}
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.id}
                    className={styles.questionnaireInput}
                    defaultValue={field.initialValue || ""}
                    required={field.required}
                  >
                    <option value="" disabled>
                      {field.placeholder || "Select"}
                    </option>
                    {(field.options || []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.id}
                    type={field.type}
                    className={styles.questionnaireInput}
                    placeholder={field.placeholder}
                    defaultValue={field.initialValue}
                    required={field.required}
                  />
                )}
              </label>
            ))}
          </div>
          <div className={styles.questionnaireFooter}>
            <button
              type="submit"
              className={styles.questionnaireSubmit}
              disabled={questionnaireState?.submitting || questionnaireState?.submitted}
            >
              {questionnaireState?.submitted
                ? "Sent"
                : questionnaireState?.submitting
                  ? "Sending"
                  : block.submitLabel || "Send"}
            </button>
            {questionnaireState?.submitted && block.successMessage && (
              <span className={styles.questionnaireSuccess}>
                {block.successMessage}
              </span>
            )}
            {questionnaireState?.error && (
              <span className={styles.questionnaireError}>
                {questionnaireState.error}
              </span>
            )}
          </div>
        </form>
      </section>
    );
  }

  return (
    <>
      {turnstileRequired && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileLoaded(true)}
        />
      )}

      <div className={styles.shell}>
        {open ? (
          <section className={styles.panel} aria-label="Let's Connect concierge">
            <div className={styles.header}>
              <div className={styles.headerRow}>
                <div className={styles.headerMeta}>
                  <Image
                    src={avatarSrc}
                    alt="Max Petrusenko portrait"
                    width={52}
                    height={52}
                    className={styles.avatar}
                    unoptimized
                    onError={handleAvatarError}
                  />
                  <div className={styles.headline}>
                    <h2 className={styles.title}>Max&apos;s agent</h2>
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.close}
                    onClick={() => setOpen(false)}
                    aria-label="Close concierge"
                  >
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className={styles.messages}>
              {welcomeText && (
                <div className={styles.starter}>
                  <p className={styles.starterText}>{welcomeText}</p>
                  <div className={styles.chipRow}>
                    {starterQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        className={`${styles.chip} ${styles.ghostButton}`}
                        onClick={() => void sendMessage(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.createdAt ?? index}`}
                  className={`${styles.messageWrap} ${
                    message.role === "assistant"
                      ? styles.assistantWrap
                      : styles.userWrap
                  }`}
                >
                  <div
                    className={`${styles.message} ${
                      message.role === "assistant"
                        ? styles.assistant
                        : styles.user
                    }`}
                  >
                    {message.status === "thinking" || message.status === "streaming" ? (
                      <div className={styles.thinking}>
                        {message.content ? (
                          <span className={styles.thinkingText}>{message.content}</span>
                        ) : (
                          <>
                            <span className={styles.thinkingText}>
                              Max&apos;s agent is typing
                            </span>
                            <span className={styles.thinkingDots} aria-hidden="true">
                              <span></span>
                              <span></span>
                              <span></span>
                            </span>
                          </>
                        )}
                      </div>
                    ) : message.content ? (
                      <div>{message.content}</div>
                    ) : null}
                    {message.status !== "thinking" &&
                      message.attachments &&
                      message.attachments.length > 0 && (
                      <div className={styles.attachmentGrid}>
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className={styles.attachmentCard}>
                            <img
                              src={attachment.dataUrl}
                              alt={attachment.name}
                              className={styles.attachmentImage}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {message.status !== "thinking" &&
                      message.tools &&
                      message.tools.length > 0 && (
                        <div className={styles.toolStack}>
                          {message.tools.map((block, blockIndex) =>
                            renderToolBlock(message, index, block, blockIndex)
                          )}
                        </div>
                      )}
                  </div>
                  <span className={styles.messageLabel}>
                    {message.status === "thinking"
                      ? "Typing"
                      : message.status === "streaming"
                      ? "Typing"
                      : message.role === "assistant"
                        ? "Concierge"
                        : "You"}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.inputArea}>
              {draftAttachments.length > 0 && (
                <div className={styles.draftAttachmentRow}>
                  {draftAttachments.map((attachment) => (
                    <div key={attachment.id} className={styles.draftAttachment}>
                      <img
                        src={attachment.dataUrl}
                        alt={attachment.name}
                        className={styles.draftAttachmentImage}
                      />
                      <button
                        type="button"
                        className={styles.attachmentRemove}
                        onClick={() =>
                          setDraftAttachments((current) =>
                            current.filter((item) => item.id !== attachment.id)
                          )
                        }
                        aria-label={`Remove ${attachment.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.composer}>
                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Write to Max..."
                  disabled={loading}
                />
                <div className={styles.toolbar}>
                  <button
                    type="button"
                    className={styles.toolbarButton}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Add image"
                  >
                    <ImagePlus size={16} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className={styles.toolbarButton}
                    onClick={() => setEmojiOpen((current) => !current)}
                    aria-label="Add emoji"
                  >
                    <Smile size={16} strokeWidth={2.2} />
                  </button>
                  {emojiOpen && (
                    <div className={styles.emojiTray}>
                      {EMOJI_SET.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className={styles.emojiButton}
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <span className={styles.toolbarHint}>Cmd/Ctrl+Enter to send</span>
                  <button
                    type="button"
                    className={`${styles.submit} ${styles.softButton}`}
                    disabled={
                      loading ||
                      (!input.trim() && draftAttachments.length === 0) ||
                      (turnstileRequired && !turnstileToken)
                    }
                    onClick={() => void sendMessage(input)}
                  >
                    <SendHorizontal size={18} strokeWidth={2.2} />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(event) => {
                    void addImages(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>
              {turnstileRequired && (
                <div style={{ marginTop: 10 }}>
                  {!turnstileLoaded && (
                    <p className={styles.metaNote}>Loading spam protection...</p>
                  )}
                  <div ref={turnstileRef} />
                </div>
              )}
              {error && <p className={styles.error}>{error}</p>}
            </div>
          </section>
        ) : (
          <button
            type="button"
            className={styles.bubble}
            onClick={() => {
              setOpen(true);
            }}
            aria-label="Open Let's Connect concierge"
          >
            <Image
              src={avatarSrc}
              alt="Max Petrusenko portrait"
              width={44}
              height={44}
              className={styles.avatar}
              unoptimized
              onError={handleAvatarError}
            />
            <span className={styles.bubbleLabel}>
              <span className={styles.bubbleTitle}>Let's Connect</span>
              <span className={styles.bubbleSub}>Open chat</span>
            </span>
          </button>
        )}
      </div>
    </>
  );
}
