import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  name: "Max Petrusenko",
  description: "Tech builder and somatic practitioner. Explore portfolio, atelier, and mindfold work.",
  url: "https://maxpetrusenko.com",
  author: {
    name: "Max Petrusenko",
    email: "hello@maxpetrusenko.com",
    twitter: "@petrusenko_max",
  },
  navigation: [
    { name: "Home", href: "/" },
    { name: "Tech", href: "/tech" },
    { name: "Links", href: "/links" },
    { name: "Spirituality", href: "/spirituality" },
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
    whatsapp: "https://wa.me/17865436688",
    twitter: "https://x.com/petrusenko_max",
  },
  externalLinks: {
    atelier: "https://atelier.maxpetrusenko.com",
    gumroad: "https://maxpetrusenko.gumroad.com/",
    patreon: "https://patreon.com/maxpetrusenko",
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
  ogImage: "/images/og-default.jpg",
  twitterHandle: siteConfig.author.twitter,
};

// Revalidation times (in seconds)
export const REVALIDATION = {
  default: 3600, // 1 hour
  articles: 1800, // 30 minutes
  events: 3600, // 1 hour
  daily: 86400, // 24 hours
} as const;
