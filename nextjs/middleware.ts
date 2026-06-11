import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PRIMARY_HOST = "www.maxpetrusenko.com";
const BARE_HOST = "maxpetrusenko.com";

function legacyChinolaReviewRedirect(request: NextRequest) {
  const legacyReviewRedirects = new Map([
    ["/chinola/review/maxim-fruit-v1", "/chinola/review/maxim-fruit-v2"],
    ["/chinola/review/maxim-wa-fruit-v1", "/chinola/review/maxim-fruit-v2"],
  ]);
  const destination = legacyReviewRedirects.get(request.nextUrl.pathname.replace(/\/$/, ""));

  if (!destination) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = destination;
  return NextResponse.redirect(url, 302);
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const hostname = nextUrl.hostname;
  const needsHttps = nextUrl.protocol !== "https:";

  if (nextUrl.pathname === "/_/view") {
    return new NextResponse("Gone", {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (hostname === BARE_HOST || (hostname === PRIMARY_HOST && needsHttps)) {
    const url = nextUrl.clone();
    url.hostname = PRIMARY_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  const legacyChinolaReview = legacyChinolaReviewRedirect(request);
  if (legacyChinolaReview) {
    return legacyChinolaReview;
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
