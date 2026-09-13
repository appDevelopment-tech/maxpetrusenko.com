import { siteConfig } from "@/config/site";
import { buildHomeFaqMainEntity } from "@/lib/seo/home-faq";

/**
 * Organization/publisher logo target.
 *
 * MUST be a raster image on the canonical host: Google's logo guidance wants a
 * crawlable PNG/JPG/GIF of at least 112x112 px, and rule 18 (`image-reachability`)
 * flags `Organization.logo` pointing at an SVG. The SVG source of truth stays at
 * `/images/brand-mark.svg` for the SVG-only surfaces that reference it; this
 * constant is the raster twin consumed by JSON-LD.
 *
 * Regenerate with: qlmanage -t -s 512 -o <tmp> public/images/brand-mark.svg
 */
const BRAND_LOGO_URL = `${siteConfig.url}/images/brand-mark.png`;
const PERSON_IMAGE_URL = `${siteConfig.url}/images/DSC05871.jpg`;
const TECH_PERSON_IMAGE_URL = `${siteConfig.url}/images/tech-portrait.jpg`;


/**
 * Organization logo for nested Organization nodes.
 *
 * A bare URL, which is the form Google's own current Organization example uses
 * ("logo": "https://www.example.com/images/logo.png" —
 * https://developers.google.com/search/docs/appearance/structured-data/organization)
 * and which schema.org accepts for `logo` alongside ImageObject. What Google's
 * guidance actually constrains is the ASSET: >=112x112 px (brand-mark.png is
 * 512x512), a crawlable/indexable URL on the site's own host, and a supported
 * raster format. `structured-data.contract.test.mjs` (rule 18) asserts all
 * three, and it accepts either form (`typeof logo === "string" ? logo : logo.url`).
 *
 * Why not an inline ImageObject here: these are nested stubs repeated on every
 * page, and an ImageObject would add a type to every page's shape for no extra
 * signal. Google does not require the object form. (Article `publisher.logo`
 * stays an ImageObject — that comes from Article's guidance, not this one.)
 */
const ORGANIZATION_LOGO = BRAND_LOGO_URL;

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
  const modified = data.dateModified || new Date().toISOString();
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.title,
    description: data.description,
    url: `${siteConfig.url}${data.url}`,
    ...(data.datePublished && { datePublished: data.datePublished }),
    dateModified: modified,
  };
}

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    dateModified: new Date().toISOString(),
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
 * The Person entity, described ONCE, for the whole site.
 *
 * WHY THIS IS THE ONLY PERSON GENERATOR
 * -------------------------------------
 * This module used to export four Person builders -- this one, a "tech" one, a
 * "spirituality" one and an "enhanced" one -- and pages composed them on top of
 * the copy `app/layout.tsx` already emits on every route. All four carried the
 * same identity (`name` = siteConfig.author.name, `url` = siteConfig.url, no
 * `@id`), so sd-check rule 7 (`duplicate-type-conflict`) correctly read two
 * `Person` nodes as ONE human described with contradictory values: it fired on
 * 15 built routes with conflicting `description` / `image` / `jobTitle` /
 * `sameAs` / `worksFor`, plus one Event `organizer` stub.
 *
 * The repair is the same rule this module already applies to
 * `Organization.logo` ("one entity, one representation"): a human is one
 * entity, so he gets one node. The per-page variants are DELETED rather than
 * made to agree, because agreeing duplicates are still two declarations of one
 * person, and the next edit to either one would re-open the conflict.
 *
 * NOTHING IS LOST BY THEIR REMOVAL -- the union of what they said lives here:
 *   - `jobTitle` is multi-valued (schema.org allows a Text array): the "tech"
 *     and "spirituality" variants used to each state a single role, contradicting
 *     this node's; one person, three roles, one property.
 *   - `alternateName` names both of his brands, so the "tech vs practice" brand
 *     disambiguation the deleted variants existed for survives.
 *   - `knowsAbout` is the union of the tech and somatic topic lists.
 *   - `alternateName`, `award`, `telephone`, `email` and `availableChannel`
 *     come from the old homepage-only "enhanced" variant, so deleting that
 *     variant is not a reduction in markup.
 *
 * WHAT WAS DELIBERATELY NOT MIGRATED from the deleted "enhanced" variant, and
 * why -- each was an unverifiable claim or an error-band finding rather than an
 * entity fact:
 *   - `memberOf: [{ "@type": "Organization", name: "Isha Foundation",
 *     url: "https://www.ishafoundation.org" }, ...]` -- an off-host `url` on a
 *     node that now rides on all 129 routes is 136 error-band `url-host`
 *     findings, and the cure for that is widening `[gate].allowed_hosts`, which
 *     is the exemption this gate exists to prevent. The affiliation is real but
 *     does not belong on every page of the site. (Reason repeated inline below.)
 *   - `worksFor` (nested `Organization` stubs) -- each one costs two warn-band
 *     `missing-recommended` findings (contactPoint, sameAs) on every route. The
 *     tech brand is carried by `alternateName` and by the `ProfessionalService`
 *     on each tech page, and this node no longer declares `worksFor` at all.
 *   - `availableChannel` (`ServiceChannel`) -- it would add a new `@type` to
 *     every route's graph to restate a service list the page-level
 *     `ProfessionalService` / practice `WebPage` already carries. (Reason
 *     repeated inline below.)
 *   - its long `sameAs` list (about.me, angel.co, codepen.io, dev.to,
 *     linktr.ee, substack, vimeo, pinterest, crunchbase, youtube, gumroad,
 *     stackoverflow). One entry was a literal placeholder
 *     (`https://stackoverflow.com/users/0000000/max-petrusenko`), which
 *     sd-check rule 14 (`placeholder-text`) flags at error band as a
 *     zero-filled identifier; the rest were never verified to resolve to Max.
 *     `sameAs` is an identity claim about a real person, so an unverified URL
 *     is worse than an absent one. Only the five canonical profiles below ship.
 *   - `birthPlace: { "@type": "Place" }` -- an empty Place node. It asserts
 *     nothing, and it was the only reason a `Place` appeared on `/`.
 *
 * Pages that want to state a page-specific ROLE do it on their own node (the
 * `ProfessionalService` / `WebPage` for that page), not by re-declaring the
 * person.
 */
