import test from "node:test";
import assert from "node:assert/strict";
import { classifyTraffic, parseSeoVariants } from "./traffic-class.ts";

test("classifies AI, search, social, direct, other", () => {
  assert.equal(classifyTraffic("https://chatgpt.com/"), "ai_referral");
  assert.equal(classifyTraffic("https://www.perplexity.ai/search"), "ai_referral");
  assert.equal(classifyTraffic("https://gemini.google.com/app"), "ai_referral");
  assert.equal(classifyTraffic("https://www.google.com/"), "organic_search");
  assert.equal(classifyTraffic("https://duckduckgo.com/"), "organic_search");
  assert.equal(classifyTraffic("https://search.brave.com/"), "organic_search");
  assert.equal(classifyTraffic("https://www.linkedin.com/feed"), "social");
  assert.equal(classifyTraffic(""), "direct");
  assert.equal(classifyTraffic("https://example.org/"), "other");
});

test("utm_source overrides to ai_referral", () => {
  assert.equal(classifyTraffic("", "?utm_source=chatgpt.com"), "ai_referral");
  assert.equal(classifyTraffic("https://www.google.com/", "?utm_source=perplexity"), "ai_referral");
});

test("parseSeoVariants maps meta content to property values", () => {
  assert.deepEqual(parseSeoVariants("h005=s;h003=v;h013=c"), {
    seo_h005: "site",
    seo_h003: "variant",
    seo_h013: "control",
  });
  assert.deepEqual(parseSeoVariants(null), {});
});
