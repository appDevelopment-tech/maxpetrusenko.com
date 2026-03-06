const LEGACY_MEDIUM_ID_SLUG = /^[a-f0-9]{10,}$/i;
const ABSOLUTE_URL = /^https?:\/\//i;

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeArticleLink(articleLink: string): string {
  return articleLink.trim();
}

export function resolveLegacyBlogSlugRedirect(slug: string): string | null {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  if (LEGACY_MEDIUM_ID_SLUG.test(normalizedSlug)) {
    return "/blog";
  }

  return null;
}

export function resolveBlogArticleRedirect(slug: string, articleLink: string): string | null {
  const normalizedSlug = normalizeSlug(slug);
  const normalizedArticleLink = normalizeArticleLink(articleLink);

  if (!normalizedSlug || !normalizedArticleLink) {
    return null;
  }

  if (normalizedArticleLink === `/blog/${normalizedSlug}`) {
    return null;
  }

  if (normalizedArticleLink.startsWith("/") || ABSOLUTE_URL.test(normalizedArticleLink)) {
    return normalizedArticleLink;
  }

  return null;
}

export function resolveMissingBlogTagRedirect(tag: string): string | null {
  const normalizedTag = normalizeSlug(tag);

  if (!normalizedTag) {
    return null;
  }

  return "/blog/topics";
}

export function resolveBlogTagRedirect(articleLinks: string[]): string | null {
  if (articleLinks.length !== 1) {
    return null;
  }

  return normalizeArticleLink(articleLinks[0]) || null;
}

export function shouldIndexBlogTagPage(articleCount: number): boolean {
  return articleCount > 1;
}
