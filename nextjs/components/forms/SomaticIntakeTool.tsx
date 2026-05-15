"use client";

import { FormEvent, useState, type CSSProperties } from "react";
import { SendHorizontal } from "lucide-react";

type Phase = "ask" | "intention" | "details" | "sending" | "done";

type IntakeResult = {
  handoffUrl?: string;
  handoffText?: string;
  message?: string;
  nextStep?: "handoff" | "follow_up";
};

const fieldStyle: CSSProperties = {
  width: "100%",
  borderRadius: "10px",
  border: "1px solid var(--line)",
  background: "rgba(255,255,255,0.66)",
  color: "var(--ink)",
  padding: "0.85rem 0.95rem",
  font: "inherit",
};

const textareaStyle: CSSProperties = {
  ...fieldStyle,
  minHeight: 92,
  resize: "vertical",
};


export function SomaticIntakeTool() {
  const [phase, setPhase] = useState<Phase>("ask");
  const [error, setError] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [intention, setIntention] = useState("");
  const [blocker, setBlocker] = useState("");
  const [serviceType, setServiceType] = useState("solo");
  const [location, setLocation] = useState("");
  const [preferredTiming, setPreferredTiming] = useState("");
  const [expectations, setExpectations] = useState("");
  const [practitionerPreference, setPractitionerPreference] = useState("any");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);

  function submitQuestion(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInitialMessage((value) => value.trim() || "I want to ask about tantra massage.");
    setPhase("intention");
  }

  function submitIntention(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!intention.trim()) {
      setError("Share your intention first.");
      return;
    }
    setPhase("details");
  }

  async function submitDetails(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!intention.trim()) {
      setPhase("intention");
      setError("Share your intention first.");
      return;
    }

    setPhase("sending");
    const response = await fetch("/api/somatic-intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: crypto.randomUUID(),
        initialMessage,
        intention,
        blocker,
        serviceType,
        location,
        preferredTiming,
        expectations,
        practitionerPreference,
        contact: { name, phone, email, method: contactMethod },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Could not save intake.");
      setPhase("details");
      return;
    }

    setResult(data);
    setPhase("done");
  }

  return (
    <div className="card" id="session-intake" style={{ overflow: "hidden", padding: 0 }}>
      <div className="split" style={{ gap: 0 }}>
        <div style={{ padding: "clamp(1.25rem,3vw,2rem)" }}>
          <p className="section-eyebrow">Session intake</p>
          <h2 style={{ marginTop: 8 }}>Share context before any session talk</h2>
          <p className="text-muted" style={{ marginTop: 10 }}>
            Share intention, location, preferred timing, and expectations. This
            prepares a private WhatsApp handoff for future-fit inquiry without
            showing public booking or calendar slots.
          </p>
          <div className="tiles" style={{ marginTop: 18 }}>
            <div className="tile">
              <span className="tile-title">Consent led</span>
              <span className="tile-desc">Boundaries before logistics</span>
            </div>
            <div className="tile">
              <span className="tile-title">Future-fit inquiry</span>
              <span className="tile-desc">No public calendar slots</span>
            </div>
          </div>
        </div>

        <div style={{ borderLeft: "1px solid var(--line)", padding: "clamp(1.25rem,3vw,2rem)" }}>
          {phase === "ask" ? (
            <form onSubmit={submitQuestion}>
              <label className="section-eyebrow" htmlFor="somatic-question">Question</label>
              <textarea
                id="somatic-question"
                onChange={(event) => setInitialMessage(event.target.value)}
                placeholder="I want to ask about a tantra-informed session..."
                style={{ ...textareaStyle, marginTop: 8 }}
                value={initialMessage}
              />
              <button className="btn primary" style={{ marginTop: 12 }} type="submit">
                Ask <SendHorizontal size={16} />
              </button>
            </form>
          ) : null}

          {phase === "intention" ? (
            <form onSubmit={submitIntention}>
              <label className="section-eyebrow" htmlFor="somatic-intention">Intention</label>
              <textarea
                id="somatic-intention"
                onChange={(event) => setIntention(event.target.value)}
                placeholder="My intention is..."
                style={{ ...textareaStyle, marginTop: 8 }}
                value={intention}
              />
              <button className="btn primary" style={{ marginTop: 12 }} type="submit">
                Continue
              </button>
            </form>
          ) : null}

          {phase === "details" || phase === "sending" ? (
            <form onSubmit={submitDetails}>
              <div className="grid" style={{ gap: 12 }}>
                <textarea
                  onChange={(event) => setBlocker(event.target.value)}
                  placeholder="What feels blocked or important right now?"
                  style={textareaStyle}
                  value={blocker}
                />
                <div className="cards-3 grid" style={{ gap: 10 }}>
                  <input onChange={(event) => setLocation(event.target.value)} placeholder="Where would you want a session?" style={fieldStyle} value={location} />
                  <input onChange={(event) => setPreferredTiming(event.target.value)} placeholder="Preferred timing" style={fieldStyle} value={preferredTiming} />
                  <input onChange={(event) => setExpectations(event.target.value)} placeholder="Expectation or support needed" style={fieldStyle} value={expectations} />
                </div>
                <div className="cards-3 grid" style={{ gap: 10 }}>
                  <select onChange={(event) => setServiceType(event.target.value)} style={fieldStyle} value={serviceType}>
                    <option value="solo">Solo</option>
                    <option value="couples">Couples</option>
                  </select>
                  <select onChange={(event) => setPractitionerPreference(event.target.value)} style={fieldStyle} value={practitionerPreference}>
                    <option value="any">Any practitioner</option>
                    <option value="male">Male practitioner</option>
                    <option value="female">Female practitioner</option>
                  </select>
                  <input onChange={(event) => setContactMethod(event.target.value)} placeholder="Best contact method" style={fieldStyle} value={contactMethod} />
                </div>
                <div className="cards-3 grid" style={{ gap: 10 }}>
                  <input onChange={(event) => setName(event.target.value)} placeholder="Name" style={fieldStyle} value={name} />
                  <input onChange={(event) => setPhone(event.target.value)} placeholder="WhatsApp or phone" style={fieldStyle} value={phone} />
                  <input onChange={(event) => setEmail(event.target.value)} placeholder="Email" style={fieldStyle} type="email" value={email} />
                </div>
              </div>
              <button className="btn primary" disabled={phase === "sending"} style={{ marginTop: 12 }} type="submit">
                {phase === "sending" ? "Preparing" : "Prepare WhatsApp handoff"} <SendHorizontal size={16} />
              </button>
            </form>
          ) : null}

          {phase === "done" ? (
            <div>
              <h3>Inquiry prepared</h3>
              <p className="text-muted" style={{ marginTop: 8 }}>
                {result?.message ||
                  "I prepared a WhatsApp message for Max’s Hermes assistant. Send it there so the inquiry can be routed privately."}
              </p>
              <div className="hero-actions" style={{ marginTop: 16 }}>
                {result?.handoffUrl ? (
                  <a className="btn primary" href={result.handoffUrl} rel="noopener" target="_blank">
                    Send to WhatsApp <SendHorizontal size={16} />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? <p style={{ color: "#9f1d20", marginTop: 12 }}>{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
