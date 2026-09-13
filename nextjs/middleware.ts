import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PRIMARY_HOST = "www.maxpetrusenko.com";
const BARE_HOST = "maxpetrusenko.com";

/**
 * Paths whose content has been removed from the site.
 *
 * These return HTTP 410 Gone (a permanent, deliberate removal) instead of a
 * 404 (which only says "not found here right now"). They must not be redirected
 * anywhere: a redirect would publicly re-point a retired URL at a live successor,
 * which is exactly the association the removal is meant to end. A 410 tells
 * crawlers to drop the URL with no successor.
 *
 * Two namespaces are covered here rather than only the literal routes: the
 * deleted App Router routes, and the legacy aliases that used to 301 into them.
 */
const GONE_EXACT_PATHS = new Set<string>([
  // Deleted App Router routes: /spirituality/**
  "/spirituality",
  "/spirituality/articles",
  "/spirituality/articles/tantra-trauma-ptsd",
  "/spirituality/blog",
  "/spirituality/blog/what-to-expect-first-tantra-session",
  "/spirituality/blog/what-is-kyo-tai",
  "/spirituality/blog/kyo-tai-session-what-happens",
  "/spirituality/blog/questions-to-ask-tantra-practitioner",
  "/spirituality/blog/tantra-vs-regular-massage",
  "/spirituality/blog/temple-space-preparation",
  // Deleted App Router routes: tantra landing pages
  "/couples-tantra-massage",
  "/tantra-massage-ubud",
  // Legacy aliases that previously 301'd into the deleted routes
  "/couples-tantra",
  "/couples-tantra-ubud",
  "/couples-tantric-massage",
  // Legacy spirituality alias
  "/blog/spiritual-practices",
  // Retired practice-brand routes (its /tech project entry was removed)
  "/tech/presence-atelier",
  "/tech/spirituality-mindfold",
  // Retired backlog articles served from /blog/[slug]
  "/blog/tantra-massage-meaning-vs-myths",
  "/blog/tantra-massage-benefits-for-men",
  "/blog/tantra-massage-benefits-for-women",
  "/blog/how-to-choose-a-tantra-practitioner",
  "/blog/tantra-for-couples-boundaries-and-aftercare",
  // Retired internal read-only view
  "/_/view",
]);

/**
 * Prefixes for the tantra families whose slugs are generated (the
 * /blog/tantra-practice-* and /blog/history-of-tantra-* matrices) or whose
 * child paths were never individually enumerated. Prefix matching keeps this
 * list from having to chase generated slugs.
 */
const GONE_PATH_PREFIXES: readonly string[] = [
  "/spirituality/",
  "/couples-tantra",
  "/couples-tantric",
  "/tantra-massage-ubud/",
  "/blog/tantra-",
  "/blog/history-of-tantra",
  "/blog/how-to-choose-a-tantra-practitioner",
  "/blog/spiritual-practices/",
  "/blog/tag/tantra",
  "/blog/tag/kyo-tai",
];

function isGonePath(pathname: string): boolean {
  const normalized = (pathname.replace(/\/+$/, "") || "/").toLowerCase();

  if (GONE_EXACT_PATHS.has(normalized)) {
    return true;
  }

  return GONE_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function goneResponse(): NextResponse {
  return new NextResponse("Gone", {
    status: 410,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const hostname = nextUrl.hostname;
  const needsHttps = nextUrl.protocol !== "https:";

  // Removed content returns 410 on every host, and before any host redirect,
  // so a stale inbound link can never be bounced into a live page.
  if (isGonePath(nextUrl.pathname)) {
    return goneResponse();
  }

  if (hostname === BARE_HOST || (hostname === PRIMARY_HOST && needsHttps)) {
    const url = nextUrl.clone();
    url.hostname = PRIMARY_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  const mediumPreviewMatch = nextUrl.pathname.match(/^\/medium\/([^/]+)\/?$/);
  if (mediumPreviewMatch) {
    const url = nextUrl.clone();
    url.pathname = `/medium/${mediumPreviewMatch[1]}/index.html`;
    return NextResponse.redirect(url, 307);
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
