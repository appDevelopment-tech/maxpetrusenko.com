"use client";

import { useState, useEffect } from "react";

/**
 * Email capture modal component
 *
 * Shows a modal to capture email addresses after a delay.
 * Uses localStorage to remember if user has already submitted or dismissed.
 */
export function EmailCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const submittedKey = "emailSubmitted";
    const dismissCountKey = "emailPromptDismissCount";

    // Check if already submitted
    if (localStorage.getItem(submittedKey) === "1") return;

    // Check dismiss count
    const dismissCount = parseInt(localStorage.getItem(dismissCountKey) || "0", 10);
    if (dismissCount >= 2) return;

    // Show modal after 10 seconds
    const timer = setTimeout(() => setIsOpen(true), 10000);
    return () => clearTimeout(timer);
  }, []);

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
          source: "home-modal",
        }),
      });

      const data = await response.json() as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Request failed");
      }

      setStatus("Got it — we will reach out.");
      localStorage.setItem("emailSubmitted", "1");

      setTimeout(() => setIsOpen(false), 2000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong. Try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    const dismissCountKey = "emailPromptDismissCount";
    const dismissCount = parseInt(localStorage.getItem(dismissCountKey) || "0", 10);
    localStorage.setItem(dismissCountKey, String(dismissCount + 1));
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="email-modal-backdrop" style={{ display: "flex" }}>
      <div className="email-modal">
        <h3>Get updates</h3>
        <p>Drop your email and we'll reach out.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{" "}
            I agree to receive updates.
          </label>
          <div className="email-status">{status}</div>
          <div className="email-modal-actions">
            <button type="button" className="btn sm secondary" onClick={handleCancel}>
              Not now
            </button>
            <button type="submit" className="btn sm primary" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
