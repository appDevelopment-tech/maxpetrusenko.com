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
  const hiddenExactPaths = [
    "/",
    "/tech",
    "/about",
    "/spirituality",
    "/spirituality",
    "/blog",
    "/links",
    "/proof",
    "/identity",
    "/somatic",
    "/claude-code-consultant",
    "/ai-workflow-automation",
    "/n8n-automation",
  ];
  const hiddenPrefixes = [
    "/mindfold",
    "/admin",
    "/workspace",
    "/ailab",
  ];

  if (
    !pathname ||
    hiddenExactPaths.includes(pathname) ||
    hiddenPrefixes.some((prefix) => pathname.startsWith(`${prefix}/`))
  ) {
    return null;
  }

  const title = formatTitle(pathname);

  return (
    <section className="hero-portrait-wrap" style={{ minHeight: "50vh" }} aria-label="Page hero">
      <div className="hero-portrait-bg">
        <Image
          src="/images/DSC05871.jpg"
          alt="Max Petrusenko portrait"
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 36%" }}
          priority={false}
          quality={82}
        />
        <div className="hero-portrait-overlay" />
        <div className="hero-portrait-bottom" />
      </div>
      <div className="relative z-[3] mx-auto w-full max-w-[1080px] px-4 py-20 md:px-6">
        <p className="blur-in section-eyebrow text-[var(--muted)]">Max Petrusenko</p>
        <h1 className="clip-reveal clip-reveal-d1 mt-3 font-serif text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight text-[var(--ink)]">
          {title}
        </h1>
      </div>
    </section>
  );
}
