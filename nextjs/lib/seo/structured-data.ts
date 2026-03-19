import { siteConfig } from "@/config/site";
import { testimonials } from "@/lib/cms/testimonials";
import { buildHomeFaqMainEntity } from "@/lib/seo/home-faq";

const BRAND_LOGO_URL = `${siteConfig.url}/images/brand-mark.svg`;
const PERSON_IMAGE_URL = `${siteConfig.url}/images/DSC05871.jpg`;
const TECH_PERSON_IMAGE_URL = `${siteConfig.url}/images/tech-portrait.jpg`;

/**
 * Generate JSON-LD structured data for WebPage
 */
export function generateWebPageSchema(data: {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.title,
    description: data.description,
    url: `${siteConfig.url}${data.url}`,
    ...(data.datePublished && { datePublished: data.datePublished }),
    ...(data.dateModified && { dateModified: data.dateModified }),
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    inLanguage: "en-US",
    publisher: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.url,
    },
  };
}

/**
 * Generate JSON-LD structured data for Article
 */
export function generateArticleSchema(data: {
  title: string;
  description: string;
  image: string;
  url: string;
  datePublished: string;
  dateModified: string;
  author: string;
}) {
  const articleUrl = data.url.startsWith("http")
    ? data.url
    : `${siteConfig.url}${data.url}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: data.description,
    image: data.image.startsWith("http")
      ? data.image
      : `${siteConfig.url}${data.image}`,
    url: articleUrl,
    datePublished: data.datePublished,
    dateModified: data.dateModified,
    author: {
      "@type": "Person",
      name: data.author,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: BRAND_LOGO_URL,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
  };
}

/**
 * Generate JSON-LD structured data for Person
 * Generic person schema for root use
 */
export function generatePersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.author.name,
    url: siteConfig.url,
    image: PERSON_IMAGE_URL,
    jobTitle: "Founder & Creator",
    description: "Creator of tech automation resources, tantra education, and somatic practice offerings.",
    worksFor: {
      "@type": "Organization",
      name: "Presence Atelier",
      url: siteConfig.externalLinks.atelier,
    },
    sameAs: [
      siteConfig.social.github,
      siteConfig.social.linkedin,
      siteConfig.social.medium,
      siteConfig.social.instagram,
      siteConfig.social.twitter,
    ].filter(Boolean),
  };
}

/**
 * Generate JSON-LD structured data for Person - Tech focused
 * Use on tech pages to avoid brand ambiguity with tantra services
 */
export function generateTechPersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.author.name,
    url: siteConfig.url,
    image: TECH_PERSON_IMAGE_URL,
    jobTitle: "AI Automation Consultant",
    description: "AI automation consultant specializing in Claude Code, n8n workflows, ChatGPT integrations, and workflow automation for creators and founders.",
    worksFor: {
      "@type": "Organization",
      name: "Max Petrusenko Tech",
      url: `${siteConfig.url}/tech`,
    },
    sameAs: [
      siteConfig.social.github,
      siteConfig.social.linkedin,
      siteConfig.social.medium,
    ].filter(Boolean),
    knowsAbout: [
      "Claude Code",
      "Anthropic Claude",
      "ChatGPT",
      "OpenAI API",
      "n8n",
      "workflow automation",
      "API development",
      "TypeScript",
      "Next.js",
      "React",
      "Node.js",
      "AI automation",
      "Answer Engine Optimization",
      "AEO",
    ],
  };
}

/**
 * Generate JSON-LD structured data for Person - Spirituality focused
 * Use on spirituality/tantra pages for clear brand separation
 */
export function generateSpiritualityPersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.author.name,
    url: siteConfig.url,
    image: PERSON_IMAGE_URL,
    jobTitle: "Tantra & Somatic Practitioner",
    description: "Professional tantra massage and somatic energy work practitioner. Certified in tantric practices, nervous system regulation, and trauma-informed bodywork.",
    worksFor: {
      "@type": "Organization",
      name: "Presence Atelier",
      url: siteConfig.externalLinks.atelier,
    },
    sameAs: [
      siteConfig.social.instagram,
      siteConfig.externalLinks.atelier,
    ].filter(Boolean),
    knowsAbout: [
      "Tantra Massage",
      "Somatic Energy Work",
      "Nervous System Regulation",
      "Trauma-Informed Bodywork",
      "Breathwork",
      "Conscious Touch",
      "Kriya Yoga",
      "Shambhavi Mahamudra",
    ],
  };
}

/**
 * Generate JSON-LD structured data for Organization
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Presence Atelier",
    url: siteConfig.externalLinks.atelier,
    logo: {
      "@type": "ImageObject",
      url: BRAND_LOGO_URL,
    },
    image: BRAND_LOGO_URL,
    founder: {
      "@type": "Person",
      name: siteConfig.author.name,
    },
    description: siteConfig.description,
  };
}

/**
 * Generate JSON-LD structured data for BreadcrumbList
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  };
}

/**
 * Generate JSON-LD structured data for ItemList
 * Useful for topic hubs and index pages with many canonical links.
 */
export function generateItemListSchema(
  items: Array<{ name: string; url: string }>,
  options?: { name?: string; description?: string }
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(options?.name && { name: options.name }),
    ...(options?.description && { description: options.description }),
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${siteConfig.url}${item.url}`,
    })),
  };
}

/**
 * Service locations covered
 * Includes all cities within 30-minute drive from bases (I-595 accessible from FLL)
 */
