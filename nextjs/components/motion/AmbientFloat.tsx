"use client";

import { useEffect, useRef } from "react";
import { getFloatingOrbStyle } from "./utils";

interface AmbientFloatProps {
  children: React.ReactNode;
  speed?: number;
  amplitude?: number;
  rotation?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function AmbientFloat({
  children,
  speed = 1,
  amplitude = 10,
  rotation = false,
  className = "",
  style,
}: AmbientFloatProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let animationFrameId: number;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;

      const y = Math.sin(elapsed * speed + phaseRef.current) * amplitude;
      const x = Math.cos(elapsed * speed * 0.7 + phaseRef.current) * (amplitude * 0.5);
      const r = rotation ? Math.sin(elapsed * speed * 0.5 + phaseRef.current) * 3 : 0;

      element.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`;

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [speed, amplitude, rotation]);

  return (
    <div ref={elementRef} className={className} style={style}>
      {children}
    </div>
  );
}

interface FloatingOrbsProps {
  className?: string;
  color?: string;
  count?: number;
}

export function FloatingOrbs({
  className = "",
  color = "rgba(14, 97, 93, 0.08)",
  count = 3,
}: FloatingOrbsProps) {
  return (
    <div className={`floating-orbs-container ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <AmbientFloat
          key={i}
          speed={0.35 + i * 0.12}
          amplitude={10 + i * 4}
          rotation={true}
          className="absolute rounded-full blur-3xl pointer-events-none"
          style={getFloatingOrbStyle(i, color)}
        >
          <div className="w-full h-full rounded-full" />
        </AmbientFloat>
      ))}
    </div>
  );
}
