"use client";

import { useRef, useState, useEffect, ReactNode } from "react";

interface MagneticButtonProps {
  children: ReactNode;
  strength?: number;
  className?: string;
  onClick?: () => void;
  href?: string;
  target?: string;
  rel?: string;
}

export function MagneticButton({
  children,
  strength = 20,
  className = "",
  onClick,
  href,
  target,
  rel,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) / strength;
      const deltaY = (e.clientY - centerY) / strength;

      setPosition({ x: deltaX, y: deltaY });
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setPosition({ x: 0, y: 0 });
    };

    element.addEventListener("mousemove", handleMouseMove as EventListener);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mousemove", handleMouseMove as EventListener);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [strength]);

  const style = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    transition: isHovered
      ? "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)"
      : "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  const sharedProps = {
    ref: buttonRef as React.RefObject<any>,
    className,
    style,
    onMouseEnter: () => setIsHovered(true),
    onClick,
  };

  if (href) {
    return (
      <a href={href} target={target} rel={rel} {...sharedProps}>
        {children}
      </a>
    );
  }

  return <button {...sharedProps}>{children}</button>;
}