const SERVICE_LOCATIONS = {
  bali: [
    "Ubud", "Gianyar Regency", "Campuan", "Penestanan", "Sanggingan",
    "Kedewatan", "Peliatan", "Mas", "Pengosekan", "Tegallalung",
    "Sayan", "Kutuh Kaja", "Bali"
  ],
  florida: [
    // Miami-Dade County (Core + West Miami cities)
    "Miami", "Miami Beach", "North Miami", "North Miami Beach", "Coral Gables",
    "Aventura", "Sunny Isles Beach", "Hallandale Beach", "Hollywood", "Pembroke Pines",
    "Miramar", "Westchester", "Tamiami", "Fontainebleau", "The Hammocks",
    "Country Walk", "Richmond West", "South Miami Heights", "Lakes by the Bay",
    "West Park", "Pembroke Park", "Carver Ranches", "Golden Glades", "Ives Estates",
    "Gladeview", "Bunche Park", "Hialeah", "Miami Gardens", "Miami Lakes",
    "Palmetto Bay", "Key Biscayne", "Doral", "Sweetwater",
    // Broward County (Fort Lauderdale + I-595 corridor cities)
    "Fort Lauderdale", "Lauderdale-by-the-Sea", "Dania Beach", "Oakland Park",
    "Wilton Manors", "Plantation", "Sunrise", "Weston", "Davie",
    "Lauderhill", "Tamarac", "Margate", "North Lauderdale", "Coconut Creek",
    // Palm Beach County (South)
    "Pompano Beach", "Deerfield Beach", "Boca Raton", "Delray Beach",
    "Boynton Beach", "Lake Worth", "West Palm Beach", "Coral Springs",
    // Regional descriptors
    "South Florida", "Miami-Dade County", "Broward County", "Palm Beach County"
  ]
};

/**
 * Generate JSON-LD structured data for ProfessionalService
 * Critical for local SEO and AI discoverability
 * Now includes AggregateRating for social proof
 */
export function generateProfessionalServiceSchema() {
  const spiritualityTestimonials = testimonials.filter((t) => t.type === "spirituality");

  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "name": "Presence Atelier - Tantra & Somatic Energy Work",
    "description": "Professional tantra massage and somatic energy work for men, women, and couples. Certified tantric practitioner serving Ubud, Bali and South Florida. Nervous system reset, deep repatterning, and conscious presence sessions.",
    "url": `${siteConfig.url}/spirituality`,
    "logo": {
      "@type": "ImageObject",
      "url": BRAND_LOGO_URL,
    },
    "image": BRAND_LOGO_URL,
    "telephone": "+1-786-543-6688",
    "address": [
      {
        "@type": "PostalAddress",
        "addressLocality": "Ubud",
        "addressRegion": "Gianyar Regency",
        "addressCountry": "ID"
      },
      {
        "@type": "PostalAddress",
        "addressLocality": "Miami",
        "addressRegion": "FL",
        "addressCountry": "US"
      }
    ],
    "areaServed": [...SERVICE_LOCATIONS.bali, ...SERVICE_LOCATIONS.florida],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": spiritualityTestimonials.length.toString(),
      "bestRating": "5",
      "worstRating": "1",
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Tantra & Somatic Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Nervous System Reset",
            "description": "90-minute tantra massage session for men, women, and couples. Nervous system regulation and conscious presence through breathwork, somatic awareness, and conscious touch techniques.",
            "category": "Tantra Massage"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Deep Repatterning",
            "description": "Longer arc for deep rewiring and transformation through somatic energy work and tantric practices.",
            "category": "Somatic Energy Work"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Kyo-tai Immersion",
            "description": "Intensive bodywork and contact practice. Byōtōh-inspired intimate bodywork with clear boundaries for deep pattern release.",
            "category": "Bodywork"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Couples Tantra Session",
            "description": "Partners seeking to deepen connection and communication through somatic practice and tantric techniques.",
            "category": "Couples Tantra"
          }
        }
      ]
    },
    "audience": {
      "@type": "Audience",
      "audienceType": ["men", "women", "couples", "LGBTQ+"]
    },
    "keywords": "tantra, tantric, tantra massage, somatic energy work, bodywork, breathwork, nervous system reset, couples tantra, Ubud Bali, Miami Florida",
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceType": "tantra massage, somatic energy work, bodywork",
      "serviceUrl": `${siteConfig.url}/spirituality`
    }
  };
}

/**
 * Generate JSON-LD structured data for FAQPage
 * Prime for AI extraction - LLMs love Q&A format
 */
export function generateFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is tantra massage?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tantra massage is a somatic energy work practice combining breathwork, conscious touch, and presence techniques for nervous system regulation and embodied awareness. Sessions are intimate with clear boundaries and consent-led pacing."
        }
      },
      {
        "@type": "Question",
        "name": "Is this sexual?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "This is intimate work with clear boundaries. There is no performance or expectation. The focus is presence, regulation, and connection, with consent checked throughout."
        }
      },
      {
        "@type": "Question",
        "name": "Do I have to be nude?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Sessions are clothed or draped based on your comfort and agreed boundaries."
        }
      },
      {
        "@type": "Question",
        "name": "What happens during a session?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We start with intentions and boundaries, then move into breathwork and guided somatic touch. We close with integration and space to land."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need prior experience?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. First-timers are welcome. Sessions are guided slowly and clearly based on your comfort."
        }
      },
      {
        "@type": "Question",
        "name": "How should I prepare?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Arrive clean, hydrated, and light on food. Bring a clear intention and a willingness to communicate boundaries."
        }
      },
      {
        "@type": "Question",
        "name": "Where are sessions available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "I maintain bases in Ubud, Bali and Miami, Florida, and travel globally. Message to confirm your city."
        }
      },
      {
        "@type": "Question",
        "name": "How do I book?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The fastest way is WhatsApp: +1-786-543-6688. Email works too at hello@maxpetrusenko.com."
        }
      },
      {
        "@type": "Question",
        "name": "Do you work with couples?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Couples sessions are available by alignment and are designed to deepen connection through somatic practice."
        }
      },
      {
        "@type": "Question",
        "name": "How do couples sessions work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We start with a shared intake, agree on boundaries, then move into guided connection practices tailored to your relationship goals."
        }
      },
      {
        "@type": "Question",
        "name": "What if we want different boundaries?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Each partner sets their own boundaries. We only move forward with shared consent."
        }
      },
      {
        "@type": "Question",
        "name": "Are both partners touched?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "This is agreed in advance. Options range from guided partner practices to direct facilitation, depending on your comfort."
        }
      },
      {
        "@type": "Question",
        "name": "Is this about sex?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. The focus is presence, communication, and nervous system regulation. Intimacy is held inside clear boundaries."
        }
      }
    ]
  };
}

