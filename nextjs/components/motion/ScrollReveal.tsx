"use client";

import { createElement } from "react";
import { useScrollReveal } from "./useScrollReveal";

type RevealTag =
  | "article"
  | "aside"
  | "div"
  | "footer"
  | "header"
  | "main"
  | "nav"
  | "section";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
  distance?: number;
  className?: string;
  as?: RevealTag;
}

const directionTransforms = {
  up: "translateY(40px)",
  down: "translateY(-40px)",
  left: "translateX(40px)",
  right: "translateX(-40px)",
  fade: "none",
};

export function ScrollReveal({
  children,
  delay = 0,
  duration = 700,
  direction = "up",
  distance = 40,
  className = "",
  as: Component = "div",
}: ScrollRevealProps) {
  const [ref, { isVisible }] = useScrollReveal();

  const transform = direction === "fade"
    ? "none"
    : directionTransforms[direction];

  const style: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "none" : transform,
    transition: `opacity ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1), transform ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
    transitionDelay: `${delay}ms`,
  };

  return createElement(Component, { ref, className, style }, children);
}

interface StaggerRevealProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  className?: string;
  as?: RevealTag;
}

export function StaggerReveal({
  children,
  staggerDelay = 100,
  className = "",
  as: Component = "div",
}: StaggerRevealProps) {
  return (
    <Component className={className}>
      {children.map((child, index) => (
        <ScrollReveal key={index} delay={index * staggerDelay}>
          {child}
        </ScrollReveal>
      ))}
    </Component>
  );
}
