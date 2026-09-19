import type { Metadata } from "next";

/**
 * Internal lead tool, not a public page. It is deliberately absent from the
 * sitemap, so it is kept out of the index by directive rather than by canonical:
 * noindex is the stronger signal, and declaring a canonical on a non-public page
 * would be a lie about which URL should rank.
 */
export const metadata: Metadata = {
  title: "Inbox",
  robots: { index: false, follow: false },
};

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
