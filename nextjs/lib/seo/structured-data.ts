import { siteConfig } from "@/config/site";
import { testimonials } from "@/lib/cms/testimonials";

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
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: data.description,
    image: data.image.startsWith("http")
      ? data.image
      : `${siteConfig.url}${data.image}`,
    url: `${siteConfig.url}${data.url}`,
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
        url: `${siteConfig.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}${data.url}`,
    },
  };
}

/**
 * Generate JSON-LD structured data for Person
 */
export function generatePersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.author.name,
    url: siteConfig.url,
    jobTitle: "Tech Builder & Somatic Practitioner",
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
 * Generate JSON-LD structured data for Organization
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Presence Atelier",
    url: siteConfig.externalLinks.atelier,
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
      "ratingValue:": "4.9",
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
            "description": "Intensive bodywork and contact practice. Byōtōh-inspired non-sexual bodywork for deep pattern release.",
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
          "text": "Tantra massage is a somatic energy work practice combining breathwork, conscious touch, and presence techniques for nervous system regulation and deep embodied awareness. Sessions are non-sexual, focused on energetic expansion, conscious presence, and somatic rewiring. You remain clothed or draped throughout, with clear boundaries established together."
        }
      },
      {
        "@type": "Question",
        "name": "Do you offer tantra massage for men, women, and couples?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. I offer 1:1 tantra massage and somatic energy work sessions for individuals of all genders, plus couples sessions for partners seeking to deepen connection and communication through somatic practice. Sessions are LGBTQ+ inclusive and tailored to each individual or couple's intentions."
        }
      },
      {
        "@type": "Question",
        "name": "What's the difference between Nervous System Reset and Deep Repatterning?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nervous System Reset is a 90-minute tantra massage session to arrive safely in your body through breathwork and somatic awareness. Deep Repatterning is a longer arc for deep rewiring and transformation across multiple sessions. Kyo-tai Immersion is intensive bodywork for those ready for forceful guidance through contact practice."
        }
      },
      {
        "@type": "Question",
        "name": "Where are you currently located for tantra sessions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "I maintain regular bases in Ubud, Bali (Gianyar Regency) and Miami, Florida, serving the greater South Florida area from West Palm Beach to the Keys. I also travel globally for sessions. Current location is displayed on my website. I offer sessions at my private temple space and can travel to yours."
        }
      },
      {
        "@type": "Question",
        "name": "What cities in South Florida do you serve?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "I serve the greater Miami-Fort Lauderdale area including Miami, Miami Beach, North Miami, Coral Gables, Aventura, Hollywood, Pembroke Pines, Fort Lauderdale, Pompano Beach, Boca Raton, Delray Beach, West Palm Beach, and surrounding cities in Miami-Dade, Broward, and Palm Beach counties."
        }
      },
      {
        "@type": "Question",
        "name": "What areas around Ubud do you serve in Bali?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Based in Ubud, Gianyar Regency, I serve the surrounding villages including Campuan, Penestanan, Sanggingan, Kedewatan, Peliatan, Mas, Pengosekan, Tegallalung, Sayan, and the greater Gianyar area of Bali."
        }
      },
      {
        "@type": "Question",
        "name": "Is tantra massage sexual?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Tantra massage in my practice is a somatic energy work and healing modality, not a sexual service. While tantra works with energy and sensation, sessions are non-sexual with clear boundaries. I do not initiate or respond to sexual behavior. The focus is on nervous system regulation, embodied awareness, and conscious presence."
        }
      },
      {
        "@type": "Question",
        "name": "What can I expect during a tantra massage session?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sessions begin with intention-setting and boundary agreement. I guide breathwork, somatic awareness, and conscious touch techniques. You remain clothed or draped throughout. The session focuses on nervous system regulation, energetic awareness, and deep presence. You can pause or redirect at any moment. Consent is verbal, ongoing, and respected."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need prior experience with tantra or somatic work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "All experience levels are welcome. Sessions are tailored to where you are. If you're new to somatic or tantra practices, I guide you slowly with clear communication. If you have experience, we can deepen into more intensive work. The pre-session questionnaire helps me understand your background and intentions."
        }
      },
      {
        "@type": "Question",
        "name": "How do I book a tantra or somatic session?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The fastest way is via WhatsApp: +1-786-543-6688. You can also email hello@maxpetrusenko.com. Before your session, I'll ask you to complete a brief questionnaire about your experience, intentions, and boundaries. This helps ensure we're aligned and creates a safe container for the work."
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
    aggregateRating: techTestimonials.length > 0 ? {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: techTestimonials.length.toString(),
      bestRating: "5",
      worstRating: "1",
    } : undefined,
    description: "AI automation consultant specializing in Claude Code, n8n workflows, ChatGPT integrations, and workflow automation for creators and founders. Available remotely worldwide and in-person in Miami, Ubud Bali, and while traveling.",
    url: `${siteConfig.url}/tech`,
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
 * REVIEW & RATING SCHEMA
 * ============================================================================
 */

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
      "reviewCount": "217",
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
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Tantra Massage Miami - Max Petrusenko",
    "alternateName": "Presence Atelier Miami",
    "description": "Professional tantra massage and somatic energy work in Miami, Florida. Serving South Florida from West Palm Beach to the Keys.",
    "url": `${siteConfig.url}/spirituality`,
    "telephone": "+1-786-543-6688",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Miami",
      "addressRegion": "FL",
      "addressCountry": "US"
    },
    "areaServed": SERVICE_LOCATIONS.florida,
    "priceRange": "$$$",
    "openingHours": "Mo-Su 09:00-19:00",
    "keywords": "tantra massage Miami, tantric massage South Florida, somatic energy work Miami, trauma release massage, couples tantra Miami",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "217",
      "bestRating": "5",
      "worstRating": "1"
    }
  };
}
