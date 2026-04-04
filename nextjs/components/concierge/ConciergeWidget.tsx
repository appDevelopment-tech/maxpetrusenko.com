"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { ImagePlus, SendHorizontal, Smile, X } from "lucide-react";
import { getRouteContext } from "@/lib/concierge/context";
import type {
  ConciergeContext,
  ConciergeAttachment,
  ConciergeMessage,
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
  const [turnstileLoaded, setTurnstileLoaded] = useState(!TURNSTILE_SITE_KEY);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const turnstileRequired = Boolean(TURNSTILE_SITE_KEY);

  const routeContext = useMemo(() => getRouteContext(pathname), [pathname]);
  const hidden =
    pathname.startsWith("/inbox") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/workspace");

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

  const welcomeText =
    messages.length > 0
      ? null
      : routeContext.proactiveQuestion;

  const starterQuestions = [
    routeContext.proactiveQuestion,
    routeContext.lane === "somatic"
      ? "How do your sessions handle boundaries and pacing?"
      : routeContext.lane === "tech"
        ? "What kind of AI automation projects are a good fit?"
        : routeContext.lane === "bridge"
          ? "How do meditation and engineering connect in your work?"
      : "Can you help me find the right part of the site?",
  ];

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
    assistantText: string
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
      },
    ]);
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

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        threadId?: string;
        visitorId?: string;
      };

      if (!response.ok || !data.message) {
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

      await revealAssistantMessage(nextMessages, data.message);
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
                    ) : (
                      message.content
                    )}
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
