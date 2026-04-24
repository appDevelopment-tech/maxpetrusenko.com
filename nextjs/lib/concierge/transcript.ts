import type { ConciergeMessage } from "./types";

function attachmentSignature(message: ConciergeMessage): string {
  return (message.attachments ?? [])
    .map((attachment) => `${attachment.kind}:${attachment.name}:${attachment.mimeType}`)
    .join("|");
}

function toolSignature(message: ConciergeMessage): string {
  return (message.tools ?? [])
    .map((tool) => {
      switch (tool.type) {
        case "cards":
          return `cards:${tool.cards.map((card) => card.id).join(",")}`;
        case "picker":
          return `picker:${tool.options.map((option) => option.id).join(",")}`;
        case "calendar":
          return `calendar:${tool.slots.map((slot) => slot.id).join(",")}`;
        case "questionnaire":
          return `questionnaire:${tool.fields.map((field) => field.id).join(",")}`;
      }
    })
    .join("|");
}

function messageSignature(message: ConciergeMessage): string {
  return [
    message.role,
    message.content.trim(),
    attachmentSignature(message),
    toolSignature(message),
  ].join("\u001f");
}

function normalizeStoredMessage(
  message: ConciergeMessage,
  fallbackCreatedAt: string
): ConciergeMessage {
  return {
    role: message.role === "assistant" ? "assistant" : "user",
    content: String(message.content ?? "").trim(),
    createdAt: message.createdAt ?? fallbackCreatedAt,
    attachments: message.attachments,
    tools: message.tools,
  };
}

export function mergeConciergeTranscript(params: {
  existingMessages?: ConciergeMessage[] | null;
  incomingMessages: ConciergeMessage[];
  fallbackCreatedAt: string;
}): ConciergeMessage[] {
  const existing = (params.existingMessages ?? [])
    .map((message) => normalizeStoredMessage(message, params.fallbackCreatedAt))
    .filter(
      (message) =>
        message.content.length > 0 ||
        Boolean(message.attachments && message.attachments.length > 0)
    );
  const incoming = params.incomingMessages
    .map((message) => normalizeStoredMessage(message, params.fallbackCreatedAt))
    .filter(
      (message) =>
        message.content.length > 0 ||
        Boolean(message.attachments && message.attachments.length > 0)
    );

  if (existing.length === 0) return incoming;
  if (incoming.length === 0) return existing;

  const existingSignatures = existing.map(messageSignature);
  const incomingSignatures = incoming.map(messageSignature);
  const maxOverlap = Math.min(existing.length, incoming.length);

  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    const existingTail = existingSignatures.slice(existing.length - overlap);
    const incomingHead = incomingSignatures.slice(0, overlap);
    if (existingTail.every((signature, index) => signature === incomingHead[index])) {
      return [...existing, ...incoming.slice(overlap)];
    }
  }

  return [...existing, ...incoming];
}
