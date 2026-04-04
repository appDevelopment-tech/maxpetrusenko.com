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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className={isScrolled ? "sticky" : ""}>
      <div className="container nav-bar">
        <Link href="/" className="brand">
          {siteConfig.name}
        </Link>
        <div className="nav-right">
          <button
            className="menu-toggle"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            Menu
          </button>
          <nav
            className={`nav-links ${!isOpen ? "collapsed" : ""} ${
              isOpen ? "open" : ""
            }`}
          >
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
          <div className="nav-actions">
            <Link href="/workspace/sign-in" onClick={() => setIsOpen(false)}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
