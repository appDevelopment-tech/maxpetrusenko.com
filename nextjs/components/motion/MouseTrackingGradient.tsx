"use client";

import { useRef, useEffect, useState } from "react";
import { buildMouseTrackingGradientBackground } from "./utils";

interface MouseTrackingGradientProps {
  className?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  intensity?: number;
  children?: React.ReactNode;
}

export function MouseTrackingGradient({
  className = "",
  color1 = "rgba(111, 170, 255, 0.15)",
  color2 = "rgba(95, 227, 188, 0.12)",
  color3 = "rgba(210, 163, 93, 0.1)",
  intensity = 100,
  children,
}: MouseTrackingGradientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const host = container.parentElement;
    if (!host) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      rafId = requestAnimationFrame(() => {
        setMousePos({ x, y });
      });
    };

    const handleMouseLeave = () => {
      setMousePos({ x: 50, y: 50 });
    };

    host.addEventListener("mousemove", handleMouseMove);
    host.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      host.removeEventListener("mousemove", handleMouseMove);
      host.removeEventListener("mouseleave", handleMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const gradientStyle = {
    background: buildMouseTrackingGradientBackground({
      mousePos,
      color1,
      color2,
      color3,
      intensity,
    }),
  };

  return (
    <div
      ref={containerRef}
      className={`mouse-tracking-gradient ${className}`}
      style={gradientStyle}
    >
      {children}
    </div>
  );
}