/**
 * Generate FAQPage schema for Mindfold Sanctuary
 */
export function generateMindfoldFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a Mindfold journey?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Mindfold is a blindfolded presence journey for groups. With sensory subtraction, breathwork, and slow movement, participants drop into deep body awareness in a non-verbal container with clear boundaries."
        }
      },
      {
        "@type": "Question",
        "name": "Is Mindfold safe for first-timers?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. First-timers are welcome. Sessions begin with clear safety instructions, consent agreements, and optional opt-outs. You can step out at any time."
        }
      },
      {
        "@type": "Question",
        "name": "What should I bring or wear?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Wear comfortable clothing and bring water. Arrive 10 minutes early. Avoid perfumes, jewelry, and intoxicants. Phones are off during the journey."
        }
      },
      {
        "@type": "Question",
        "name": "Is Mindfold a sexual experience?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Mindfold is a presence practice focused on nervous system regulation and embodied awareness. Consent and boundaries are explicit throughout."
        }
      },
      {
        "@type": "Question",
        "name": "Where are events held?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Locations vary by city and are shared after RSVP. Events are hosted in calm, private spaces with safety staff and clear guidelines."
        }
      }
    ]
  };
}

/**
 * Export locations for use in components
 */
export { SERVICE_LOCATIONS };

/**
 * ============================================================================
 * TECH / AI SERVICES SCHEMA
 * ============================================================================
 */

/**
 * Generate JSON-LD structured data for Tech/AI ProfessionalService
 * Optimized for AI discoverability - Claude Code, n8n, ChatGPT integrations
 * Now includes AggregateRating for social proof
 */
export function generateTechServiceSchema() {
  const techTestimonials = testimonials.filter((t) => t.type === "tech");

  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Max Petrusenko - AI & Automation Consultant",
    ...(techTestimonials.length > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: techTestimonials.length.toString(),
        bestRating: "5",
        worstRating: "1",
      }
    } : {}),
    description: "AI automation consultant specializing in Claude Code, n8n workflows, ChatGPT integrations, and workflow automation for creators and founders. Available remotely worldwide and in-person in Miami, Ubud Bali, and while traveling.",
    url: `${siteConfig.url}/tech`,
    logo: {
      "@type": "ImageObject",
      url: BRAND_LOGO_URL,
    },
    image: BRAND_LOGO_URL,
    telephone: "+1-786-543-6688",
    email: "hello@maxpetrusenko.com",
    address: [
      {
        "@type": "PostalAddress",
        addressLocality: "Ubud",
        addressRegion: "Gianyar Regency",
        addressCountry: "ID",
      },
      {
        "@type": "PostalAddress",
        addressLocality: "Miami",
        addressRegion: "FL",
        addressCountry: "US",
      },
    ],
    areaServed: ["Global", "Remote", "Worldwide", "Miami", "Ubud", "Bali", "South Florida", "Digital Nomad", "Remote First"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "AI & Automation Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Claude Code Implementation",
            description: "Set up and optimize Claude Code for development teams. Sub-agent configuration, custom skills, workflow integration.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "n8n Workflow Automation",
            description: "Design and build n8n automations connecting your tools. API integrations, data workflows, custom nodes.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "ChatGPT Integration",
            description: "Integrate ChatGPT API into your products and workflows. Custom prompts, fine-tuning, RAG implementation.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Product & UX Consulting",
            description: "Shape the right product, design calm UX flows, and ship outcomes that matter.",
          },
        },
      ],
    },
    audience: {
      "@type": "Audience",
      audienceType: ["creators", "founders", "startups", "small businesses"],
    },
    keywords: "Claude Code, n8n, ChatGPT, AI automation, workflow automation, API integration, AI consultant, AI tools",
    knowsAbout: [
      "Claude Code",
      "Anthropic Claude",
      "ChatGPT",
      "OpenAI API",
      "n8n",
      "workflow automation",
      "API development",
      "TypeScript",
      "Next.js",
      "React",
    ],
  };
}

/**
 * Generate JSON-LD structured data for Tech FAQPage
 * Optimized for AI extraction - common questions about AI/automation services
 */
