export interface ReferenceRouteCard {
  title: string;
  href: string;
  description: string;
  badge: string;
}

export interface BrandedReferencePageConfig {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  heroImage: string;
  h1: string;
  intro: string;
  question: string;
  answer: string;
  displayAnswer: string;
  quickFacts: string[];
  routeCards: ReferenceRouteCard[];
  searchPhrases: string[];
  primaryCta: {
    href: string;
    label: string;
  };
  secondaryCta: {
    href: string;
    label: string;
  };
}

export const brandedReferencePages: BrandedReferencePageConfig[] = [
  {
    slug: "who-is-max-petrusenko",
    title: "Who Is Max Petrusenko?",
    description:
      "Authoritative profile page for Max Petrusenko: AI automation consultant, software builder, somatic practitioner, and founder of Mindfold and Presence Atelier.",
    keywords: [
      "who is max petrusenko",
      "max petrusenko bio",
      "max petrusenko profile",
      "max petrusenko website",
      "max petrusenko identity",
    ],
    eyebrow: "Authoritative profile",
    heroImage: "/images/DSC05871.jpg",
    h1: "Who is Max Petrusenko?",
    intro:
      "This is the shortest clean answer for branded search. One person, multiple lanes: AI automation and software on one side, somatic practice and Mindfold on the other.",
    question: "Who is Max Petrusenko?",
    answer:
      "Max Petrusenko is an AI automation consultant, software builder, and somatic practitioner. He publishes tech systems work under his own name, offers private somatic sessions through Presence Atelier, and runs Mindfold blindfolded presence events. Primary bases: Ubud, Bali and South Florida.",
    displayAnswer:
      "AI automation consultant, software builder, somatic practitioner, and Mindfold founder. Tech, somatic, and event work all live here under one name.",
    quickFacts: [
      "AI automation, Claude Code, n8n, ChatGPT integrations",
      "Private somatic and tantra-informed sessions",
      "Mindfold blindfolded presence journeys and group events",
      "Bases in Ubud, Bali and South Florida",
    ],
    routeCards: [
      {
        title: "Identity",
        href: "/identity",
        description: "Canonical disambiguation page for authorship, lanes, and boundaries.",
        badge: "Canonical",
      },
      {
        title: "About",
        href: "/about",
        description: "Background, operating style, and how the practices stay distinct.",
        badge: "Profile",
      },
      {
        title: "Tech",
        href: "/tech",
        description: "AI automation consulting, services, outcomes, and delivery model.",
        badge: "Work",
      },
      {
        title: "Spirituality",
        href: "/spirituality",
        description: "Somatic work, tantra-informed bodywork, and booking details.",
        badge: "Practice",
      },
      {
        title: "Mindfold",
        href: "/mindfold/events",
        description: "Blindfolded presence journeys, group formats, and private events.",
        badge: "Events",
      },
      {
        title: "Proof",
        href: "/proof",
        description: "Case studies, testimonials, and validation across lanes.",
        badge: "Evidence",
      },
    ],
    searchPhrases: [
      "max petrusenko",
      "who is max petrusenko",
      "max petrusenko bio",
      "max petrusenko profile",
      "max petrusenko website",
    ],
    primaryCta: {
      href: "/identity",
      label: "Open identity",
    },
    secondaryCta: {
      href: "/about",
      label: "Read about",
    },
  },
  {
    slug: "max-petrusenko-ai-automation",
    title: "Max Petrusenko AI Automation",
    description:
      "Branded AI automation reference page for Max Petrusenko: Claude Code consulting, n8n workflows, ChatGPT integrations, and production automation systems.",
    keywords: [
      "max petrusenko ai automation",
      "max petrusenko claude code consultant",
      "max petrusenko n8n consultant",
      "max petrusenko chatgpt integration",
      "max petrusenko automation consultant",
    ],
    eyebrow: "Tech reference",
    heroImage: "/images/tech-portrait.jpg",
    h1: "Max Petrusenko AI automation",
    intro:
      "For branded searches around AI systems work, this page points to the strongest service, case study, and implementation routes.",
    question: "What AI automation work does Max Petrusenko do?",
    answer:
      "Max Petrusenko helps teams ship AI automation systems with Claude Code, n8n, custom APIs, and ChatGPT integrations. His work covers workflow audits, implementation, reliability, and rollout. A published case study on this site reports $253k annual savings, 3x faster delivery, and 73% fewer production bugs.",
    displayAnswer:
      "Claude Code, n8n, API integrations, and production automation systems. Includes a published $253k savings case study.",
    quickFacts: [
      "Claude Code setup and team rollout",
      "n8n workflow architecture and debugging",
      "ChatGPT API and custom automation systems",
      "Remote worldwide, with in-person availability while traveling",
    ],
    routeCards: [
      {
        title: "Tech Overview",
        href: "/tech",
        description: "Primary service page for automation consulting and delivery model.",
        badge: "Primary",
      },
      {
        title: "AI Automation Services",
        href: "/tech/ai-automation",
        description: "Offer structure, process, and engagement framing for automation work.",
        badge: "Services",
      },
      {
        title: "Claude Code Consultant",
        href: "/claude-code-consultant",
        description: "Branded service page for Claude Code setup, training, and workflow design.",
        badge: "Claude",
      },
      {
        title: "n8n Automation",
        href: "/n8n-automation",
        description: "Dedicated route for n8n workflow design, API integration, and operations.",
        badge: "n8n",
      },
      {
        title: "Case Study",
        href: "/tech/case-studies/claude-code-automation",
        description: "Published outcome page with savings, bug reduction, and delivery metrics.",
        badge: "Proof",
      },
      {
        title: "Reviews",
        href: "/max-petrusenko-reviews",
        description: "Central review and testimonial route for branded trust queries.",
        badge: "Trust",
      },
    ],
    searchPhrases: [
      "max petrusenko ai automation",
      "max petrusenko claude code consultant",
      "max petrusenko n8n consultant",
      "max petrusenko chatgpt integration",
      "max petrusenko automation consultant",
    ],
    primaryCta: {
      href: "/tech",
      label: "Open tech",
    },
    secondaryCta: {
      href: "/tech/case-studies/claude-code-automation",
      label: "Read case study",
    },
  },
  {
    slug: "max-petrusenko-aeo-geo",
    title: "Max Petrusenko AEO & GEO",
    description:
      "Branded AEO and GEO reference page for Max Petrusenko with direct links to his answer engine optimization, generative engine optimization, and AI visibility guides.",
    keywords: [
      "max petrusenko aeo",
      "max petrusenko geo",
      "max petrusenko answer engine optimization",
      "max petrusenko generative engine optimization",
      "max petrusenko ai visibility",
    ],
    eyebrow: "AEO / GEO reference",
    heroImage: "/images/generated/home-automation-portrait.jpg",
    h1: "Max Petrusenko on AEO and GEO",
    intro:
      "Branded search route for answer-engine visibility. This page collects the AEO, GEO, SEO split, and AI citation guides that define the current point of view.",
    question: "What does Max Petrusenko write about in AEO and GEO?",
    answer:
      "Max Petrusenko writes practical guides on Answer Engine Optimization and Generative Engine Optimization for service businesses and software teams. The strongest pages on this site cover citation-ready content structure, trust signals, llms.txt usage, structured data, SEO versus AI answers, and AI visibility scoring.",
    displayAnswer:
      "AEO, GEO, AI visibility, structured data, llms.txt, and the SEO-to-answer-engine split. The key guides are linked below.",
    quickFacts: [
      "Practical AEO guide for 2026",
      "GEO operating model for service businesses",
      "AI citation, extractability, and trust-signal framing",
      "Published under Max Petrusenko on-site for clean canonical citation",
    ],
    routeCards: [
      {
        title: "AEO Guide",
        href: "/tech/articles/answer-engine-optimization-aeo",
        description: "Core answer-engine optimization article with structure and audit guidance.",
        badge: "AEO",
      },
      {
        title: "GEO Framework",
        href: "/tech/articles/generative-engine-optimization-geo",
        description: "Operating model for generative-engine visibility and conversion paths.",
        badge: "GEO",
      },
      {
        title: "Generative AI Score",
        href: "/tech/articles/generative-ai-score-websites",
        description: "What AI engines evaluate before citing, recommending, or trusting a site.",
        badge: "Score",
      },
      {
        title: "SEO Split",
        href: "/tech/articles/seo-is-dead",
        description: "Why SEO did not die, but split between search clicks and AI answers.",
        badge: "Context",
      },
      {
        title: "Tech Overview",
        href: "/tech",
        description: "Broader consulting context for teams that want implementation, not just theory.",
        badge: "Services",
      },
      {
        title: "Who Is Max",
        href: "/who-is-max-petrusenko",
        description: "Authoritative identity route for branded search disambiguation.",
        badge: "Identity",
      },
    ],
    searchPhrases: [
      "max petrusenko aeo",
      "max petrusenko geo",
      "max petrusenko answer engine optimization",
      "max petrusenko generative engine optimization",
      "max petrusenko ai visibility",
    ],
    primaryCta: {
      href: "/tech/articles/answer-engine-optimization-aeo",
      label: "Read AEO guide",
    },
    secondaryCta: {
      href: "/tech/articles/generative-engine-optimization-geo",
      label: "Read GEO guide",
    },
  },
  {
    slug: "max-petrusenko-somatic",
    title: "Max Petrusenko Somatic Practice",
    description:
      "Branded somatic reference page for Max Petrusenko covering tantra-informed bodywork, nervous system regulation, Kyo-tai, training, and spirituality routes.",
    keywords: [
      "max petrusenko somatic",
      "max petrusenko tantra",
      "max petrusenko spirituality",
      "max petrusenko tantra massage",
      "max petrusenko ubud",
    ],
    eyebrow: "Somatic reference",
    heroImage: "/images/DSC05764.jpg",
    h1: "Max Petrusenko somatic practice",
    intro:
      "Branded route for people searching your name together with somatics, tantra, spirituality, or Ubud. It points to the strongest session, training, and FAQ routes.",
    question: "What somatic work does Max Petrusenko offer?",
    answer:
      "Max Petrusenko offers private somatic sessions, tantra-informed bodywork, nervous system regulation work, and Kyo-tai immersion. The strongest public routes on this site explain his approach, session types, training, current locations, and boundaries-first framing for work in Ubud, Miami, and travel-based sessions.",
    displayAnswer:
      "Private somatic sessions, tantra-informed bodywork, nervous system reset, and Kyo-tai. Main routes below cover approach, modalities, training, and booking context.",
    quickFacts: [
      "Private sessions for nervous system regulation and deeper repatterning",
      "Approach is consent-led, trauma-aware, and boundaries first",
      "Kyo-tai, tantra-informed work, and somatic education routes published on-site",
      "Main bases in Ubud and South Florida, with travel-based availability",
    ],
    routeCards: [
      {
        title: "Spirituality",
        href: "/spirituality",
        description: "Primary branded route for somatic and tantra-informed session inquiries.",
        badge: "Primary",
      },
      {
        title: "Somatic",
        href: "/somatic",
        description: "Overview page for somatic practice, session flow, and public framing.",
        badge: "Overview",
      },
      {
        title: "Approach",
        href: "/somatic/approach",
        description: "Boundaries, consent, nervous-system pacing, and who the work is for.",
        badge: "Method",
      },
      {
        title: "Modalities",
        href: "/somatic/modalities",
        description: "Nervous System Reset, Tantra Massage, and Kyo-tai session types.",
        badge: "Sessions",
      },
      {
        title: "Training",
        href: "/somatic/training",
        description: "Lineage, certifications, and background shaping the work.",
        badge: "Training",
      },
      {
        title: "Tantra Massage Ubud",
        href: "/tantra-massage-ubud",
        description: "Local-intent route for Ubud queries and booking context.",
        badge: "Local",
      },
    ],
    searchPhrases: [
      "max petrusenko somatic",
      "max petrusenko tantra",
      "max petrusenko spirituality",
      "max petrusenko tantra massage",
      "max petrusenko ubud",
    ],
    primaryCta: {
      href: "/spirituality",
      label: "Open spirituality",
    },
    secondaryCta: {
      href: "/somatic",
      label: "Open somatic",
    },
  },
  {
    slug: "max-petrusenko-mindfold",
    title: "Max Petrusenko Mindfold",
    description:
      "Branded Mindfold reference page for Max Petrusenko linking blindfolded presence journeys, event booking, private group formats, and related somatic context.",
    keywords: [
      "max petrusenko mindfold",
      "max petrusenko events",
      "max petrusenko blindfold",
      "max petrusenko contact improvisation",
      "max petrusenko community",
    ],
    eyebrow: "Mindfold reference",
    heroImage: "/images/bali/DSC05052.jpg",
    h1: "Max Petrusenko Mindfold",
    intro:
      "Branded route for Mindfold search intent: blindfolded presence journeys, group events, private formats, and adjacent embodied practice routes.",
    question: "What is Mindfold by Max Petrusenko?",
    answer:
      "Mindfold is Max Petrusenko’s blindfolded presence format for groups, private events, and sensory-subtraction journeys. The strongest public page on this site covers event booking, group journeys, private and corporate formats, safety framing, and the music-festival context already referenced across the site.",
    displayAnswer:
      "Mindfold is the blindfolded presence and sensory-subtraction event format run by Max Petrusenko. Group, private, and corporate routes live below.",
    quickFacts: [
      "Blindfolded presence journeys and sensory-subtraction workshops",
      "Group, private, and corporate formats",
      "Connected to broader somatic and embodied-practice work",
      "Published event route plus testimonials and booking flows",
    ],
    routeCards: [
      {
        title: "Mindfold Events",
        href: "/mindfold/events",
        description: "Primary public route for dates, RSVPs, waivers, and private event inquiries.",
        badge: "Primary",
      },
      {
        title: "Links",
        href: "/links",
        description: "Fast path to current booking, social, and event destinations.",
        badge: "Hub",
      },
      {
        title: "Somatic",
        href: "/somatic",
        description: "Broader embodied-practice context, including contact-improv adjacent work.",
        badge: "Context",
      },
      {
        title: "Spirituality",
        href: "/spirituality",
        description: "Somatic and private-session context around the same practitioner.",
        badge: "Practice",
      },
      {
        title: "Reviews",
        href: "/max-petrusenko-reviews",
        description: "Central trust route with Mindfold-specific quotes and proof links.",
        badge: "Trust",
      },
      {
        title: "Who Is Max",
        href: "/who-is-max-petrusenko",
        description: "Branded identity route tying events, tech, and somatic work together.",
        badge: "Identity",
      },
    ],
    searchPhrases: [
      "max petrusenko mindfold",
      "max petrusenko blindfold",
      "max petrusenko events",
      "max petrusenko contact improvisation",
      "max petrusenko community",
    ],
    primaryCta: {
      href: "/mindfold/events",
      label: "Open Mindfold",
    },
    secondaryCta: {
      href: "/max-petrusenko-reviews",
      label: "See reviews",
    },
  },
  {
    slug: "max-petrusenko-reviews",
    title: "Max Petrusenko Reviews",
    description:
      "Central review and proof page for Max Petrusenko with testimonials across tech, somatic work, and Mindfold, plus case-study and trust routes.",
    keywords: [
      "max petrusenko reviews",
      "max petrusenko testimonials",
      "max petrusenko proof",
      "max petrusenko case study",
      "max petrusenko client feedback",
    ],
    eyebrow: "Proof and trust",
    heroImage: "/images/DSC04778.jpg",
    h1: "Max Petrusenko reviews",
    intro:
      "Branded trust route. Use this page when people search your name with reviews, testimonials, or proof and need the fastest path to published evidence.",
    question: "Where can I find reviews for Max Petrusenko?",
    answer:
      "This site publishes testimonials and proof for Max Petrusenko across three lanes: AI automation, somatic work, and Mindfold events. The strongest evidence routes are the Proof page, the Claude Code case study, and service pages carrying published testimonials and aggregate trust signals.",
    displayAnswer:
      "Published testimonials across tech, somatic work, and Mindfold, plus a $253k case study and proof hub.",
    quickFacts: [
      "Tech, spirituality, and Mindfold testimonials published on-site",
      "4.9/5 site-wide sentiment framing already used in schema and service copy",
      "$253k annual savings case study on Claude Code automation",
      "Dedicated proof, case study, and service routes for trust checks",
    ],
    routeCards: [
      {
        title: "Proof",
        href: "/proof",
        description: "Top-level proof hub with validation, outcomes, and supporting routes.",
        badge: "Primary",
      },
      {
        title: "Claude Code Case Study",
        href: "/tech/case-studies/claude-code-automation",
        description: "Highest-signal published outcome page with concrete metrics.",
        badge: "Metrics",
      },
      {
        title: "Tech",
        href: "/tech",
        description: "Automation service page with outcomes and delivery framing.",
        badge: "Tech",
      },
      {
        title: "Spirituality",
        href: "/spirituality",
        description: "Somatic service route with testimonials and boundaries-first framing.",
        badge: "Somatic",
      },
      {
        title: "Mindfold",
        href: "/mindfold/events",
        description: "Event page with participant quotes and format details.",
        badge: "Events",
      },
      {
        title: "Who Is Max",
        href: "/who-is-max-petrusenko",
        description: "Identity route that ties the proof back to the person and brand lanes.",
        badge: "Identity",
      },
    ],
    searchPhrases: [
      "max petrusenko reviews",
      "max petrusenko testimonials",
      "max petrusenko proof",
      "max petrusenko case study",
      "max petrusenko client feedback",
    ],
    primaryCta: {
      href: "/proof",
      label: "Open proof",
    },
    secondaryCta: {
      href: "/tech/case-studies/claude-code-automation",
      label: "Open case study",
    },
  },
];

export const brandedReferencePageMap = Object.fromEntries(
  brandedReferencePages.map((page) => [page.slug, page])
) as Record<string, BrandedReferencePageConfig>;

export const brandedReferenceLinkCards = brandedReferencePages.map((page) => ({
  title: page.title,
  href: `/${page.slug}`,
  description: page.description,
  badge: "Reference",
}));
