import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PRIMARY_HOST = "www.maxpetrusenko.com";
const BARE_HOST = "maxpetrusenko.com";

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
