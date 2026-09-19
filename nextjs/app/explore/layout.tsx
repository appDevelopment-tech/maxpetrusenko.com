import type { Metadata } from "next";

/**
 * Design explorations, not published pages: /explore holds only the hero
 * mockups and none of them are in the sitemap. Same reasoning as /inbox — an
 * explicit noindex, not a canonical, because nothing here should rank.
 */
export const metadata: Metadata = {
  title: "Hero exploration",
  robots: { index: false, follow: false },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
