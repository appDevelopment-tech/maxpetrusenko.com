export interface HomeFaqEntry {
  question: string;
  answer: string;
  lane: "tech" | "somatic" | "general";
}

export const homeFaqEntries: HomeFaqEntry[] = [
  {
    question: "What does Max Petrusenko do?",
    answer:
      "Max Petrusenko runs two practices: AI automation consulting for founders and private somatic sessions focused on nervous system regulation. The work stays clearly separated, with distinct pages and inquiry paths. Somatic sessions are paused for now.",
    lane: "general",
  },
  {
    question: "What tech services can I hire Max for?",
    answer:
      "Tech work includes Claude Code setup, n8n workflow automation, ChatGPT and API integrations, and product execution for teams that want faster delivery with less operational drag.",
    lane: "tech",
  },
  {
    question: "Where are somatic sessions available?",
    answer:
      "Somatic sessions are paused for now, with remote tech consulting available worldwide. Message directly to discuss fit and format options.",
    lane: "somatic",
  },
  {
    question: "What is Kyo-tai?",
    answer:
      "Kyo-tai is Max Petrusenko's term for a two-body somatic practice that uses contact, pressure, rhythm, and energetic transmission as one shared listening system. It is relational bodywork, not routine massage.",
    lane: "somatic",
  },
  {
    question: "How do I inquire or start a project?",
    answer:
      "Somatic sessions are paused for now; WhatsApp can be used only for future-fit inquiry. For tech work, send your stack or email project context before timing and scope are confirmed.",
    lane: "general",
  },
  {
    question: "Does Max work remotely?",
    answer:
      "Yes. Tech consulting is remote worldwide. Somatic work is paused for now; no travel-based calendar slots are open.",
    lane: "tech",
  },
];

export function buildHomeFaqMainEntity(entries: HomeFaqEntry[] = homeFaqEntries) {
  return entries.map((entry) => ({
    "@type": "Question" as const,
    name: entry.question,
    acceptedAnswer: {
      "@type": "Answer" as const,
      text: entry.answer,
    },
  }));
}