export function generatePersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.author.name,
    alternateName: ["Max", "Max Petrusenko Tech"],
    url: siteConfig.url,
    image: [PERSON_IMAGE_URL, TECH_PERSON_IMAGE_URL],
    jobTitle: [
      "AI Automation Consultant",
      "Founder & Creator",
      "Somatic Practitioner",
    ],
    description: "Creator of tech automation resources and somatic practice offerings.",
    // NO `worksFor`, deliberately. The deleted "tech" variant used to name a
    // second organisation ("Max Petrusenko Tech", /tech), and this node also
    // carried a `worksFor` stub for the practice brand. Both are gone: every
    // nested `Organization` stub rides on all 129 routes and each one costs two
    // warn-band findings the stub cannot satisfy (`missing-recommended`:
    // contactPoint, sameAs), so a brand name is not worth 256 warnings. The tech
    // brand is already stated in `alternateName` above and is the `name` of the
    // page-level `ProfessionalService` on every tech route; the somatic practice
    // is carried by the page-level WebPage on /somatic. Nothing is lost.
    sameAs: [
      siteConfig.social.github,
      siteConfig.social.linkedin,
      siteConfig.social.medium,
      siteConfig.social.instagram,
      siteConfig.social.twitter,
    ].filter(Boolean),
    knowsAbout: [
      // tech (was generateTechPersonSchema)
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
      // somatic (was generateSpiritualityPersonSchema)
      "Somatic Energy Work",
      "Nervous System Regulation",
      "Trauma-Informed Bodywork",
      "Breathwork",
      "Conscious Touch",
      "Kriya Yoga",
      "Shambhavi Mahamudra",
      "Shadow Work",
      "Energy Work",
      "Meditation",
      "Contemplative Practice",
      "Consciousness Technology",
      "Nervous System Reset",
      "Embodied Awareness",
    ],
    // was generateEnhancedPersonSchema (homepage-only, now every route)
    award: [
      "Shambhavi Mahamudra - Isha Foundation",
      "Kriya Yoga Initiation - Yoganada Lineage",
    ],
    // NOTE: no `memberOf` here. The deleted homepage-only "enhanced" variant
    // carried `memberOf: [{name: "Isha Foundation", url: "https://www.ishafoundation.org"}, ...]`,
    // and migrating it onto a node that now rides on all 129 routes turned a
    // hidden homepage claim into 136 error-band `url-host` findings: rule 11
    // treats `url` as host-bound and www.ishafoundation.org is not (and must not
    // be) in `[gate].allowed_hosts`, which is a deliberate two-host trust list.
    // The affiliation is real but it is not worth an error-band finding on every
    // route, and widening the host allowlist to carry it is exactly the
    // exemption this gate exists to prevent. Dropped, and recorded here so the
    // decision is visible rather than discovered later.
    telephone: "+1-954-275-9666",
    email: "hello@maxpetrusenko.com",
    // NOTE: no `availableChannel`. The deleted "enhanced" variant carried one
    // (`ServiceChannel` + serviceType + serviceUrl). It is NOT migrated: adding
    // it introduces a brand-new `@type` (`ServiceChannel`) into the graph of all
    // 129 routes to restate a service list that the page-level
    // `ProfessionalService` / practice `WebPage` already carries verbatim on
    // the pages that actually advertise the services.
  };
}