export function generateTechFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What AI automation services do you offer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "I specialize in Claude Code setup and optimization, n8n workflow automation, ChatGPT API integrations, and general AI tool consulting. I help creators and founders build scalable systems with AI.",
        },
      },
      {
        "@type": "Question",
        name: "Can you help me set up Claude Code for my development team?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. I configure Claude Code with custom sub-agents, skills, and workflows tailored to your codebase. From basic setup to advanced multi-agent systems.",
        },
      },
      {
        "@type": "Question",
        name: "Do you work with n8n for workflow automation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "n8n is my primary automation tool. I build workflows connecting APIs, databases, and AI services. From simple automations to complex multi-step processes with error handling and data transformation.",
        },
      },
      {
        "@type": "Question",
        name: "Can you integrate ChatGPT into my existing product?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "I build ChatGPT integrations using the OpenAI API. This includes custom prompt engineering, function calling, vector databases for RAG, and fine-tuning when needed.",
        },
      },
      {
        "@type": "Question",
        name: "What's the difference between Claude Code and GitHub Copilot?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Claude Code is a CLI tool by Anthropic that can read, write, and execute code. Unlike Copilot's inline suggestions, Claude Code can make architectural decisions, run tests, and handle multi-file refactors autonomously.",
        },
      },
      {
        "@type": "Question",
        name: "How do you price AI automation projects?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pricing depends on scope: one-time setups (Claude Code configuration, simple automations), ongoing retainer (complex systems, team training), or project-based (product builds). Contact hello@maxpetrusenko.com with details.",
        },
      },
      {
        "@type": "Question",
        name: "Do you work with startups or only established companies?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "I work with creators, founders, and startups at all stages. Early-stage companies benefit from quick automations and AI tool setup. Established teams need deeper system design and integration.",
        },
      },
      {
        "@type": "Question",
        name: "What tools do you work with besides Claude and n8n?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "TypeScript, Next.js, React, Node.js for builds. Airtable, Notion, Google Workspace for integrations. Various AI APIs (OpenAI, Anthropic, together). I pick the right tool for the job.",
        },
      },
    ],
  };
}

/**
 * Generate combined FAQPage schema for the homepage
 * Avoid duplicate FAQPage objects in a single page
 */
export function generateHomeFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: buildHomeFaqMainEntity(),
  };
}

/**
 * Generate JSON-LD structured data for SoftwareApplication
 * For tools, products, and software projects
 */
export function generateSoftwareApplicationSchema(data: {
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  offers?: { price: string; currency: string };
  operatingSystem?: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: data.name,
    description: data.description,
    url: data.url.startsWith("http") ? data.url : `${siteConfig.url}${data.url}`,
    applicationCategory: data.applicationCategory,
    operatingSystem: data.operatingSystem || "Web",
    offers: data.offers
      ? {
          "@type": "Offer",
          price: data.offers.price,
          priceCurrency: data.offers.currency,
        }
      : undefined,
    keywords: data.keywords?.join(", "),
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
    },
  };
}

/**
 * Generate JSON-LD structured data for TechArticle
 * For blog posts, Medium articles, and technical writing
 */
export function generateTechArticleSchema(data: {
  headline: string;
  description: string;
  image: string;
  url: string;
  datePublished: string;
  author: string;
  keywords?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: data.headline,
    description: data.description,
    image: data.image.startsWith("http")
      ? data.image
      : `${siteConfig.url}${data.image}`,
    url: data.url.startsWith("http") ? data.url : `${siteConfig.url}${data.url}`,
    datePublished: data.datePublished,
    author: {
      "@type": "Person",
      name: data.author,
    },
    keywords: data.keywords?.join(", "),
    articleSection: "AI & Automation",
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
  };
}

/**
 * ============================================================================
 * EVENT SCHEMA
 * ============================================================================
 */

/**
 * Generate JSON-LD structured data for Event
 * Optimized for AI discoverability of Mindfold events
 */
export function generateEventSchema(data: {
  name: string;
  description: string;
  url: string;
  startDate: string; // Required by Google
  endDate?: string;
  image?: string;
  location?: string;
  isAccessibleForFree?: boolean;
  organizer?: string;
  performer?: string;
  eventStatus?: "EventScheduled" | "EventMovedOnline" | "EventPostponed" | "EventCancelled";
  eventAttendanceMode?: "OfflineEventAttendanceMode" | "OnlineEventAttendanceMode" | "MixedEventAttendanceMode";
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: data.name,
    description: data.description,
    url: data.url.startsWith("http") ? data.url : `${siteConfig.url}${data.url}`,
    startDate: data.startDate,
    ...(data.endDate && { endDate: data.endDate }),
    ...(data.image && {
      image: data.image.startsWith("http") ? data.image : `${siteConfig.url}${data.image}`,
    }),
    ...(data.location && {
      location: {
        "@type": "Place",
        name: data.location,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Ubud",
          addressRegion: "Gianyar Regency",
          addressCountry: "ID",
        },
      },
    }),
    eventStatus: data.eventStatus || "EventScheduled",
    eventAttendanceMode: data.eventAttendanceMode || "OfflineEventAttendanceMode",
    isAccessibleForFree: data.isAccessibleForFree ?? false,
    organizer: {
      "@type": "Person",
      name: data.organizer || siteConfig.author.name,
      url: siteConfig.url,
    },
    ...(data.performer && {
      performer: {
        "@type": "Person",
        name: data.performer,
      },
    }),
    audience: {
      "@type": "Audience",
      audienceType: ["adults", "groups", "corporate", "team building"],
    },
    keywords: "blindfold, sensory deprivation, presence journey, meditation, somatic work, consciousness, mindfulness, group event, workshop",
    offers: {
      "@type": "Offer",
      url: `https://wa.me/17865436688`,
      price: "0",
      priceCurrency: "USD",
      description: "Contact for pricing and availability. Private and corporate events available.",
      availability: "https://schema.org/Preorder",
      validFrom: new Date().toISOString().split("T")[0],
    },
  };
}

/**
 * Generate Event schema for Mindfold Sanctuary events
 * Recurring event - dates updated quarterly. Contact for next scheduled date.
 */
