"use client";

import { useState } from "react";

/**
 * Inline email capture component
 *
 * Non-modal email signup for service pages.
 * Tracks which page the signup originated from.
 */

interface EmailCaptureInlineProps {
  /** Source identifier for analytics */
  source?: string;
  /** Headline text */
  headline?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Placeholder text for email input */
  placeholder?: string;
  /** Button text */
  buttonText?: string;
}

export function EmailCaptureInline({
  source = "unknown",
  headline = "Stay in the loop",
  subtitle = "Drop your email and I'll reach out with updates.",
  placeholder = "you@example.com",
  buttonText = "Subscribe",
}: EmailCaptureInlineProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setStatus("Sending...");

    try {
      const response = await fetch("https://newsletter-api.max-petrusenko.workers.dev/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent,
          source,
        }),
      });

      const data = await response.json() as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Request failed");
      }

      setStatus("Got it — we'll reach out.");
      setIsSuccess(true);

      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong. Try again later.");
      setTimeout(() => setStatus(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="email-inline-success">
        <p>✓ You're in! Check your inbox soon.</p>
      </div>
    );
  }

  return (
    <div className="email-inline">
      <div className="email-inline-content">
        <h3>{headline}</h3>
        <p>{subtitle}</p>
        <form onSubmit={handleSubmit}>
          <div className="email-inline-inputs">
            <input
              type="email"
              name="email"
              placeholder={placeholder}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="btn primary" disabled={isLoading || !email}>
              {isLoading ? "Sending..." : buttonText}
            </button>
          </div>
          <label className="email-inline-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{" "}
            I agree to receive updates.
          </label>
          {status && <div className="email-inline-status">{status}</div>}
        </form>
      </div>
    </div>
  );
}