/**
 * Generate JSON-LD structured data for Organization
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    // Same representation as every other Organization.logo in this module
    // (a bare URL). An ImageObject here described the SAME entity in a second
    // form, which sd-check reported as `duplicate-type-conflict` on the routes
    // where this root node and a nested organization stub coexist. One entity,
    // one logo representation.
    logo: ORGANIZATION_LOGO,
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
  somatic: ["By request"],
  florida: ["By request"]
};

/**
 * Generate JSON-LD structured data for the somatic practice page.
 * Keep this as WebPage, not LocalBusiness/ProfessionalService, to avoid
 * anchoring the practice as a commercial/local service.
 *
 * The export NAME is unchanged on purpose: `app/page.tsx` composes this node on
 * the homepage, so renaming or deleting the export would be an edit outside this
 * module. Only the payload says what it describes.
 */
export function generateProfessionalServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Somatic Practice",
    "description": "Private somatic practice: energy work, breath, boundaries, and embodied awareness by request.",
    "url": `${siteConfig.url}/somatic`,
    "logo": {
      "@type": "ImageObject",
      "url": BRAND_LOGO_URL,
    },
    "image": BRAND_LOGO_URL,
    "telephone": "+1-954-275-9666",
    // NOTE: no `aggregateRating` here, and none anywhere else in this module.
    // This node is a WebPage, and a rating on a WebPage is not a
    // review-snippet pattern. The business rating that used to live here — and
    // on `generateTechServiceSchema()`, and in the deleted
    // `generateAggregateRatingSchema()` — was self-serving, so Google's
    // review-snippet policy makes it ineligible: a site cannot earn a star
    // result for rating its own Organization/ProfessionalService. The absence
    // is asserted by `structured-data.contract.test.mjs`.
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Somatic practice pathways",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Nervous System Reset",
            "description": "Somatic practice for nervous system regulation and conscious presence through breathwork, somatic awareness, and consent-led touch techniques.",
            "category": "Somatic Practice"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Deep Repatterning",
            "description": "A longer arc of somatic energy work across multiple sessions.",
            "category": "Somatic Energy Work"
          }
        }
      ]
    },
    "audience": {
      "@type": "Audience",
      "audienceType": ["men", "women", "couples", "LGBTQ+"]
    },
    "keywords": "somatic energy work, bodywork, breathwork, nervous system reset, energy work, shadow work, embodied awareness",
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceType": "somatic practice, breathwork, energy work, embodiment education",
      "serviceUrl": `${siteConfig.url}/somatic`
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
          "text": "Private sessions are paused for now. Message with a few words about what you’re exploring. No calendar slots are open right now; fit can be discussed only if the practice reopens."
        }
      },
      {
        "@type": "Question",
        "name": "How do I book?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The fastest way is WhatsApp: +1-954-275-9666. Email works too at hello@maxpetrusenko.com."
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
      },
      {
        "@type": "Question",
        "name": "What is somatic energy work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Somatic energy work is a body-based practice combining breathwork, conscious touch, and presence techniques to regulate the nervous system, release stored tension, and build embodied awareness. Sessions are non-medical and focus on regulation, not performance."
        }
      },
      {
        "@type": "Question",
        "name": "What training does Max Petrusenko have?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Max holds Shambhavi Mahamudra initiation from Isha Foundation and Kriya Yoga initiation in the Paramahansa Yogananda lineage. He also trained in Amenti Dance workshops for somatic movement."
        }
      },
      {
        "@type": "Question",
        "name": "What is shadow work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Shadow work is the practice of exploring and integrating unconscious patterns, suppressed emotions, and unexamined beliefs. In somatic practice, this often involves breathwork, body-based awareness, and gentle confrontation of held tension patterns in a safe container with clear boundaries."
        }
      },
      {
        "@type": "Question",
        "name": "What is breathwork for nervous system regulation?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Breathwork for nervous system regulation uses specific breathing patterns to shift the autonomic nervous system from activation (fight-or-flight) toward calm (parasympathetic tone). Techniques include extended exhale breathing, coherence breathing, and somatic breath awareness integrated with conscious touch."
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
 *
 * NOTE: no `aggregateRating` here, deliberately. This node rates Max's own
 * business, on Max's own site, from a hardcoded literal. Google's
 * review-snippet policy is explicit that self-serving reviews are ineligible:
 * "If the entity that's being reviewed controls the reviews about itself,
 * their pages that use LocalBusiness or any other type of Organization
 * structured data are ineligible for star review feature", and "Ratings must
 * be sourced directly from users." ProfessionalService is a LocalBusiness
 * subtype, so a star result was never achievable. The absence is asserted by
 * `nextjs/lib/seo/structured-data.contract.test.mjs`.
 */
export function generateTechServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Max Petrusenko - AI & Automation Consultant",
    description: "AI automation consultant specializing in Claude Code, n8n workflows, ChatGPT integrations, and workflow automation for creators and founders. Available remotely worldwide, with in-person work by request while traveling.",
    url: `${siteConfig.url}/tech`,
    logo: {
      "@type": "ImageObject",
      url: BRAND_LOGO_URL,
    },
    image: BRAND_LOGO_URL,
    telephone: "+1-954-275-9666",
    email: "hello@maxpetrusenko.com",
    areaServed: ["Global", "Remote", "Worldwide", "By request"],
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
      logo: ORGANIZATION_LOGO,
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
      url: `https://wa.me/19542759666`,
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
      name: "Various locations by request",
      description: "Location shared after RSVP. Private events available at your venue.",
    },
    organizer: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.url,
      // NOTE: no `sameAs` here on purpose. This stub identifies the same human
      // as the Person node `app/layout.tsx` emits on every route, and it used
      // to carry a DIFFERENT `sameAs` array (instagram + blindfold.miami +
      // patreon.com/mindfold). sd-check rule 7 read the pair as one entity with
      // conflicting values on /mindfold/events. Identity properties for a
      // person belong on the one node that describes him; a nested stub may
      // only restate them identically, so the array is dropped rather than
      // duplicated. The canonical node on this page already carries his
      // profile list.
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
    keywords: "blindfold, sensory deprivation, presence journey, meditation, somatic work, consciousness, mindfulness, group event, workshop, by request, Miami Florida, team building, corporate wellness",
    offers: [
      {
        "@type": "Offer",
        name: "Group Journey",
        description: "Join a scheduled group Mindfold session. Dates announced via WhatsApp.",
        url: "https://wa.me/19542759666?text=Hi%20Max%2C%20I%27m%20interested%20in%20the%20next%20Mindfold%20group%20journey.",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/Preorder",
        validFrom,
      },
      {
        "@type": "Offer",
        name: "Private / Corporate Event",
        description: "Custom Mindfold session for your team or small group. We align on setting and pacing together.",
        url: "https://wa.me/19542759666?text=Hi%20Max%2C%20I%27d%20like%20to%20book%20a%20private%20Mindfold%20journey.",
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
          urlTemplate: "https://wa.me/19542759666?text=Hi%20Max%2C%20I%27d%20like%20to%20join%20Mindfold.",
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
 * SCHEDULE ACTION SCHEMA DISABLED
 * ============================================================================
 */

/**
 * Deprecated: do not emit ScheduleAction/Reservation schema.
 * Agents were interpreting this as live bookable slots.
 *
 * `_serviceType` is accepted for call-site compatibility only; the value is
 * ignored. The removed practice's member was dropped with the rest of that
 * section, so a caller cannot name it in type space.
 */
export function generateScheduleActionSchema(_serviceType: "tech" | "mindfold") {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Inquiry only",
    description: "No calendar slots or direct booking actions are available right now.",
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
    url: `${siteConfig.url}/somatic`,
    speakable: [
      {
        "@type": "Speakable",
        text: "Max Petrusenko offers private somatic sessions by request. No calendar slots are open right now.",
      },
      {
        "@type": "Speakable",
        text: "Sessions are intimate with clear boundaries, focused on nervous system regulation and presence through breathwork and somatic awareness.",
      },
      {
        "@type": "Speakable",
        text: "Services include Nervous System Reset and Deep Repatterning.",
      },
      {
        "@type": "Speakable",
        text: "Max is certified in Shambhavi Mahamudra and Kriya Yoga. Sessions are consent-forward.",
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
      // Somatic FAQs
      {
        "@type": "Question",
        name: "Do you offer somatic sessions for individuals and couples?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. I offer 1:1 somatic energy work sessions for individuals of all genders, plus couples sessions for partners seeking to deepen connection and communication through somatic practice. Sessions are LGBTQ+ inclusive and tailored to each individual or couple's intentions.",
        },
      },
      {
        "@type": "Question",
        name: "What's the difference between Nervous System Reset and Deep Repatterning?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nervous System Reset is a 90-minute somatic session to arrive safely in your body through breathwork and somatic awareness. Deep Repatterning is a longer arc across multiple sessions.",
        },
      },
      {
        "@type": "Question",
        name: "Where are somatic sessions available?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Private sessions are paused for now. Message with a few words about what you’re exploring to confirm fit and next steps.",
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
        name: "How do I join the inquiry list or consultation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "For somatic sessions, WhatsApp +1-954-275-9666 is fastest. You can also email hello@maxpetrusenko.com. For tech consulting, email with your project details. I'll respond to align on timing and approach.",
        },
      },
    ],
  };
}