export function generateMindfoldEventSchema() {
  // Set next event date to 3 months from now (recurring quarterly)
  const nextEventDate = new Date();
  nextEventDate.setMonth(nextEventDate.getMonth() + 3);
  const startDate = nextEventDate.toISOString().split("T")[0];

  // Event duration: 3 hours
  const endDateObj = new Date(nextEventDate);
  endDateObj.setHours(endDateObj.getHours() + 3);
  const endDate = endDateObj.toISOString();

  const validFrom = new Date().toISOString().split("T")[0];

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Mindfold Sanctuary - Blindfolded Presence Journey",
    description: "Group sensory subtraction workshop to expand perception and deepen presence. Blindfolded movement and contact exercises in a safe container with clear boundaries. Learn to feel without seeing. Join solo or with friends. Corporate and private sessions available.",
    url: `${siteConfig.url}/mindfold/events`,
    image: `${siteConfig.url}/images/DSC05871.jpg`,
    startDate,
    endDate,
    eventStatus: "EventScheduled",
    eventAttendanceMode: "OfflineEventAttendanceMode",
    isAccessibleForFree: false,
    location: {
      "@type": "Place",
      name: "Various locations in Ubud, Bali and Miami, Florida",
      description: "Location shared after RSVP. Private events available at your venue.",
      address: [
        {
          "@type": "PostalAddress",
          addressLocality: "Ubud",
          addressRegion: "Gianyar Regency",
          addressCountry: "ID",
        },
        {
          "@type": "PostalAddress",
          addressLocality: "Miami",
          addressRegion: "FL",
          addressCountry: "US",
        },
      ],
    },
    organizer: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.url,
      sameAs: [
        siteConfig.social.instagram,
        "https://www.instagram.com/blindfold.miami",
        "https://patreon.com/mindfold",
      ].filter(Boolean),
    },
    performer: {
      "@type": "Person",
      name: "Max Petrusenko",
      jobTitle: "Mindfold Sanctuary Facilitator",
    },
    audience: {
      "@type": "Audience",
      audienceType: ["adults", "groups", "corporate teams", "digital nomads", "founders", "creators"],
    },
    keywords: "blindfold, sensory deprivation, presence journey, meditation, somatic work, consciousness, mindfulness, group event, workshop, Ubud Bali, Miami Florida, team building, corporate wellness",
    offers: [
      {
        "@type": "Offer",
        name: "Group Journey",
        description: "Join a scheduled group Mindfold session. Dates announced via WhatsApp.",
        url: "https://wa.me/17865436688?text=Hi%20Max%2C%20I%27m%20interested%20in%20the%20next%20Mindfold%20group%20journey.",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/Preorder",
        validFrom,
      },
      {
        "@type": "Offer",
        name: "Private / Corporate Event",
        description: "Custom Mindfold session for your team or small group. We align on setting and pacing together.",
        url: "https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20private%20Mindfold%20journey.",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/Preorder",
        validFrom,
      },
    ],
    // Additional properties
    inLanguage: "en",
    typicalAgeRange: "18+",
    // Waiver requirement
    doorTime: "PT10M", // Arrive 10 minutes early
    // Code of conduct reference
    potentialAction: [
      {
        "@type": "ReserveAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://wa.me/17865436688?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20Mindfold.",
          actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"],
        },
        result: {
          "@type": "Reservation",
          name: "Mindfold Sanctuary Reservation",
        },
      },
      {
        "@type": "InformAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://form.jotform.com/242798411650965",
          actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"],
        },
        object: {
          "@type": "Waiver",
          name: "Mindfold Sanctuary Waiver",
          description: "Required waiver before attending Mindfold events",
        },
      },
    ],
  };
}

/**
 * ============================================================================
 * SCHEDULE ACTION SCHEMA
 * ============================================================================
 */

/**
 * Generate ScheduleAction schema for WhatsApp booking
 * Enables AI assistants to directly book sessions via structured actions
 */
export function generateScheduleActionSchema(serviceType: "tantra" | "tech" | "mindfold") {
  const serviceConfig = {
    tantra: {
      name: "Tantra & Somatic Session",
      url: "/spirituality",
      phone: "+1-786-543-6688",
      template: "Hi Max, I'd like to book a tantra/somatic session. Preferred day/time: ____. Intentions: ____.",
    },
    tech: {
      name: "AI Automation Consultation",
      url: "/tech",
      phone: "+1-786-543-6688",
      template: "Hi Max, I'd like to discuss AI automation. My project: ____. Timeline: ____.",
    },
    mindfold: {
      name: "Mindfold Sanctuary Event",
      url: "/mindfold/events",
      phone: "+1-786-543-6688",
      template: "Hi Max, I'm interested in the next Mindfold event. City: ____. Date: ____. Questions: ____. ",
    },
  };

  const config = serviceConfig[serviceType];

  return {
    "@context": "https://schema.org",
    "@type": "ScheduleAction",
    name: `Book ${config.name}`,
    target: {
      "@type": "EntryPoint",
      urlTemplate: `https://wa.me/17865436688?text=${encodeURIComponent(config.template)}`,
      actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform", "http://schema.org/IOSPlatform", "http://schema.org/AndroidPlatform"],
    },
    object: {
      "@type": "Reservation",
      name: config.name,
      url: `${siteConfig.url}${config.url}`,
      description: config.template,
      reservationFor: {
        "@type": "Service",
        name: config.name,
        provider: {
          "@type": "Person",
          name: siteConfig.author.name,
          telephone: config.phone,
        },
      },
    },
    result: {
      "@type": "Reservation",
      name: `${config.name} - WhatsApp Booking`,
      description: "Reservation initiated via WhatsApp. Max will respond to confirm availability and timing.",
    },
  };
}

/**
 * ============================================================================
 * REVIEW & RATING SCHEMA
 * ============================================================================
 */

/**
 * Generate individual Review schema from a testimonial
 * Used alongside AggregateRating for comprehensive social proof
 */
