import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMouseTrackingGradientBackground,
  getFloatingOrbStyle,
} from "./utils.ts";

test("getFloatingOrbStyle returns deterministic layout values by index", () => {
  assert.deepEqual(getFloatingOrbStyle(0, "rgba(1, 2, 3, 0.4)"), {
    width: "100px",
    height: "100px",
    left: "14%",
    top: "12%",
    background: "rgba(1, 2, 3, 0.4)",
    opacity: 0.65,
  });

  assert.deepEqual(getFloatingOrbStyle(2, "rgba(1, 2, 3, 0.4)"), {
    width: "172px",
    height: "172px",
    left: "58%",
    top: "50%",
    background: "rgba(1, 2, 3, 0.4)",
    opacity: 0.81,
  });
});

test("buildMouseTrackingGradientBackground uses comma-separated radial gradients", () => {
  const background = buildMouseTrackingGradientBackground({
    mousePos: { x: 40, y: 30 },
    color1: "rgba(111, 170, 255, 0.12)",
    color2: "rgba(95, 227, 188, 0.08)",
    color3: "rgba(210, 163, 93, 0.06)",
    intensity: 80,
  });

  assert.match(background, /circle at 40% 30%,/);
  assert.match(background, /circle at 60% 50%,/);
  assert.match(background, /circle at 70% 70%,/);
  assert.ok(!background.includes("circle at 70% 70%;"));
});
