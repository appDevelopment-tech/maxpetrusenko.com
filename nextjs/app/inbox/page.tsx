"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConciergeThread } from "@/lib/concierge/types";
import { ThreadLeadSummary } from "@/components/concierge/ThreadLeadSummary";
import { ThreadLeadManager } from "@/components/concierge/ThreadLeadManager";

interface InboxResponse {
  threads?: ConciergeThread[];
  error?: string;
}

export default function InboxPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ConciergeThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadThreads() {
      try {
        const response = await fetch("/api/admin/threads", {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as InboxResponse;

        if (response.status === 401) {
          router.replace("/inbox/sign-in");
          return;
        }

        if (!response.ok || !data.threads) {
          throw new Error(data.error || "Failed to load threads.");
        }

        if (!cancelled) {
          setThreads(data.threads);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load threads."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadThreads();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/inbox/sign-in");
    router.refresh();
  }

  function replaceThread(nextThread: ConciergeThread) {
    setThreads((current) =>
      current
        .map((thread) => (thread.id === nextThread.id ? nextThread : thread))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    );
  }

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <section className="section" style={{ marginTop: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <h1>Saved threads</h1>
            <p className="text-muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              Review saved threads, inferred lane, and visit context.
            </p>
          </div>
          <button type="button" className="btn secondary" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        {loading && <p className="text-muted">Loading threads...</p>}
        {error && <p style={{ color: "#b73333" }}>{error}</p>}
        {!loading && !error && threads.length === 0 && (
          <p className="text-muted">No saved threads yet.</p>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {threads.map((thread) => (
            <details
              key={thread.id}
              className="card"
              open
              style={{ padding: 20, background: "rgba(255,255,255,0.88)" }}
            >
              <summary style={{ cursor: "pointer", listStyle: "none" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ maxWidth: 760 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--muted)",
                      }}
                    >
                      {thread.lane} lane
                    </p>
                    <h3 style={{ marginTop: 8 }}>{thread.summary}</h3>
                    <p className="text-muted" style={{ marginTop: 8 }}>
                      {thread.pathname}
                      {thread.title ? ` · ${thread.title}` : ""}
                    </p>
                    {thread.visitorId && (
                      <p className="text-muted" style={{ marginTop: 6, fontSize: 13 }}>
                        Visitor {thread.visitorId}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right", minWidth: 180 }}>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                      Updated
                    </p>
                    <p style={{ marginTop: 6 }}>
                      {new Date(thread.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </summary>

              {thread.proactivePrompt && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 16,
                    background: "rgba(14,97,93,0.06)",
                    color: "#0e615d",
                  }}
                >
                  <strong>Prompt shown:</strong> {thread.proactivePrompt}
                </div>
              )}

              <ThreadLeadSummary thread={thread} />
              <ThreadLeadManager
                thread={thread}
                onUpdated={replaceThread}
              />

              {thread.history.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p
                    style={{
                      marginBottom: 8,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "var(--muted)",
                    }}
                  >
                    Visit context
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {thread.history.map((visit) => (
                      <span
                        key={`${visit.pathname}-${visit.enteredAt}`}
                        style={{
                          borderRadius: 999,
                          padding: "8px 12px",
                          background: "rgba(36,57,54,0.06)",
                          fontSize: 13,
                        }}
                      >
                        {visit.pathname}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                {thread.messages.map((message, index) => (
                  <div
                    key={`${thread.id}-${index}-${message.createdAt ?? index}`}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 18,
                      background:
                        message.role === "assistant"
                          ? "rgba(255,255,255,0.96)"
                          : "rgba(14,97,93,0.08)",
                      border: "1px solid rgba(36,57,54,0.08)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--muted)",
                      }}
                    >
                      {message.role}
                    </p>
                    <p style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                      {message.content}
                    </p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: 10,
                          marginTop: 12,
                        }}
                      >
                        {message.attachments.map((attachment) => (
                          <figure
                            key={attachment.id}
                            style={{ margin: 0, display: "grid", gap: 6 }}
                          >
                            <img
                              src={attachment.dataUrl}
                              alt={attachment.name}
                              style={{
                                width: "100%",
                                height: 120,
                                objectFit: "cover",
                                borderRadius: 14,
                                border: "1px solid rgba(36,57,54,0.08)",
                              }}
                            />
                            <figcaption
                              style={{
                                fontSize: 12,
                                color: "var(--muted)",
                                wordBreak: "break-word",
                              }}
                            >
                              {attachment.name}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                    {message.createdAt && (
                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
