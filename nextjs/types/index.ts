// ============================================================================
// Types for Max Petrusenko Website
// ============================================================================

// ----------------------------------------------------------------------------
// CMS Types
// ----------------------------------------------------------------------------

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  link: string;
  publishedAt: string;
  tags: string[];
  author: {
    name: string;
    image?: string;
  };
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  link: string;
  status: "live" | "mvp" | "in-progress";
  category: "tech" | "product" | "automation";
  tags: string[];
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  waiverUrl: string;
}

// ----------------------------------------------------------------------------
// API Types
// ----------------------------------------------------------------------------

export interface SubscribeRequest {
  email: string;
  consent: boolean;
  source?: string;
}

export interface SubscribeResponse {
  ok: boolean;
  error?: string;
}

export interface ArticlesResponse {
  articles: Article[];
  error?: string;
}

// ----------------------------------------------------------------------------
// SEO Types
// ----------------------------------------------------------------------------

export interface PageMetadata {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: "website" | "article";
  canonical?: string;
  noindex?: boolean;
  keywords?: string[];
}

export interface JsonLdProps {
  type: "WebPage" | "Article" | "Person" | "Organization" | "BreadcrumbList" | "ProfessionalService" | "FAQPage" | "SoftwareApplication" | "TechArticle";
  data: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Site Config Types
// ----------------------------------------------------------------------------

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  medium?: string;
  instagram?: string;
  whatsapp?: string;
  twitter?: string;
}

export interface ExternalLinks {
  atelier: string;
  gumroad: string;
  patreon: string;
}

export interface NavigationItem {
  name: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  author: {
    name: string;
    email: string;
    twitter: string;
  };
  navigation: NavigationItem[];
  social: SocialLinks;
  externalLinks: ExternalLinks;
}

// ----------------------------------------------------------------------------
// Cloudflare Types
// ----------------------------------------------------------------------------

/**
 * Minimal KVNamespace type for Cloudflare Workers KV
 */
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<{ keys: string[] }>;
}

declare global {
  interface CloudflareEnv {
    EMAIL_SUBS: KVNamespace;
  }
}
