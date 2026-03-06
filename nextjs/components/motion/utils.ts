export interface FloatingOrbStyle {
  width: string;
  height: string;
  left: string;
  top: string;
  background: string;
  opacity: number;
}

export interface MouseTrackingGradientOptions {
  mousePos: {
    x: number;
    y: number;
  };
  color1: string;
  color2: string;
  color3: string;
  intensity: number;
}

export function getFloatingOrbStyle(index: number, color: string): FloatingOrbStyle {
  const size = 100 + index * 36;
  const left = 14 + index * 22;
  const top = 12 + ((index * 19) % 54);

  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    top: `${top}%`,
    background: color,
    opacity: 0.65 + index * 0.08,
  };
}

export function buildMouseTrackingGradientBackground({
  mousePos,
  color1,
  color2,
  color3,
  intensity,
}: MouseTrackingGradientOptions): string {
  return `
      radial-gradient(
        circle at ${mousePos.x}% ${mousePos.y}%,
        ${color1} 0%,
        transparent ${intensity}%
      ),
      radial-gradient(
        circle at ${100 - mousePos.x}% ${mousePos.y + 20}%,
        ${color2} 0%,
        transparent ${intensity * 0.8}%
      ),
      radial-gradient(
        circle at ${mousePos.x + 30}% ${100 - mousePos.y}%,
        ${color3} 0%,
        transparent ${intensity * 1.2}%
      )
    `;
}
