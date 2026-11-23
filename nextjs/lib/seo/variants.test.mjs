import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { seoPageVariants } from "./variants.ts";
import robots, { H005_EXTRA_AGENTS } from "../../app/robots.ts";

const appDir = path.resolve(import.meta.dirname, "../../app");
const BRAND = " | Max Petrusenko";

function routeExists(route) {
  return fs.existsSync(path.join(appDir, route.replace(/^\//, ""), "page.tsx"));
}

test("variant titles stay within 60 chars with brand appended", () => {
  for (const [route, v] of Object.entries(seoPageVariants)) {
    assert.ok((v.title + BRAND).length <= 60, `${route}: ${(v.title + BRAND).length}`);
  }
});

test("TL;DR blocks are 40-60 words", () => {
  for (const [route, v] of Object.entries(seoPageVariants)) {
    const words = v.tldr.trim().split(/\s+/).length;
    assert.ok(words >= 40 && words <= 60, `${route}: ${words} words`);
  }
});

test("related links: 3-5, real pages, no self link, no duplicates", () => {
  for (const [route, v] of Object.entries(seoPageVariants)) {
    assert.ok(v.related.length >= 3 && v.related.length <= 5, route);
    assert.ok(routeExists(route), `${route} page missing`);
    const hrefs = v.related.map((l) => l.href);
    assert.equal(new Set(hrefs).size, hrefs.length, route);
    for (const href of hrefs) {
      assert.notEqual(href, route);
      assert.ok(routeExists(href), `${route} -> ${href} missing`);
    }
  }
});

test("robots adds required AI crawlers and keeps private disallows", () => {
  const rules = robots().rules;
  const agents = rules.map((r) => r.userAgent);
  for (const a of [
    "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User",
    "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot",
    "Googlebot", "CCBot", "meta-externalagent", "DuckAssistBot",
  ]) {
    assert.ok(agents.includes(a), `${a} missing`);
  }
  for (const a of H005_EXTRA_AGENTS) {
    const rule = rules.find((r) => r.userAgent === a);
    assert.deepEqual(rule.disallow, ["/api/", "/inbox", "/workspace", "/admin", "/auth"]);
  }
  assert.ok(robots().sitemap.length >= 1);
});

test("H001 striking-distance copy: title fits, fields filled, no dashes", async () => {
  const { strikingVariants } = await import("./h001-variants.ts");
  for (const [route, v] of Object.entries(strikingVariants)) {
    assert.ok((v.title + BRAND).length <= 60, `${route}: title ${(v.title + BRAND).length}`);
    for (const f of ["query", "h1", "lead", "h2", "body"]) assert.ok(v[f].trim().length > (f === "query" ? 2 : 10), `${route}.${f}`);
    assert.ok(!/[–—]/.test(JSON.stringify(v)), `${route}: dash`);
  }
});

test("H001 split: both arms appear, homepage and unlisted paths stay control", async () => {
  const { strikingVariants } = await import("./h001-variants.ts");
  const { assignArm } = await import("./seo-flags.ts");
  const cfg = JSON.parse(fs.readFileSync(new URL("../../seo-flags.json", import.meta.url), "utf8"));
  assert.equal(cfg.flags.seo_h001.scope, "page");
  const arms = Object.keys(strikingVariants).map((p) => assignArm(cfg, "seo_h001", p));
  assert.ok(arms.includes("variant") && arms.includes("control"), arms.join());
  assert.equal(assignArm(cfg, "seo_h001", "/", true), "control");
  assert.equal(assignArm(cfg, "seo_h001", "/blog/unlisted", false), "control");
});
