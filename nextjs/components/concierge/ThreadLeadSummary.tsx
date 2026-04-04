import { getEffectiveLeadStage } from "@/lib/concierge/lead";
import type { ConciergeThread } from "@/lib/concierge/types";

interface ThreadLeadSummaryProps {
  thread: ConciergeThread;
}

export function ThreadLeadSummary({ thread }: ThreadLeadSummaryProps) {
  const lead = thread.lead;
  const effectiveStage = getEffectiveLeadStage(thread);

  if (!lead) return null;

  const identity = [
    lead.profile.name,
    lead.profile.company,
    lead.profile.email,
    lead.profile.phone,
  ].filter(Boolean);

  const detailRows = [
    ["Intent", lead.insight.intentLabel],
    ["Stage", effectiveStage],
    ["Score", String(lead.insight.score)],
    ["Urgency", lead.insight.urgency],
    ["Fit", lead.insight.serviceFit],
    ["Timezone", lead.profile.timezone ?? null],
    ["Preferred", lead.profile.preferredContactMethod ?? null],
    ["Timeframe", lead.insight.timeframe ?? null],
    ["Budget", lead.insight.budgetSignal ?? null],
    ["Owner", thread.crm?.owner ?? null],
    ["Follow up", thread.crm?.followUpAt ?? null],
    ["Last contact", thread.crm?.lastContactAt ?? null],
  ].filter(([, value]) => Boolean(value));

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 18,
        background: "rgba(11,22,37,0.04)",
        border: "1px solid rgba(36,57,54,0.1)",
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
            Lead snapshot
          </p>
          {identity.length > 0 && (
            <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
              {identity.join(" · ")}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              background: "rgba(14,97,93,0.08)",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {effectiveStage ?? lead.insight.stage}
          </span>
          <span
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              background: "rgba(36,57,54,0.06)",
              fontSize: 12,
            }}
          >
            score {lead.insight.score}
          </span>
        </div>
      </div>

      {lead.insight.summary && (
        <p style={{ margin: 0, lineHeight: 1.7 }}>{lead.insight.summary}</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {detailRows.map(([label, value]) => (
          <div
            key={`${thread.id}-${label}`}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.75)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--muted)",
              }}
            >
              {label}
            </p>
            <p style={{ margin: "6px 0 0", lineHeight: 1.5 }}>{value}</p>
          </div>
        ))}
      </div>

      {(lead.insight.desiredOutcome ||
        lead.insight.nextStep ||
        lead.insight.tags.length > 0 ||
        thread.crm?.notes) && (
        <div style={{ display: "grid", gap: 10 }}>
          {lead.insight.desiredOutcome && (
            <div>
              <strong>Desired outcome:</strong> {lead.insight.desiredOutcome}
            </div>
          )}
          {thread.crm?.notes && (
            <div>
              <strong>Notes:</strong> {thread.crm.notes}
            </div>
          )}
          {lead.insight.nextStep && (
            <div>
              <strong>Next step:</strong> {lead.insight.nextStep}
            </div>
          )}
          {lead.insight.tags.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {lead.insight.tags.map((tag) => (
                <span
                  key={`${thread.id}-${tag}`}
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "rgba(36,57,54,0.06)",
                    fontSize: 12,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
