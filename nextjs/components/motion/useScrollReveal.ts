"use client";

import { useEffect, useRef, useState } from "react";

interface RevealState {
  isVisible: boolean;
  hasRevealed: boolean;
}

export function useScrollReveal(
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px"
): [React.RefObject<HTMLElement | null>, RevealState] {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<RevealState>({
    isVisible: false,
    hasRevealed: false,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setState((prev) =>
              prev.isVisible && prev.hasRevealed
                ? prev
                : { isVisible: true, hasRevealed: true }
            );
          } else {
            setState((prev) =>
              prev.hasRevealed || !prev.isVisible
                ? prev
                : { ...prev, isVisible: false }
            );
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, state];
}