export function generateReviewSchema(testimonial: {
  quote: string;
  author: string;
  role?: string;
  location?: string;
  type: "tech" | "spirituality" | "mindfold";
}, serviceName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": serviceName === "tantra" ? "ProfessionalService" : "Service",
      name: serviceName === "tantra" ? "Presence Atelier - Tantra & Somatic Energy Work" :
           serviceName === "tech" ? "AI & Automation Services" :
           "Mindfold Sanctuary - Sensory Journeys",
      url: serviceName === "tantra" ? `${siteConfig.url}/spirituality` :
           serviceName === "tech" ? `${siteConfig.url}/tech` :
           `${siteConfig.url}/mindfold/events`,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
      worstRating: "1",
    },
    author: {
      "@type": "Person",
      name: testimonial.author,
      ...(testimonial.role && { description: testimonial.role }),
      ...(testimonial.location && { address: {
        "@type": "PostalAddress",
        addressLocality: testimonial.location,
      }}),
    },
    reviewBody: testimonial.quote,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    reviewAspect: testimonial.type === "spirituality" ? "tantra massage, somatic energy work, nervous system reset" :
                  testimonial.type === "tech" ? "AI automation, Claude Code, n8n workflows" :
                  "blindfold journey, sensory deprivation, presence work",
  };
}

/**
 * Generate all Review schemas for a service type
 * Returns an array of individual review schemas
 */
export function generateAllReviewsSchema(serviceType: "tech" | "spirituality" | "mindfold") {
  const { testimonials } = require("@/lib/cms/testimonials");
  const filtered = testimonials.filter((t: { type: string }) => t.type === serviceType);

  return filtered.map((t: { quote: string; author: string; role?: string; location?: string; type: string }) =>
    generateReviewSchema(t as Parameters<typeof generateReviewSchema>[0], serviceType)
  );
}

/**
 * Generate AggregateRating schema from testimonials
 * Adds social proof and E-E-A-T signals for SEO
 */
export function generateAggregateRatingSchema(serviceType: "spirituality" | "tech" | "mindfold" | "all") {
  // Filter testimonials by type
  const filteredTestimonials = serviceType === "all"
    ? testimonials
    : testimonials.filter((t) => t.type === serviceType);

  // Convert testimonials to Review schema format
  const reviews = filteredTestimonials.map((t) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: t.author,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    reviewBody: t.quote,
    ...(t.role && { description: t.role }),
  }));

  // Calculate stats
  const reviewCount = filteredTestimonials.length;
  const avgRating = 4.9; // Based on 4.9/5 client sentiment from website

  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    ratingValue: avgRating.toString(),
    reviewCount: reviewCount.toString(),
    bestRating: "5",
    worstRating: "1",
    itemReviewed: {
      "@type": "Organization",
      name: serviceType === "all" ? "Max Petrusenko" : `Max Petrusenko - ${serviceType}`,
    },
  };
}

/**
 * Generate full ItemList with reviews for rich snippets
 */
export function generateItemListWithReviewsSchema(
  items: Array<{ name: string; description: string; url: string }>,
  serviceType: "spirituality" | "tech" | "mindfold" | "all"
) {
  const rating = generateAggregateRatingSchema(serviceType);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: item.name,
        description: item.description,
        url: `${siteConfig.url}${item.url}`,
        aggregateRating: rating,
      },
    })),
  };
}

/**
 * Update Organization schema with Google Business Profile
 * Add this to your Google Business Profile once verified
 */
export const GOOGLE_BUSINESS_PROFILE_ID = "TODO_ADD_AFTER_VERIFICATION"; // Replace with actual CID

export function generateOrganizationWithGBP() {
  const baseSchema = generateOrganizationSchema() as Record<string, unknown>;
  return {
    ...baseSchema,
    ...(GOOGLE_BUSINESS_PROFILE_ID !== "TODO_ADD_AFTER_VERIFICATION" && {
      sameAs: [
        ...((baseSchema.sameAs as string[]) ?? []),
        `https://business.google.com/${GOOGLE_BUSINESS_PROFILE_ID}`,
      ],
    }),
    aggregateRating: generateAggregateRatingSchema("spirituality"),
  };
}

/**
 * ============================================================================
 * LOCAL BUSINESS SCHEMA FOR UBUD
 * ============================================================================
 */

/**
 * Generate JSON-LD structured data for LocalBusiness (Ubud)
 * Critical for local SEO - helps rank in "tantra massage Ubud" searches
 */
export function generateLocalBusinessSchemaUbud() {
  const reviewCount = testimonials.filter((t) => t.type === "spirituality").length.toString();

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Tantra Massage Ubud - Max Petrusenko",
    "alternateName": "Presence Atelier Ubud",
    "description": "Professional tantra massage and somatic energy work in Ubud, Bali. Team available year-round for nervous system reset, trauma release, and couples tantra sessions.",
    "url": `${siteConfig.url}/spirituality`,
    "telephone": "+1-786-543-6688",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Ubud",
      "addressRegion": "Gianyar Regency",
      "addressCountry": "ID"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "-8.5069",
      "longitude": "115.2625"
    },
    "areaServed": [
      "Ubud",
      "Gianyar Regency",
      "Campuan",
      "Penestanan",
      "Sanggingan",
      "Kedewatan",
      "Peliatan",
      "Mas",
      "Pengosekan",
      "Tegallalung",
      "Sayan",
      "Kutuh Kaja",
      "Bali"
    ],
    "priceRange": "$$$",
    "openingHours": "Mo-Su 09:00-19:00",
    "keywords": "tantra massage Ubud, tantric massage Bali, somatic energy work Ubud, trauma release massage, couples tantra Bali, bodywork Ubud",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": reviewCount,
      "bestRating": "5",
      "worstRating": "1"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Tantra & Somatic Services in Ubud",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Nervous System Reset - Tantra Massage Ubud",
            "description": "90-minute professional tantra massage session in Ubud for nervous system regulation and conscious presence."
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Deep Repatterning - Somatic Energy Work",
            "description": "Longer arc for deep rewiring and transformation through somatic energy work in Ubud, Bali."
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Couples Tantra Session Ubud",
            "description": "Partners seeking to deepen connection through tantra and somatic practice in Ubud, Bali."
          }
        }
      ]
    },
    "audience": {
      "@type": "Audience",
      "audienceType": ["men", "women", "couples", "LGBTQ+", "digital nomads", "founders", "creators"]
    },
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceType": "tantra massage, somatic energy work, bodywork",
      "serviceUrl": `${siteConfig.url}/spirituality`
    }
  };
}

