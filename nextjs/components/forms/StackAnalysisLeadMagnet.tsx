"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/components/analytics/GoogleAnalytics";

interface StackAnalysisLeadMagnetProps {
  /** Source for tracking */
  source?: string;
}

// Event name constants for consistency
const GA_EVENTS = {
  LEAD_MAGNET_VIEW: "lead_magnet_view",
  LEAD_MAGNET_SUBMIT: "lead_magnet_submit",
  LEAD_MAGNET_DOWNLOAD: "lead_magnet_download",
  FORM_START: "form_start",
  CTA_CLICK: "cta_click",
  FORM_SUBMIT: "form_submit",
} as const;

/**
 * Lead magnet form: "Send me your stack"
 *
 * High-converting lead magnet for tech consulting.
 * Offers personalized automation recommendations based on user's current stack.
 *
 * Best practices applied:
 * - Minimal fields (email only required)
 * - Clear value proposition
 * - Mobile-first design
 * - Event tracking for optimization
 *
 * @see https://www.saasfunnellab.com/essay/b2b-saas-lead-magnets/
 */
export function StackAnalysisLeadMagnet({ source = "unknown" }: StackAnalysisLeadMagnetProps) {
  const [email, setEmail] = useState("");
  const [stack, setStack] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  // Track view on mount
  useEffect(() => {
    trackEvent(GA_EVENTS.LEAD_MAGNET_VIEW, { type: "stack_analysis", source });
  }, [source]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !stack) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Track form submission
      trackEvent(GA_EVENTS.LEAD_MAGNET_SUBMIT, {
        type: "stack_analysis",
        source,
        email_length: email.length,
        stack_length: stack.length,
      });

      // Submit to API
      const response = await fetch("/api/lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          stack,
          type: "stack_analysis",
          source,
        }),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      setIsSuccess(true);

      // Track success
      trackEvent(GA_EVENTS.LEAD_MAGNET_DOWNLOAD, {
        type: "stack_analysis",
        source,
      });
    } catch (err) {
      setError("Something went wrong. Please try again.");
      trackEvent(GA_EVENTS.FORM_SUBMIT, {
        type: "stack_analysis",
        status: "error",
        source,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="card" style={{ padding: "32px", textAlign: "center", background: "linear-gradient(135deg, rgba(14, 97, 93, 0.08) 0%, rgba(210, 163, 93, 0.06) 100%)" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✓</div>
        <h3 style={{ marginBottom: "8px" }}>Check Your Inbox</h3>
        <p style={{ color: "var(--muted)", fontSize: "15px" }}>
          I&apos;ll review your stack and send 3 automation opportunities personalized for your tools.
        </p>
        <p style={{ fontSize: "14px", color: "var(--muted)", marginTop: "16px" }}>
          Usually responds within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "32px" }}>
      <h3 style={{ marginBottom: "8px" }}>Send Me Your Stack</h3>
      <p style={{ color: "var(--muted)", fontSize: "15px", marginBottom: "24px" }}>
        Share your current tools. I&apos;ll reply with 3 automation opportunities personalized for your setup.
        <strong> Free. No spam.</strong>
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label htmlFor="stack-email" style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
            Email *
          </label>
          <input
            id="stack-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: "15px",
              border: "1px solid rgba(12, 17, 21, 0.15)",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.9)",
            }}
            onFocus={() => trackEvent(GA_EVENTS.FORM_START, { type: "stack_analysis", field: "email", source })}
          />
        </div>

        <div>
          <label htmlFor="stack-tools" style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
            Your Current Tools *
          </label>
          <textarea
            id="stack-tools"
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            placeholder="e.g., Airtable, Slack, Notion, Gmail, Google Sheets, LinkedIn..."
            required
            rows={4}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: "15px",
              border: "1px solid rgba(12, 17, 21, 0.15)",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.9)",
              resize: "vertical",
              fontFamily: "inherit",
            }}
            onFocus={() => trackEvent(GA_EVENTS.FORM_START, { type: "stack_analysis", field: "stack", source })}
          />
          <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "6px" }}>
            List the tools you use daily. The more specific, the better the recommendations.
          </p>
        </div>

        {error && (
          <div style={{ padding: "12px", background: "rgba(220, 38, 38, 0.1)", border: "1px solid rgba(220, 38, 38, 0.3)", borderRadius: "8px", fontSize: "14px", color: "#991b1b" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn primary"
          style={{
            width: "100%",
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? "wait" : "pointer",
          }}
          onClick={() => trackEvent(GA_EVENTS.CTA_CLICK, { type: "stack_analysis_submit", source })}
        >
          {isSubmitting ? "Sending..." : "Get My 3 Automations"}
        </button>

        <p style={{ fontSize: "13px", color: "var(--muted)", textAlign: "center", margin: 0 }}>
          No spam. Unsubscribe anytime. Your data stays private.
        </p>
      </form>
    </div>
  );
}
