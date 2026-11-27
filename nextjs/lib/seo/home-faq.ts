export interface HomeFaqEntry {
  question: string;
  answer: string;
  lane: "tech" | "somatic" | "general";
}

export const homeFaqEntries: HomeFaqEntry[] = [
  {
    question: "What does Max Petrusenko do?",
    answer:
      "Max Petrusenko is an AI automation and agent engineering consultant. He audits a team's stack, finds repetitive work, and builds automations with Claude Code, n8n and API integrations. He also has a private somatic practice, which is paused for now.",
    lane: "general",
  },
  {
    question: "Who is this for, and who is it not for?",
    answer:
      "It fits SaaS founders and small teams with repetitive manual work and a stack they already use. It is a poor fit if you want a full-time hire, an agency retainer, or a no-code tool recommendation with nothing built.",
    lane: "tech",
  },
  {
    question: "How do I start, and what does it cost?",
    answer:
      "Book a 15-minute intro call for $1, or a full working hour for $150, on the booking page. If you would rather not talk first, send your stack through the form on this page and get 3 automation ideas by email, free.",
    lane: "tech",
  },
  {
    question: "What happens on the intro call?",
    answer:
      "You describe the work that eats your week and the tools you use. We decide together whether automation fits and what a first project would look like. You are not asked to commit to anything on the call.",
    lane: "tech",
  },
  {
    question: "What can you build?",
    answer:
      "Claude Code setup, n8n and Make workflows, ChatGPT and API integrations, and custom code where a workflow tool runs out. Live products include ClawPoster, Agent Persona and SMM Agent, and the code is public on GitHub.",
    lane: "tech",
  },
  {
    question: "Does Max work remotely?",
    answer:
      "Yes. Tech consulting is remote worldwide, so there is no travel and no time zone requirement beyond a shared hour for calls.",
    lane: "tech",
  },
  {
    question: "Are somatic sessions available?",
    answer:
      "Private somatic sessions are paused for now and no calendar slots are open. The somatic pages stay up for reference.",
    lane: "somatic",
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