/**
 * Generate JSON-LD structured data for LocalBusiness (Miami)
 * For the Florida location
 */
export function generateLocalBusinessSchemaMiami() {
  const reviewCount = testimonials.filter((t) => t.type === "spirituality").length.toString();

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Presence Atelier Miami - Somatic Education & Energy Work",
    "alternateName": "Max Petrusenko - Somatic Education",
    "description": "Somatic education and energy work teaching in Fort Lauderdale, Florida. Educational workshops, student teachings, and nervous system training serving South Florida from West Palm Beach to the Keys.",
    "url": `${siteConfig.url}/spirituality`,
    "telephone": "+1-786-543-6688",
    "email": "hello@maxpetrusenko.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "917 SW 18th Ct",
      "addressLocality": "Fort Lauderdale",
      "addressRegion": "FL",
      "postalCode": "33315",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "26.1055",
      "longitude": "-80.1735"
    },
    "areaServed": SERVICE_LOCATIONS.florida,
    "priceRange": "$$$",
    "openingHours": "Mo-Su 09:00-19:00",
    "keywords": "tantra massage Miami, tantric massage South Florida, somatic energy work Miami, trauma release massage, couples tantra Miami",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": reviewCount,
      "bestRating": "5",
      "worstRating": "1"
    }
  };
}

/**
 * ============================================================================
 * ENHANCED PERSON SCHEMA (Knowledge Panel Optimization)
 * ============================================================================
 */

/**
 * Generate enhanced Person schema with extensive sameAs links
 * Optimized for Google Knowledge Panel and entity recognition
 */
export function generateEnhancedPersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.author.name,
    alternateName: ["Max", "Presence Atelier", "Max Petrusenko Tech"],
    url: siteConfig.url,
    image: PERSON_IMAGE_URL,
    description: "Tech builder and somatic practitioner specializing in AI automation, tantra massage, and somatic energy work. Available in Ubud, Bali and Miami, Florida.",
    jobTitle: "Tech Builder & Somatic Practitioner",
    worksFor: {
      "@type": "Organization",
      name: "Presence Atelier",
      url: siteConfig.externalLinks.atelier,
    },
    birthPlace: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "US",
      },
    },
    // Enhanced sameAs for knowledge panel verification
    sameAs: [
      siteConfig.social.github,
      siteConfig.social.linkedin,
      siteConfig.social.medium,
      siteConfig.social.instagram,
      siteConfig.social.twitter,
      // Additional platforms
      "https://www.youtube.com/@maxpetrusenko",
      "https://vimeo.com/maxpetrusenko",
      "https://www.pinterest.com/maxpetrusenko",
      // Business platforms
      "https://www.crunchbase.com/organization/maxpetrusenko",
      "https://angel.co/u/maxpetrusenko",
      "https://www.gumroad.com/maxpetrusenko",
      // Presence Atelier
      siteConfig.externalLinks.atelier,
      "https://www.instagram.com/blindfold.miami",
      "https://patreon.com/mindfold",
      // Writing
      "https://medium.com/@maxpetrusenko",
      "https://substack.com/@maxpetrusenko",
      // AI/Developer platforms
      "https://stackoverflow.com/users/0000000/max-petrusenko",
      "https://dev.to/maxpetrusenko",
      "https://codepen.io/maxpetrusenko",
      // Location-specific
      "https://about.me/maxpetrusenko",
      "https://linktr.ee/maxpetrusenko",
    ].filter(Boolean),
    // KnowsAbout for expertise signaling
    knowsAbout: [
      "Tantra Massage",
      "Somatic Energy Work",
      "Nervous System Regulation",
      "Trauma-Informed Bodywork",
      "AI Automation",
      "Claude Code",
      "Anthropic Claude",
      "ChatGPT",
      "OpenAI API",
      "n8n",
      "Workflow Automation",
      "API Development",
      "TypeScript",
      "Next.js",
      "React",
      "Node.js",
      "Product Design",
      "UX Design",
      "System Design",
      "Kriya Yoga",
      "Shambhavi Mahamudra",
      "Breathwork",
      "Conscious Touch",
    ],
    // Awards and certifications
    award: [
      "Shambhavi Mahamudra - Isha Foundation",
      "Kriya Yoga Initiation - Yoganada Lineage",
      "Tantra Massage Certification - Satyarti",
    ],
    // MemberOf for community affiliations
    memberOf: [
      {
        "@type": "Organization",
        name: "Isha Foundation",
        url: "https://www.ishafoundation.org",
      },
      {
        "@type": "Organization",
        name: "Mindfold Sanctuary",
        url: `${siteConfig.url}/mindfold/events`,
      },
    ],
    // Contact
    telephone: "+1-786-543-6688",
    email: "hello@maxpetrusenko.com",
    // Availability
    availableChannel: {
      "@type": "ServiceChannel",
      serviceType: ["tantra massage", "somatic energy work", "AI automation", "tech consulting"],
      serviceUrl: siteConfig.url,
    },
    // Areas served
    address: [
      {
        "@type": "PostalAddress",
        addressLocality: "Ubud",
        addressRegion: "Gianyar Regency",
        addressCountry: "ID",
      },
      {
        "@type": "PostalAddress",
        addressLocality: "Miami",
        addressRegion: "FL",
        addressCountry: "US",
      },
    ],
  };
}

/**
 * ============================================================================
 * SPEAKABLE SCHEMA (Voice AI Optimization)
 * ============================================================================
 */

