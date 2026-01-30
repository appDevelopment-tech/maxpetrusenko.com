import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PRIMARY_HOST = "www.maxpetrusenko.com";
const BARE_HOST = "maxpetrusenko.com";

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const hostname = nextUrl.hostname;
  const needsHttps = nextUrl.protocol !== "https:";

  if (hostname === BARE_HOST || (hostname === PRIMARY_HOST && needsHttps)) {
    const url = nextUrl.clone();
    url.hostname = PRIMARY_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
