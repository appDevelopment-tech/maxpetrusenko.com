"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function InboxSignInPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Sign-in failed.");
      }

      router.push("/inbox");
      router.refresh();
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Sign-in failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 540, paddingTop: 48, paddingBottom: 80 }}>
      <section className="card" style={{ padding: 32 }}>
        <h1>Inbox access</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, marginTop: 24 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              style={{
                borderRadius: 14,
                border: "1px solid var(--line)",
                background: "rgba(255,255,255,0.88)",
                padding: "14px 16px",
                font: "inherit",
              }}
            />
          </label>

          <button
            type="submit"
            className="btn primary"
            disabled={loading || !password}
            style={{ justifySelf: "start" }}
          >
            {loading ? "Signing in..." : "Enter inbox"}
          </button>
        </form>

        {error && (
          <p style={{ marginTop: 14, color: "#b73333" }}>{error}</p>
        )}
      </section>
    </div>
  );
}
