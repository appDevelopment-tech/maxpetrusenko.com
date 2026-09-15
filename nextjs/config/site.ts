import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  name: "Max Petrusenko",
  description: "AI engineer, somatic practitioner, and consciousness technology writer. Bridging agentic coding, contemplative neuroscience, and eastern philosophy.",
  url: "https://www.maxpetrusenko.com",
  author: {
    name: "Max Petrusenko",
    email: "hello@maxpetrusenko.com",
    twitter: "@petrusenko_max",
  },
  navigation: [
    { name: "Home", href: "/" },
    { name: "Tech", href: "/tech" },
    { name: "Blog", href: "/blog" },
    { name: "Links", href: "/links" },
    { name: "About", href: "/about" },
    { name: "Proof", href: "/proof" },
    { name: "Identity", href: "/identity" },
    { name: "Mindfold", href: "/mindfold/events" },
  ],
  social: {
    github: "https://github.com/maxpetrusenko",
    linkedin: "https://linkedin.com/in/max-petrusenko-40574b4a/",
    medium: "https://medium.com/@max.petrusenko",
    instagram: "https://instagram.com/blindfold.miami",
    whatsapp: "https://wa.me/19542759666",
    twitter: "https://x.com/petrusenko_max",
  },
  externalLinks: {
    // `atelier` removed 2026-09-12: atelier.maxpetrusenko.com was torn down
    // (Pages project deleted, custom domain unbound) and the DNS record now
    // returns HTTP 403 "1014 CNAME cross-user banned".
    // The `spirituality` section and every route under it were removed from
    // this site and now return HTTP 410 Gone via middleware.ts. There is
    // deliberately no replacement surface and no redirect: retired URLs must
    // not resolve to, or point at, any live successor.
    gumroad: "https://maxpetrusenko.gumroad.com/",
    patreon: "https://patreon.com/maxpetrusenko",
  },
  // Products and properties Max owns and operates. One canonical host per entry.
  // The studio/tantra brand is deliberately absent: the anonymity invariant
  // forbids a maxpetrusenko.com host from linking into it.
  products: [
    {
      title: "GeoAnalyzer",
      description: "Audits how AI search engines read and cite a site.",
      href: "https://geo-analyzer.com",
      badge: "Open",
    },
    {
      title: "Unfollow X",
      description: "Chrome extension that clears an inactive X following list.",
      href: "https://unfollow-x.com",
      badge: "Open",
    },
    {
      title: "SMM Agent",
      description: "Social posting agent for AI-generated content.",
      href: "https://smmagent.app",
      badge: "Open",
    },
    {
      title: "SMMClaw",
      description: "Companion publishing surface for SMM Agent.",
      href: "https://smmclaw.app",
      badge: "Open",
    },
    {
      title: "ClawPoster",
      description: "Cross-posting surface for AI-native content.",
      href: "https://clawposter.app",
      badge: "Open",
    },
    {
      title: "Agent Persona",
      description: "SaaS for deploying a persistent AI persona.",
      href: "https://agent-persona.org",
      badge: "Open",
    },
    {
      title: "AI Math Tutor",
      description: "Open-source realtime voice tutor stack.",
      href: "https://aitutor.maxpetrusenko.com",
      badge: "Open",
    },
    {
      title: "Miami Contact Improv",
      description: "Independent community map of Contact Improvisation in Miami.",
      href: "https://miamicontactimprov.com",
      badge: "Visit",
    },
    {
      title: "Project Wiki",
      description: "Client-safe project notes and research pages.",
      href: "https://wiki.maxpetrusenko.com",
      badge: "Read",
    },
  ],
  googleBusinessProfile: {
    // Google Business Profile for Presence Atelier Miami
    // Category: Somatic Education & Energy Work Teaching
    // Address: 917 SW 18th Ct, Fort Lauderdale, FL 33315
    // Verify at: https://business.google.com/
    // Add CID here after verification completes
    cid: null as string | null,
    address: {
      street: "917 SW 18th Ct",
      city: "Fort Lauderdale",
      state: "FL",
      zip: "33315",
      country: "US",
    },
  },
};

// Constants for Medium RSS
export const MEDIUM_RSS_URL = "https://medium.com/feed/@max.petrusenko";

// Preferred article IDs to feature
export const FEATURED_ARTICLE_IDS = [
  "99c594d458b5", // GrapheneOS
  "52e70e459cc2", // Global wealth
  "65b991356c25", // Claude Skills
];

// SEO constants
export const SEO_DEFAULTS = {
  title: siteConfig.name,
  description: siteConfig.description,
  ogImage: "/images/og-home.png",
  twitterHandle: siteConfig.author.twitter,
};

// Revalidation times (in seconds)
export const REVALIDATION = {
  default: 3600, // 1 hour
  articles: 1800, // 30 minutes
  events: 3600, // 1 hour
  daily: 86400, // 24 hours
} as const;
