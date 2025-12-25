import Link from "next/link";
import { siteConfig } from "@/config/site";

/**
 * Site footer with navigation
 */
export function Footer() {
  return (
    <footer className="container footer">
      <div>© 2025 {siteConfig.name}</div>
      <div className="footer-links">
        {siteConfig.navigation.slice(1).map((item) => (
          <Link key={item.href} href={item.href}>
            {item.name}
          </Link>
        ))}
      </div>
    </footer>
  );
}
