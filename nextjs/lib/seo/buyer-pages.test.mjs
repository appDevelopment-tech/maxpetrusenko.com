import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { buyerPages } from "./buyer-pages.ts";
import { serializeArmMap, buildArmMap } from "./seo-flags.ts";

const config = JSON.parse(fs.readFileSync(new URL("../../seo-flags.json", import.meta.url), "utf8"));

const words = (s) => s.trim().split(/\s+/).length;

test("h006 is a site-scope flag, serialized as s", () => {
  assert.equal(config.flags.seo_h006_buyer_pages.scope, "site");
  assert.match(serializeArmMap(buildArmMap(config, "/hire-n8n-developer")), /h006=s/);
});

test("slugs are unique and the keyword is in slug, title, and H1", () => {
  const slugs = new Set(buyerPages.map((p) => p.slug));
  assert.equal(slugs.size, buyerPages.length);
  for (const p of buyerPages) {
    const kw = p.keyword.toLowerCase();
    assert.equal(p.slug, kw.replace(/\s+/g, "-"), p.slug);
    assert.ok(p.title.toLowerCase().includes(kw.replace(/^hire /, "")), `title ${p.slug}`);
    assert.ok(p.h1.toLowerCase().includes(kw.replace(/^hire /, "")), `h1 ${p.slug}`);
    assert.ok(p.answer.toLowerCase().includes(kw.replace(/^hire /, "")), `answer ${p.slug}`);
  }
});

test("length budgets and copy hygiene", () => {
  for (const p of buyerPages) {
    assert.ok(p.title.length <= 43, `${p.slug} title ${p.title.length}`);
    assert.ok(p.description.length <= 160, `${p.slug} description`);
    const n = words(p.answer);
    assert.ok(n >= 40 && n <= 60, `${p.slug} answer words ${n}`);
    const all = JSON.stringify(p);
    assert.ok(!/[–—]/.test(all), `${p.slug} has dash glyph`);
    assert.ok(p.cta.label.length > 0 && p.faq.length >= 3);
  }
});
