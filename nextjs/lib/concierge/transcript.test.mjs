import test from "node:test";
import assert from "node:assert/strict";

import { mergeConciergeTranscript } from "./transcript.ts";

test("mergeConciergeTranscript appends new turns without duplicating prior overlap", () => {
  const existingMessages = [
    { role: "user", content: "hello", createdAt: "2026-04-21T00:00:00.000Z" },
    { role: "assistant", content: "hi", createdAt: "2026-04-21T00:00:01.000Z" },
  ];
  const incomingMessages = [
    { role: "user", content: "hello", createdAt: "client-time-1" },
    { role: "assistant", content: "hi", createdAt: "client-time-2" },
    { role: "user", content: "what do you do?", createdAt: "client-time-3" },
    { role: "assistant", content: "I help route you.", createdAt: "server-time-4" },
  ];

  const merged = mergeConciergeTranscript({
    existingMessages,
    incomingMessages,
    fallbackCreatedAt: "fallback",
  });

  assert.deepEqual(
    merged.map((message) => `${message.role}: ${message.content}`),
    [
      "user: hello",
      "assistant: hi",
      "user: what do you do?",
      "assistant: I help route you.",
    ]
  );
  assert.equal(merged[0].createdAt, "2026-04-21T00:00:00.000Z");
});

test("mergeConciergeTranscript preserves all incoming messages for new threads", () => {
  const merged = mergeConciergeTranscript({
    existingMessages: null,
    incomingMessages: [
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
    ],
    fallbackCreatedAt: "fallback",
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0].createdAt, "fallback");
});

test("mergeConciergeTranscript preserves assistant tool blocks", () => {
  const merged = mergeConciergeTranscript({
    existingMessages: [
      {
        role: "assistant",
        content: "Start here.",
        createdAt: "2026-04-21T00:00:00.000Z",
        tools: [
          {
            type: "cards",
            title: "Launcher",
            cards: [
              {
                id: "apps",
                title: "Apps",
                href: "/tech",
              },
            ],
          },
        ],
      },
    ],
    incomingMessages: [
      {
        role: "assistant",
        content: "Start here.",
        createdAt: "client-time-1",
        tools: [
          {
            type: "cards",
            title: "Launcher",
            cards: [
              {
                id: "apps",
                title: "Apps",
                href: "/tech",
              },
            ],
          },
        ],
      },
      {
        role: "user",
        content: "Show me writing",
        createdAt: "client-time-2",
      },
    ],
    fallbackCreatedAt: "fallback",
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0].tools?.[0]?.type, "cards");
  assert.equal(merged[0].tools?.[0]?.cards?.[0]?.id, "apps");
});
