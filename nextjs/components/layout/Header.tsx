"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";

/**
 * Site header with navigation
 */
export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isWide, setIsWide] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      // Match CSS breakpoint: @media (max-width: 768px) for mobile menu
      const wide = window.innerWidth > 768;
      setIsWide(wide);
      if (wide) {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header>
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
