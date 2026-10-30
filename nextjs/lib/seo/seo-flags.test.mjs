import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  fnv1a32,
  normalizePath,
  assignArm,
  buildArmMap,
  serializeArmMap,
} from "./seo-flags.ts";

const config = JSON.parse(fs.readFileSync(new URL("../../seo-flags.json", import.meta.url), "utf8"));

test("fnv1a32 is stable", () => {
  assert.equal(fnv1a32(""), 0x811c9dc5);
  assert.equal(fnv1a32("a"), 0xe40c292c);
  assert.equal(fnv1a32("seo_h003_titles:/tech"), fnv1a32("seo_h003_titles:/tech"));
});

test("normalizePath lowercases and strips query, hash, trailing slash", () => {
  assert.equal(normalizePath("/Tech/Articles/?a=1"), "/tech/articles");
  assert.equal(normalizePath("https://www.maxpetrusenko.com/About/"), "/about");
  assert.equal(normalizePath(""), "/");
  assert.equal(normalizePath("/"), "/");
});

test("both arms appear across 20 sample paths", () => {
  const paths = Array.from({ length: 20 }, (_, i) => `/sample/page-${i}`);
  const arms = new Set(paths.map((p) => assignArm(config, "seo_h003_titles", p)));
  assert.ok(arms.has("variant"));
  assert.ok(arms.has("control"));
});

test("homepage is always control for page flags", () => {
  for (const key of Object.keys(config.flags).filter((k) => config.flags[k].scope === "page")) {
    assert.equal(assignArm(config, key, "/"), "control");
  }
});

test("disabled flag and ineligible page are control", () => {
  const off = structuredClone(config);
  off.flags.seo_h003_titles.enabled = false;
  for (let i = 0; i < 20; i += 1) {
    assert.equal(assignArm(off, "seo_h003_titles", `/p-${i}`), "control");
    assert.equal(assignArm(config, "seo_h003_titles", `/p-${i}`, false), "control");
  }
});

test("serialized map covers every flag, site flags marked s", () => {
  const out = serializeArmMap(buildArmMap(config, "/tech/articles/seo-is-dead"));
  assert.match(out, /h005=s/);
  assert.match(out, /h021=s/);
  for (const k of ["h003", "h013", "h014", "h015", "h022"]) assert.match(out, new RegExp(`${k}=[vc]`));
});
