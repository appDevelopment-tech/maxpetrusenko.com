import test from "node:test";
import assert from "node:assert/strict";

import nextConfig from "./next.config.ts";

test("includes permanent redirects for legacy homepage and mindfold aliases", async () => {
  const redirects = await nextConfig.redirects();

  assert.ok(
    redirects.some(
      (entry) =>
        entry.source === "/home" &&
        entry.destination === "/" &&
        entry.permanent === true
    )
  );

  assert.ok(
    redirects.some(
      (entry) =>
        entry.source === "/mindfold" &&
        entry.destination === "/mindfold/events" &&
        entry.permanent === true
    )
  );
});

test("allows instagram thumbnails for motion embeds", () => {
  assert.ok(
    nextConfig.images.remotePatterns.some(
      (entry) =>
        entry.protocol === "https" &&
        entry.hostname === "instagram.com"
    )
  );
});
