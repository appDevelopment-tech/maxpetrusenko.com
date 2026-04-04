"use client";

import { useEffect, useState } from "react";
import type { ConciergeThread } from "@/lib/concierge/types";
import { ThreadLeadSummary } from "@/components/concierge/ThreadLeadSummary";
import { ThreadLeadManager } from "@/components/concierge/ThreadLeadManager";

interface InboxResponse {
  threads?: ConciergeThread[];
  error?: string;
}

export function ConciergeInbox() {
  const [threads, setThreads] = useState<ConciergeThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  async function loadThreads() {
    const response = await fetch("/api/admin/threads", {
      cache: "no-store",
      credentials: "include",
    });
    const data = (await response.json().catch(() => ({}))) as InboxResponse;

    if (response.status === 401) {
      setAuthed(false);
      setThreads([]);
      setLoading(false);
      return;
    }

    if (!response.ok || !data.threads) {
      throw new Error(data.error || "Failed to load threads.");
    }

    setThreads(data.threads);
    setAuthed(true);
    setLoading(false);
  }

  useEffect(() => {
    loadThreads().catch((loadError) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load threads."
      );
      setLoading(false);
    });
  }, []);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Sign-in failed.");
      }

      setPassword("");
      setLoading(true);
      await loadThreads();
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Sign-in failed."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "include",
    });
    setAuthed(false);
    setThreads([]);
  }

  function replaceThread(nextThread: ConciergeThread) {
    setThreads((current) =>
      current
        .map((thread) => (thread.id === nextThread.id ? nextThread : thread))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    );
  }

  if (!authed) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h2>Inbox access</h2>
        <form
          onSubmit={handleSignIn}
          style={{ marginTop: 20, display: "grid", gap: 12 }}
        >
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.92)",
            }}
          />
          {error && <p style={{ color: "#b42318", fontSize: 14 }}>{error}</p>}
          <button type="submit" className="btn primary" disabled={authLoading}>
            {authLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <h2>Saved threads</h2>
          <p style={{ marginTop: 10, lineHeight: 1.7 }}>
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
                  <p
                    style={{
                      margin: "8px 0 0",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.65,
                    }}
                  >
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
