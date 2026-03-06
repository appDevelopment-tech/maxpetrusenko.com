"use client";

import { useEffect, useRef } from "react";

interface BreathingTextProps {
  children: string;
  className?: string;
  speed?: number;
}

/**
 * Text that animates in word by word with breathing rhythm
 * Perfect for somatic/spirituality pages to create calm, meditative reading
 */
export function BreathingText({
  children,
  className = "",
  speed = 1,
}: BreathingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const words = children.split(" ");
    container.innerHTML = words
      .map((word, i) => `<span style="animation-delay: ${i * 150 * speed}ms">${word}</span>`)
      .join(" ");

    return () => {
      container.innerHTML = children;
    };
  }, [children, speed]);

  return <span ref={containerRef} className={`breathing-text ${className}`} />;
}
