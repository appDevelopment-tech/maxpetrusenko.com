import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/_/view"],
};
