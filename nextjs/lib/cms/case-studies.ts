export interface CaseStudy {
  id: string;
  title: string;
  client: string;
  industry: string;
  duration: string;
  context: string;
  role: string;
  actions: string[];
  outcomes: string[];
  stack: string[];
  metrics?: { label: string; value: string }[];
}

export const caseStudies: CaseStudy[] = [
  {
    id: "content-automation-creator",
    title: "Content Automation System for Creator",
    client: "Content creator with 200K+ followers",
    industry: "Creator Economy",
    duration: "3 weeks",
    context:
      "Client was spending 15+ hours/week manually distributing content across platforms, responding to comments, and tracking analytics. No existing automation in place.",
    role:
      "Designed and built end-to-end automation system from requirements through deployment.",
    actions: [
      "Mapped content workflow from creation to distribution across 5 platforms",
      "Built AI-powered content repurposing pipeline using Claude API",
      "Implemented automated scheduling and posting via platform APIs",
      "Created analytics aggregation dashboard from fragmented platform data",
      "Set up error handling and manual override workflows",
    ],
    outcomes: [
      "Reduced manual work from 15 hrs/week to ~2 hrs/week (87% reduction)",
      "Increased content output 3x while maintaining quality",
      "Improved response rate to comments/DMs by 400%",
      "Client reclaimed ~13 hours/week for creative work",
    ],
    stack: [
      "Next.js",
      "Claude API",
      "Platform APIs (X, YouTube, LinkedIn, Instagram)",
      "Cloudflare Workers",
      "KV storage",
    ],
    metrics: [
      { label: "Time saved", value: "13 hrs/week" },
      { label: "Output increase", value: "3x" },
      { label: "Response rate", value: "+400%" },
    ],
  },
  {
    id: "api-integration-saas",
    title: "Multi-Platform API Integration for SaaS",
    client: "B2B SaaS startup (Series stage)",
    industry: "B2B SaaS",
    duration: "6 weeks",
    context:
      "Company needed to integrate their product with 6 third-party platforms customers were requesting. No dedicated engineering resources for integrations.",
    role:
      "Lead developer for integrations: architecture, implementation, documentation.",
    actions: [
      "Designed unified integration architecture with common abstraction layer",
      "Built integrations for 6 platforms (Salesforce, HubSpot, Slack, Notion, Airtable, Google Sheets)",
      "Implemented webhook handling and event synchronization",
      "Created admin dashboard for managing integration connections",
      "Wrote integration documentation and SDK for customers",
    ],
    outcomes: [
      "All 6 integrations shipped in 6 weeks",
      "Reduced customer onboarding friction by 60%",
      "Became key differentiator in sales demos—cited in 40% of closed deals",
      "Integration requests dropped from top complaint to non-issue",
    ],
    stack: [
      "TypeScript",
      "Next.js",
      "tRPC",
      "Prisma",
      "PostgreSQL",
      "Webhook handlers",
    ],
    metrics: [
      { label: "Integrations shipped", value: "6 platforms" },
      { label: "Onboarding improvement", value: "-60% friction" },
      { label: "Sales impact", value: "cited in 40% of deals" },
    ],
  },
  {
    id: "workflow-automation-agency",
    title: "Agency Workflow Automation",
    client: "Digital marketing agency (15 people)",
    industry: "Marketing Services",
    duration: "4 weeks",
    context:
      "Agency was drowning in manual processes: client reporting, content approvals, task assignments. Team spending 30% of billable time on admin.",
    role:
      "Audited existing processes, designed automation solutions, implemented core workflows.",
    actions: [
      "Mapped 12 core agency workflows and identified automation opportunities",
      "Built automated client reporting system pulling data from 4 tools",
      "Created content approval workflow with Slack integration",
      "Implemented automated task assignment based on project triggers",
      "Set up client portal for real-time project status",
    ],
    outcomes: [
      "Reduced administrative time from 30% to 8% of billable hours",
      "Client report generation time: 2 hours → 3 minutes",
      "Content approval cycle time: 5 days → 2 days",
      "Team morale improved—less 'busy work', more client-facing time",
    ],
    stack: [
      "Airtable",
      "Make.com (formerly Integrately)",
      "Slack API",
      "Google Sheets API",
      "Custom dashboard",
    ],
    metrics: [
      { label: "Admin time reduction", value: "30% → 8%" },
      { label: "Report generation", value: "2hrs → 3min" },
      { label: "Approval cycle", value: "5 days → 2 days" },
    ],
  },
  {
    id: "edge-analytics-platform",
    title: "Edge Analytics Platform",
    client: "High-traffic media site",
    industry: "Digital Media",
    duration: "8 weeks",
    context:
      "Site needed real-time analytics without third-party cookies or privacy concerns. Existing solution was slow and expensive.",
    role:
      "Architected and built edge analytics system using Cloudflare Workers.",
    actions: [
      "Designed privacy-first analytics architecture at the edge",
      "Built event collection API with Cloudflare Workers",
      "Implemented real-time aggregation using Durable Objects",
      "Created analytics dashboard with server-side rendering",
      "Set up data export pipeline for long-term storage",
    ],
    outcomes: [
      "Analytics latency: ~5 seconds (vs 30+ minutes with previous solution)",
      "Cost reduction: 70% compared to previous analytics provider",
      "Full privacy compliance—no third-party cookies or tracking",
      "Real-time content performance insights for editors",
    ],
    stack: [
      "Cloudflare Workers",
      "Durable Objects",
      "KV storage",
      "Analytics Engine",
      "React",
      "TypeScript",
    ],
    metrics: [
      { label: "Latency", value: "~5 seconds" },
      { label: "Cost reduction", value: "70%" },
      { label: "Privacy", value: "full compliance" },
    ],
  },
  {
    id: "claude-code-automation",
    title: "Claude Code Automation - $253k Annual Savings",
    client: "Series B B2B SaaS startup (anonymous per client request)",
    industry: "B2B SaaS",
    duration: "3 months",
    context:
      "A 40-person engineering team was spending 2.5 FTE equivalents on repetitive tasks: code reviews, test writing, documentation updates, incident response. They needed automation without sacrificing quality or safety.",
    role:
      "Led end-to-end Claude Code implementation: architecture, sub-agent configuration, custom skills development, team training.",
    actions: [
      "Configured Claude Code across team's development environments with project context",
      "Built specialized sub-agents for Frontend (React/TypeScript), Backend (Node.js/APIs), DevOps (CI/CD/Docker), and Testing",
      "Created custom skills for PR creation with automated testing, code review with security scanning, and documentation generation",
      "Integrated with GitHub Actions, Linear, Notion, and Slack for seamless workflow",
      "Implemented guardrails: required approval for production deployments, automatic secrets redaction, read-only database access",
      "Conducted hands-on training workshops for all developers",
      "Refined prompts and skills over 8 weeks based on real usage patterns",
    ],
    outcomes: [
      "$253k annual savings (2.3 month payback period)",
      "Code review time reduced 4-8x (2-4 hours → 15-30 minutes per PR)",
      "Feature delivery 3x faster (2-3 weeks → 4-7 days)",
      "Production bugs reduced 73% (15-20/month → 4-6/month)",
      "Test coverage increased from 40-50% to 85-95%",
      "Regression rate dropped from 8-12% to <1%",
      "Zero regressions across 127 pull requests",
      "Developer satisfaction: 87% reported feeling more fulfilled",
      "Onboarding time reduced from 4 weeks to 2 weeks",
    ],
    stack: [
      "Claude Code",
      "Anthropic Claude API",
      "GitHub Actions",
      "Linear API",
      "Notion API",
      "Slack API",
      "Sub-Agents",
      "Custom Skills",
    ],
    metrics: [
      { label: "Annual savings", value: "$253k" },
      { label: "Payback period", value: "2.3 months" },
      { label: "Code review speed", value: "4-8x faster" },
      { label: "Bug reduction", value: "73%" },
    ],
  },
];

export function getCaseStudies(): CaseStudy[] {
  return caseStudies;
}

export function getCaseStudyById(id: string): CaseStudy | undefined {
  return caseStudies.find((cs) => cs.id === id);
}

export function getCaseStudiesByIndustry(industry: string): CaseStudy[] {
  return caseStudies.filter((cs) =>
    cs.industry.toLowerCase().includes(industry.toLowerCase())
  );
}
