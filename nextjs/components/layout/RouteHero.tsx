"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

function formatTitle(pathname: string): string {
  if (!pathname || pathname === "/") return "Presence & Product";
  const first = pathname.split("/").filter(Boolean)[0] || "Page";
  return first
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function RouteHero() {
  const pathname = usePathname();
  const hiddenPrefixes = [
    "/",
    "/tech",
    "/about",
    "/spirituality",
    "/tantra-massage-ubud",
    "/blog",
    "/links",
    "/proof",
    "/identity",
    "/mindfold",
  ];

  if (!pathname || hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  const title = formatTitle(pathname);

  return (
    <section className="route-hero ui-fade-up delay-1" aria-label="Page hero">
      <Image
        src="/images/DSC05871.jpg"
        alt="Max Petrusenko portrait"
        fill
        sizes="100vw"
        className="route-hero-image"
        priority={false}
        quality={82}
      />
      <div className="route-hero-overlay" />
      <div className="route-hero-content">
        <p className="route-hero-kicker">Max Petrusenko</p>
        <h1>{title}</h1>
      </div>
    </section>
  );
}
