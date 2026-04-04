"use client";

import { useMemo, useState } from "react";
import { getEffectiveLeadStage } from "@/lib/concierge/lead";
import type {
  ConciergeLeadStage,
  ConciergeThread,
} from "@/lib/concierge/types";

interface ThreadLeadManagerProps {
  thread: ConciergeThread;
  onUpdated: (thread: ConciergeThread) => void;
}

const STAGES: Array<{ value: ConciergeLeadStage; label: string }> = [
  { value: "new", label: "New" },
  { value: "captured", label: "Captured" },
  { value: "qualified", label: "Qualified" },
  { value: "follow_up", label: "Follow up" },
  { value: "archived", label: "Archived" },
];

function toLocalInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toStoredDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function ThreadLeadManager({
  thread,
  onUpdated,
}: ThreadLeadManagerProps) {
  const inferredStage = getEffectiveLeadStage(thread);
  const [stage, setStage] = useState(thread.crm?.stage ?? "");
  const [owner, setOwner] = useState(thread.crm?.owner ?? "");
  const [notes, setNotes] = useState(thread.crm?.notes ?? "");
  const [followUpAt, setFollowUpAt] = useState(
    toLocalInputValue(thread.crm?.followUpAt)
  );
  const [lastContactAt, setLastContactAt] = useState(
    toLocalInputValue(thread.crm?.lastContactAt)
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () =>
      stage !== (thread.crm?.stage ?? "") ||
      owner !== (thread.crm?.owner ?? "") ||
      notes !== (thread.crm?.notes ?? "") ||
      followUpAt !== toLocalInputValue(thread.crm?.followUpAt) ||
      lastContactAt !== toLocalInputValue(thread.crm?.lastContactAt),
    [followUpAt, lastContactAt, notes, owner, stage, thread.crm]
  );

  async function save() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/threads/${thread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          crm: {
            stage: stage || null,
            owner: owner || null,
            notes: notes || null,
            followUpAt: toStoredDateTime(followUpAt),
            lastContactAt: toStoredDateTime(lastContactAt),
          },
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        thread?: ConciergeThread;
      };

      if (!response.ok || !data.thread) {
        throw new Error(data.error || "Failed to save CRM state.");
      }

      onUpdated(data.thread);
      setMessage("Saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 18,
        background: "rgba(8,17,29,0.04)",
        border: "1px solid rgba(36,57,54,0.08)",
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--muted)",
            }}
          >
            CRM controls
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Auto stage: {inferredStage ?? "none"}
          </p>
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setLastContactAt(toLocalInputValue(new Date().toISOString()))}
        >
          Mark contacted
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Stage</span>
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            style={{
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.92)",
              padding: "10px 12px",
              font: "inherit",
            }}
          >
            <option value="">Auto ({inferredStage ?? "none"})</option>
            {STAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Owner</span>
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Max"
            style={{
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.92)",
              padding: "10px 12px",
              font: "inherit",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Follow up</span>
          <input
            type="datetime-local"
            value={followUpAt}
            onChange={(event) => setFollowUpAt(event.target.value)}
            style={{
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.92)",
              padding: "10px 12px",
              font: "inherit",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Last contact</span>
          <input
            type="datetime-local"
            value={lastContactAt}
            onChange={(event) => setLastContactAt(event.target.value)}
            style={{
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.92)",
              padding: "10px 12px",
              font: "inherit",
            }}
          />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          placeholder="Qualification notes, objections, handoff context"
          style={{
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.92)",
            padding: "12px 14px",
            font: "inherit",
            resize: "vertical",
          }}
        />
      </label>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="btn primary"
          disabled={loading || !dirty}
          onClick={() => void save()}
        >
          {loading ? "Saving..." : "Save CRM"}
        </button>
        {message && <span style={{ fontSize: 13, color: "#0e615d" }}>{message}</span>}
        {error && <span style={{ fontSize: 13, color: "#b42318" }}>{error}</span>}
      </div>
    </div>
  );
}
