"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";

/**
 * Site header with navigation
 * Features sticky positioning with backdrop blur on scroll
 */
export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isWide, setIsWide] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const wide = window.innerWidth > 768;
      setIsWide(wide);
      if (wide) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleResize();
    handleScroll();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className={isScrolled ? "sticky" : ""}>
      <div className="container nav-bar">
        <Link href="/" className="brand">
          {siteConfig.name}
        </Link>
        {isWide || (
          <button
            className="menu-toggle"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            Menu
          </button>
        )}
        <nav className={`nav-links ${!isWide && !isOpen ? "collapsed" : ""} ${isOpen ? "open" : ""}`}>
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