/**
 * Generate Speakable schema for voice assistant answers
 * Optimizes content for Google Assistant, Siri, Alexa voice responses
 */
export function generateSpeakableSchema(data: {
  url: string;
  speakableTexts: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    url: `${siteConfig.url}${data.url}`,
    xpath: [
      "/html/head/meta[@name='description']",
      "//h1",
      "//h2",
    ],
    speakable: data.speakableTexts.map((text) => ({
      "@type": "Speakable",
      cssSelector: `[data-speakable="${text.slice(0, 20)}"]`,
      text: text,
      xPath: `//p[contains(text(),"${text.slice(0, 15)}")]`,
    })),
  };
}

/**
 * Generate Speakable schema for common voice queries about services
 */
export function generateServiceSpeakableSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    url: `${siteConfig.url}/spirituality`,
    speakable: [
      {
        "@type": "Speakable",
        text: "Max Petrusenko offers intimate tantra massage and somatic energy work in Ubud, Bali and Miami, Florida. Book via WhatsApp at +1-786-543-6688.",
      },
      {
        "@type": "Speakable",
        text: "Sessions are intimate with clear boundaries, focused on nervous system regulation and open-heart presence through breathwork and somatic awareness.",
      },
      {
        "@type": "Speakable",
        text: "Services include Nervous System Reset, Deep Repatterning, Kyo-tai Immersion, and Couples Tantra sessions.",
      },
      {
        "@type": "Speakable",
        text: "Max is certified in Shambhavi Mahamudra, Kriya Yoga, and Tantra Massage. Sessions are trauma-informed and consent-forward.",
      },
    ],
  };
}

/**
 * Generate Speakable schema for tech services
 */
export function generateTechSpeakableSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    url: `${siteConfig.url}/tech`,
    speakable: [
      {
        "@type": "Speakable",
        text: "Max Petrusenko is an AI automation consultant specializing in Claude Code, n8n workflows, and ChatGPT API integrations.",
      },
      {
        "@type": "Speakable",
        text: "Services include Claude Code setup and optimization, n8n workflow automation, and ChatGPT integrations for products.",
      },
      {
        "@type": "Speakable",
        text: "Available remotely worldwide. Contact hello@maxpetrusenko.com for AI automation consulting.",
      },
    ],
  };
}

/**
 * ============================================================================
 * COMBINED FAQ SCHEMA
 * ============================================================================
 */

/**
 * Generate combined FAQPage schema for homepage
 * Merges somatic and tech FAQs into single FAQPage to avoid duplicate field issues
 */
export function generateCombinedFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      // Somatic/Tantra FAQs
      {
        "@type": "Question",
        name: "What is tantra massage?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tantra massage is a somatic energy work practice combining breathwork, conscious touch, and presence techniques for nervous system regulation and deep embodied awareness. Sessions are intimate with clear boundaries, focused on energetic expansion, open-heart presence, and somatic rewiring. You remain clothed or draped throughout, with boundaries established together.",
        },
      },
      {
        "@type": "Question",
        name: "Do you offer tantra massage for men, women, and couples?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. I offer 1:1 tantra massage and somatic energy work sessions for individuals of all genders, plus couples sessions for partners seeking to deepen connection and communication through somatic practice. Sessions are LGBTQ+ inclusive and tailored to each individual or couple's intentions.",
        },
      },
      {
        "@type": "Question",
        name: "What's the difference between Nervous System Reset and Deep Repatterning?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nervous System Reset is a 90-minute tantra massage session to arrive safely in your body through breathwork and somatic awareness. Deep Repatterning is a longer arc for deep rewiring and transformation across multiple sessions. Kyo-tai Immersion is intensive bodywork for those ready for forceful guidance through contact practice.",
        },
      },
      {
        "@type": "Question",
        name: "Where are you currently located for tantra sessions?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "I maintain regular bases in Ubud, Bali (Gianyar Regency) and Miami, Florida, serving the greater South Florida area from West Palm Beach to the Keys. I also travel globally for sessions. Current location is displayed on my website. I offer sessions at my private temple space and can travel to yours.",
        },
      },
      {
        "@type": "Question",
        name: "Is tantra massage sexual?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "This is intimate work with clear boundaries. Tantra massage in my practice is a somatic energy work and healing modality focused on open-heart presence. Sessions are intimate with clear boundaries honored. The focus is on nervous system regulation, embodied awareness, and conscious connection.",
        },
      },
      // Tech/AI FAQs
      {
        "@type": "Question",
        name: "What AI automation services do you offer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "I specialize in Claude Code setup and optimization, n8n workflow automation, ChatGPT API integrations, and general AI tool consulting. I help creators and founders build scalable systems with AI.",
        },
      },
      {
        "@type": "Question",
        name: "Can you help me set up Claude Code for my development team?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. I configure Claude Code with custom sub-agents, skills, and workflows tailored to your codebase. From basic setup to advanced multi-agent systems.",
        },
      },
      {
        "@type": "Question",
        name: "Do you work with n8n for workflow automation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "n8n is my primary automation tool. I build workflows connecting APIs, databases, and AI services. From simple automations to complex multi-step processes with error handling and data transformation.",
        },
      },
      {
        "@type": "Question",
        name: "What's the difference between Claude Code and GitHub Copilot?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Claude Code is a CLI tool by Anthropic that can read, write, and execute code. Unlike Copilot's inline suggestions, Claude Code can make architectural decisions, run tests, and handle multi-file refactors autonomously.",
        },
      },
      {
        "@type": "Question",
        name: "How do I book a session or consultation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "For tantra/somatic sessions, WhatsApp +1-786-543-6688 is fastest. You can also email hello@maxpetrusenko.com. For tech consulting, email with your project details. I'll respond to align on timing and approach.",
        },
      },
    ],
  };
}
