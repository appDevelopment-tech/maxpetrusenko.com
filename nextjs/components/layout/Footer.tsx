import Link from "next/link";
import { siteConfig } from "@/config/site";

/**
 * Site footer with navigation
 */
export function Footer() {
  return (
    <footer>
      <div className="location-banner" role="note">
        <span className="location-item">
          <strong>private sessions by request</strong> private
        </span>
        <span className="location-divider">|</span>
        <span className="location-item">
          <strong>Miami, FL</strong> private
        </span>
        <span className="location-divider">|</span>
        <span className="location-item">Remote worldwide</span>
      </div>
      <div className="container footer">
        <div>© 2024–{new Date().getFullYear()} {siteConfig.name}</div>
        <div className="footer-links">
          {siteConfig.navigation.slice(1).map((item) => (
            <Link key={item.href} href={item.href}>
              {item.name}
            </Link>
          ))}
          <Link href="/blog/topics">Topics</Link>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms-of-service">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
