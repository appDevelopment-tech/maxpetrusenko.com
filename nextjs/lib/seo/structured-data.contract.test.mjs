/**
 * Source-level contract test for `nextjs/lib/seo/structured-data.ts`.
 *
 * WHY THIS EXISTS
 * ---------------
 * The generators in that module are composed per page and there is no single
 * place that asserts their shape, so one edit to one generator silently changes
 * every page that uses it. The dir-mode gate (`.github/scripts/sd-check.py`)
 * validates the *built* artifacts, but it can only see routes the adapter
 * actually emits HTML for — and the routes that render dynamically (including
 * the homepage, `/`) are not in that surface at all. This test is the
 * generator-level net for exactly those blind spots.
 *
 * It runs under the repo's existing loader:
 *   node --import ./scripts/register-ts-tests.mjs --test lib/seo/structured-data.contract.test.mjs
 *
 * WHAT IT ASSERTS (§A3 check catalogue, mirrored at source level)
 * --------------------------------------------------------------
 *  - rule 4  `@context` on every root node of every payload.
 *  - rule 5  `@type` present and a non-empty string (or array of them).
 *  - rules 6/7 no `undefined` for a required property, on any node.
 *  - §A3 type table: required properties per type (see REQUIRED_BY_TYPE).
 *  - rules 10/11 every url/@id/item/image/logo/sameAs/serviceUrl/urlTemplate is
 *            an absolute HTTPS URL; host-bound properties must be on the
 *            canonical host; nothing may use the bare apex host.
 *  - rule 14 no placeholder tokens anywhere in any string value.
 *  - rule 18 `Organization.logo` (and any `publisher.logo`) is a crawlable
 *            raster, never an SVG.
 *  - policy  NO self-serving AggregateRating or Review markup anywhere: every
 *            generator is asserted to emit zero of either, and the homepage
 *            payload to emit zero, because a site rating its own
 *            Organization/ProfessionalService is ineligible for Google's star
 *            review feature. This is an ABSENCE guard — a reintroduction fails
 *            here before it can reach a build.
 *
 * SCOPE NOTES (deliberate, not oversights)
 * ----------------------------------------
 *  - `sameAs` and `url`/`urlTemplate` may legitimately point off-host (Google
 *    uses sameAs for external profiles; Event offers point at wa.me/jotform).
 *    Those hosts are enumerated in explicit allowlists below, so a NEW off-host
 *    target fails this test and forces a decision instead of sliding through.
 *  - sd-check's `missing-required` rule and its per-type table remain the
 *    authority for built pages; band promotion is an integration decision. This
 *    test asserts the same table at generator level so a regression is caught
 *    before the build ever runs.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as schemas from "./structured-data.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEXTJS_ROOT = path.resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Canonical host (the apex 301s to www, so an apex URL is a redirect chain)
// ---------------------------------------------------------------------------
const CANONICAL_HOST = "www.maxpetrusenko.com";
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;
const APEX_HOST = "maxpetrusenko.com";

// ---------------------------------------------------------------------------
// URL-bearing properties
// ---------------------------------------------------------------------------
// These must live on the canonical host: they describe the page being served.
const HOST_BOUND_PROPS = [
  "@id",
  "image",
  "item",
  "logo",
  "serviceUrl",
  "contentUrl",
  "thumbnailUrl",
];

// These may legitimately leave the host, but only to an allowlisted destination.
const OFFHOST_URL_ALLOWLIST = new Set([
  "atelier.maxpetrusenko.com", // the somatic backlink subdomain (still Max's)
  "wa.me", // WhatsApp inquiry entry points
  "form.jotform.com", // Mindfold waiver form
  "www.ishafoundation.org", // memberOf: Isha Foundation
]);

// External identity profiles. `sameAs` is *for* off-host references; these are
// the ones currently referenced, mostly by generateEnhancedPersonSchema().
const EXTERNAL_PROFILE_HOSTS = new Set([
  "about.me",
  "angel.co",
  "atelier.maxpetrusenko.com",
  "codepen.io",
  "dev.to",
  "github.com",
  "instagram.com",
  "linkedin.com",
  "linktr.ee",
  "medium.com",
  "patreon.com",
  "stackoverflow.com",
  "substack.com",
  "vimeo.com",
  "www.crunchbase.com",
  "www.gumroad.com",
  "www.instagram.com",
  "www.pinterest.com",
  "www.youtube.com",
  "x.com",
]);

// ---------------------------------------------------------------------------
// §A3 type table. Applied to page-graph ROOT nodes (the payload object, the
// members of a top-level array, and `@graph` members) plus VALUE_TYPES, which
// are always inline. Nested nodes are references or stubs.
// ---------------------------------------------------------------------------
const REQUIRED_BY_TYPE = {
  Article: ["headline", "image"],
  BlogPosting: ["headline", "image"],
  NewsArticle: ["headline", "image"],
  TechArticle: ["headline", "image"],
  BreadcrumbList: ["itemListElement"],
  ItemList: ["itemListElement"],
  Organization: ["name", "url"],
  Person: ["name"],
  WebSite: ["name", "url"],
  WebPage: ["name"],
  AboutPage: ["name"],
  CollectionPage: ["name"],
  ProfilePage: ["name"],
  Service: ["name"],
  ProfessionalService: ["name"],
  AggregateRating: ["ratingValue", "reviewCount"],
  Review: ["author", "reviewRating"],
  FAQPage: ["mainEntity"],
  SoftwareApplication: ["name"],
  Event: ["name", "startDate", "location"],
  OfferCatalog: ["itemListElement"],
  // value types, enforced wherever they appear
  Question: ["name", "acceptedAnswer"],
  Answer: ["text"],
  ListItem: ["position"],
  ImageObject: ["url"],
  Rating: ["ratingValue"],
};

const VALUE_TYPES = new Set(["Question", "Answer", "ListItem", "ImageObject", "Rating"]);

// ---------------------------------------------------------------------------
// rule 14 placeholder tokens (the plan's list, verbatim)
// ---------------------------------------------------------------------------
const PLACEHOLDER_PATTERNS = [
  /TODO/,
  /TBD/,
  /PLACEHOLDER/,
  /lorem/i,
  /Replace with/,
  /First name/,
  /Your Name/,
  /YYYY-MM-DD/,
  /20XX-MM-DD/,
  /example\.com/i,
  /localhost/i,
  /XXX/,
];

// ---------------------------------------------------------------------------
// Fixtures: one entry per exported generate* function. The
// "every export is exercised" test fails if a generator is added without one.
// ---------------------------------------------------------------------------
const FIXTURES = {
  generateWebPageSchema: [{ title: "Test Page", description: "Description", url: "/test-page" }],
  generateWebSiteSchema: [],
  generateArticleSchema: [{
    title: "Article",
    description: "Description",
    image: "/images/og-home.png",
    url: "/blog/article",
    datePublished: "2026-01-01T00:00:00.000Z",
    dateModified: "2026-01-02T00:00:00.000Z",
    author: "Max Petrusenko",
  }],
  generatePersonSchema: [],
  generateTechPersonSchema: [],
  generateSpiritualityPersonSchema: [],
  generateOrganizationSchema: [],
  generateBreadcrumbSchema: [[{ name: "Home", url: "/" }, { name: "Tech", url: "/tech" }]],
  generateItemListSchema: [[{ name: "Tech", url: "/tech" }], { name: "List", description: "Description" }],
  generateProfessionalServiceSchema: [],
  generateFAQSchema: [],
  generateMindfoldFAQSchema: [],
  generateTechServiceSchema: [],
  generateTechFAQSchema: [],
  generateHomeFAQSchema: [],
  generateSoftwareApplicationSchema: [{
    name: "App",
    description: "Description",
    url: "/app",
    applicationCategory: "BusinessApplication",
    offers: { price: "1", currency: "USD" },
    operatingSystem: "Web",
    keywords: ["automation"],
  }],
  generateTechArticleSchema: [{
    headline: "Headline",
    description: "Description",
    image: "/images/og-tech.png",
    url: "/tech/article",
    datePublished: "2026-01-01T00:00:00.000Z",
    author: "Max Petrusenko",
    keywords: ["automation"],
  }],
  generateEventSchema: [{
    name: "Event",
    description: "Description",
    url: "/mindfold/events",
    startDate: "2026-12-01T18:00:00.000Z",
    endDate: "2026-12-01T21:00:00.000Z",
    image: "/images/og-home.png",
    location: "Fort Lauderdale, FL",
  }],
  generateMindfoldEventSchema: [],
  // NOTE: takes a leading RELATIVE path; the generator prefixes siteConfig.url.
  generateScheduleActionSchema: ["tech"],
  generateOrganizationWithGBP: [],
  generateEnhancedPersonSchema: [],
  // NOTE: relative path — the generator prefixes siteConfig.url.
  generateSpeakableSchema: [{ url: "/tech", speakableTexts: ["h2"] }],
  generateServiceSpeakableSchema: [],
  generateTechSpeakableSchema: [],
  generateCombinedFAQSchema: [],
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Rule 4/§A3 traversal: every object carrying `@type`, at any depth. */
function* nodes(obj, nodePath = "$") {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i += 1) yield* nodes(obj[i], `${nodePath}[${i}]`);
    return;
  }
  if (!obj || typeof obj !== "object") return;
  if ("@type" in obj) yield [obj, nodePath];
  for (const [key, value] of Object.entries(obj)) {
    if (key === "@context") continue;
    yield* nodes(value, `${nodePath}.${key}`);
  }
}

/** Root = payload object, member of a top-level array, or `@graph` member. */
function isRootNode(nodePath) {
  return /^\$(\[\d+\])?(\.@graph\[\d+\])?$/.test(nodePath);
}

function typesOf(node) {
  const t = node["@type"];
  return Array.isArray(t) ? t : [t];
}

function listOf(value) {
  return Array.isArray(value) ? value : [value];
}

function* strings(obj, valuePath = "$") {
  if (typeof obj === "string") {
    yield [obj, valuePath];
    return;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i += 1) yield* strings(obj[i], `${valuePath}[${i}]`);
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      yield* strings(value, `${valuePath}.${key}`);
    }
  }
}

function parseHost(value) {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Collect a (node, path, urlProp, urlValue) tuple for every URL-bearing prop. */
function urlEntries(payload) {
  const entries = [];
  for (const [node, nodePath] of nodes(payload)) {
    for (const prop of [...HOST_BOUND_PROPS, "url", "urlTemplate", "sameAs"]) {
      if (!(prop in node)) continue;
      const raw = node[prop];
      // e.g. `logo: { "@type": "ImageObject", url: ... }`
      const values = listOf(raw).flatMap((v) =>
        v && typeof v === "object" && "url" in v ? listOf(v.url) : [v],
      );
      for (const value of values) {
        entries.push({ node, nodePath, prop, value });
      }
    }
  }
  return entries;
}

function allGenerators() {
  return Object.keys(schemas)
    .filter((name) => name.startsWith("generate") && typeof schemas[name] === "function")
    .sort();
}

function invoke(name) {
  assert.ok(
    Object.prototype.hasOwnProperty.call(FIXTURES, name),
    `missing contract-test fixture for exported generator ${name}() — add one`,
  );
  return schemas[name](...FIXTURES[name]);
}

// ---------------------------------------------------------------------------
// 1. every exported generator is exercised
// ---------------------------------------------------------------------------

test("contract: every exported generate* function has a fixture and is callable", () => {
  const generators = allGenerators();
  assert.ok(generators.length > 0, "no generate* exports found in structured-data.ts");
  for (const name of generators) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(FIXTURES, name),
      `missing contract-test fixture for exported generator ${name}()`,
    );
  }
  // and no fixture refers to a generator that no longer exists
  for (const name of Object.keys(FIXTURES)) {
    assert.ok(generators.includes(name), `fixture for ${name}() but that export no longer exists`);
  }
});

// ---------------------------------------------------------------------------
// 2. per-generator invariants
// ---------------------------------------------------------------------------

for (const name of allGenerators()) {
  test(`contract: ${name}() emits well-formed JSON-LD`, () => {
    const payload = invoke(name);

    // payload shape (rule 2)
    assert.notEqual(payload, undefined, `${name}() returned undefined`);
    assert.notEqual(payload, null, `${name}() returned null`);
    assert.equal(
      typeof payload,
      "object",
      `${name}() must return an object or an array of objects, got ${typeof payload}`,
    );

    const roots = Array.isArray(payload) ? payload : [payload];
    assert.ok(roots.length > 0, `${name}() returned an empty array`);
    for (const root of roots) {
      assert.equal(
        typeof root,
        "object",
        `${name}() returned a non-object element in its array`,
      );
      // rule 4
      assert.equal(
        root["@context"],
        "https://schema.org",
        `${name}() root node is missing @context = "https://schema.org"`,
      );
    }

    const seen = [...nodes(payload)];
    assert.ok(seen.length > 0, `${name}() produced no @type node at all`);

    for (const [node, nodePath] of seen) {
      // rule 5
      const types = typesOf(node);
      for (const t of types) {
        assert.equal(typeof t, "string", `${name}() ${nodePath}: @type must be a string`);
        assert.ok(t.trim().length > 0, `${name}() ${nodePath}: @type is an empty string`);
      }

      // §A3 required props (roots + value types), rule 6/7: never undefined
      for (const t of types) {
        const required = REQUIRED_BY_TYPE[t];
        if (!required) continue;
        if (!VALUE_TYPES.has(t) && !isRootNode(nodePath)) continue;
        for (const prop of required) {
          const value = node[prop];
          assert.notEqual(
            value,
            undefined,
            `${name}() ${nodePath} (${t}): required property "${prop}" is undefined`,
          );
          assert.notEqual(value, null, `${name}() ${nodePath} (${t}): "${prop}" is null`);
          if (typeof value === "string") {
            assert.notEqual(
              value.trim(),
              "",
              `${name}() ${nodePath} (${t}): "${prop}" is an empty string`,
            );
          }
          if (Array.isArray(value)) {
            assert.ok(value.length > 0, `${name}() ${nodePath} (${t}): "${prop}" is an empty array`);
          }
        }
      }
    }

    // rules 10 / 11 — absolute HTTPS, canonical host, no apex, allowlists
    for (const { nodePath, prop, value } of urlEntries(payload)) {
      const where = `${name}() ${nodePath}.${prop}`;
      assert.equal(typeof value, "string", `${where} must be a string URL`);
      assert.ok(
        value === "#" || value.startsWith("#") || /^https:\/\//.test(value),
        `${where} is not an absolute HTTPS URL: ${JSON.stringify(value)}`,
      );
      if (value.startsWith("#")) continue; // graph-internal identifier, rule 6 owns it

      const host = parseHost(value);
      assert.ok(host, `${where} is not parseable as a URL: ${JSON.stringify(value)}`);
      assert.notEqual(host, APEX_HOST, `${where} uses the apex host (it 301s to www): ${value}`);

      if (HOST_BOUND_PROPS.includes(prop)) {
        assert.equal(
          host,
          CANONICAL_HOST,
          `${where} must be on the canonical host ${CANONICAL_HOST}, got ${host}: ${value}`,
        );
        continue;
      }

      if (host === CANONICAL_HOST) continue;

      const allowlist = prop === "sameAs" ? EXTERNAL_PROFILE_HOSTS : OFFHOST_URL_ALLOWLIST;
      assert.ok(
        allowlist.has(host),
        `${where} points off-host at ${host}, which is not in the allowlist for "${prop}". ` +
          `Add it deliberately (with a comment) or point it at ${CANONICAL_HOST}.`,
      );
    }

    // rule 14 — placeholder tokens
    for (const [value, valuePath] of strings(payload)) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        assert.doesNotMatch(
          value,
          pattern,
          `${name}() ${valuePath} contains a placeholder token ${pattern}: ${JSON.stringify(value)}`,
        );
      }
    }
  });
}

// ---------------------------------------------------------------------------
// 3. rule 18 — the Organization logo is a crawlable raster, never an SVG
// ---------------------------------------------------------------------------

test("contract: Organization logo is a raster asset on the canonical host", () => {
  const organizations = [
    ["generateOrganizationSchema", schemas.generateOrganizationSchema()],
    ["generateOrganizationWithGBP", schemas.generateOrganizationWithGBP()],
    ["generateProfessionalServiceSchema", schemas.generateProfessionalServiceSchema()],
    ["generateTechServiceSchema", schemas.generateTechServiceSchema()],
    ["generateArticleSchema publisher", schemas.generateArticleSchema(...FIXTURES.generateArticleSchema).publisher],
  ];

  for (const [label, node] of organizations) {
    const logo = node.logo;
    assert.ok(logo, `${label}: expected a logo`);
    const url = typeof logo === "string" ? logo : logo.url;
    assert.ok(typeof url === "string" && url.length > 0, `${label}: logo url missing`);
    assert.ok(
      url.startsWith(`${CANONICAL_ORIGIN}/`),
      `${label}: logo must be served from ${CANONICAL_ORIGIN}, got ${url}`,
    );
    assert.doesNotMatch(
      url,
      /\.svg($|\?)/i,
      `${label}: logo must be a raster image (Google ignores SVG logos), got ${url}`,
    );
    assert.match(url, /\.(png|jpe?g|gif|webp)($|\?)/i, `${label}: logo is not a raster format: ${url}`);
  }
});

test("contract: the raster brand logo asset really exists, is PNG and big enough", () => {
  const logoUrl = schemas.generateOrganizationSchema().logo.url;
  const relative = logoUrl.slice(CANONICAL_ORIGIN.length);
  const assetPath = path.join(NEXTJS_ROOT, "public", relative.replace(/^\//, ""));

  assert.ok(fs.existsSync(assetPath), `logo asset missing on disk: ${assetPath}`);

  const bytes = fs.readFileSync(assetPath);
  assert.equal(
    bytes.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    `${assetPath} is not a PNG (bad magic bytes)`,
  );

  // IHDR: width/height are big-endian uint32 at offsets 16 and 20
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.ok(width >= 112 && height >= 112, `logo must be >= 112x112, got ${width}x${height}`);
});

test("contract: the SVG brand mark is left in place for non-JSON-LD consumers", () => {
  const svgPath = path.join(NEXTJS_ROOT, "public", "images", "brand-mark.svg");
  assert.ok(fs.existsSync(svgPath), `brand-mark.svg should still exist at ${svgPath}`);
});

// ---------------------------------------------------------------------------
// 4. policy — NO self-serving AggregateRating, NO Review, NO rating value
// ---------------------------------------------------------------------------
//
// Google's review-snippet policy (review-snippet, updated 2026-09-08) is
// explicit:
//
//   "If the entity that's being reviewed controls the reviews about itself,
//    their pages that use LocalBusiness or any other type of Organization
//    structured data are ineligible for star review feature."
//   "Ratings must be sourced directly from users."
//
// Every AggregateRating this module used to emit rated Max / his own
// Organization / his own ProfessionalService (a LocalBusiness subtype) from
// Max's own site. The 4.9 behind them was a hardcoded literal, not anything a
// user supplied, and the generated "Review" children hardcoded ratingValue "5"
// while the parent claimed 4.9. The generators are deleted, not merely
// uncalled. These tests assert the ABSENCE, so a reintroduction fails here
// before it can reach a build.

/** Every node in the payload carrying @type AggregateRating. */
function aggregateRatingNodes(payload) {
  return [...nodes(payload)].filter(([node]) => typesOf(node).includes("AggregateRating"));
}

/** Every node in the payload carrying @type Review. */
function reviewNodes(payload) {
  return [...nodes(payload)].filter(([node]) => typesOf(node).includes("Review"));
}

/** The exact JSON-LD block set app/page.tsx composes, in order. */
function homepagePayload() {
  return [
    schemas.generateWebPageSchema({
      title: "Max Petrusenko — Presence & Product",
      description: "AI automation for creators and founders, plus Tantra-informed somatic work by request.",
      url: "/",
    }),
    schemas.generateWebSiteSchema(),
    schemas.generateBreadcrumbSchema([{ name: "Home", url: "/" }]),
    schemas.generateProfessionalServiceSchema(),
    schemas.generateTechServiceSchema(),
    schemas.generateHomeFAQSchema(),
    schemas.generateEnhancedPersonSchema(),
  ];
}

test("policy: no generator emits an AggregateRating", () => {
  const offenders = [];
  for (const name of allGenerators()) {
    for (const [, nodePath] of aggregateRatingNodes(invoke(name))) {
      offenders.push(`${name}() ${nodePath}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "self-serving AggregateRating markup is ineligible under Google's review-snippet " +
      `policy; these generators must emit none: ${offenders.join(", ")}`,
  );
});

test("policy: no generator emits a Review (reviews of oneself are the same ineligibility)", () => {
  const offenders = [];
  for (const name of allGenerators()) {
    for (const [, nodePath] of reviewNodes(invoke(name))) {
      offenders.push(`${name}() ${nodePath}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `a site must not mark up reviews about itself: ${offenders.join(", ")}`,
  );
});

test("policy: no generator emits a rating value of any kind", () => {
  // "Ratings must be sourced directly from users." This module has no
  // user-sourced rating input, so nothing it emits may carry one.
  const offenders = [];
  for (const name of allGenerators()) {
    const serialized = JSON.stringify(invoke(name));
    if (/"(ratingValue|ratingCount|reviewCount|ratingAverage)"/.test(serialized)) {
      offenders.push(name);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `no generator may emit a rating value without a user-sourced corpus: ${offenders.join(", ")}`,
  );
});

test("policy: the rating-only generators are deleted, not merely left uncalled", () => {
  // Deleting the code path is the point: a dead generator is one import away
  // from being wired back up.
  for (const name of [
    "generateAggregateRatingSchema",
    "generateReviewSchema",
    "generateAllReviewsSchema",
    "generateItemListWithReviewsSchema",
  ]) {
    assert.ok(!(name in schemas), `${name}() must stay deleted from structured-data.ts`);
  }
});

test("policy: the homepage emits zero AggregateRating nodes", () => {
  const payload = homepagePayload();
  const found = aggregateRatingNodes(payload).map(([, nodePath]) => nodePath);
  assert.deepEqual(
    found,
    [],
    `the homepage must emit no AggregateRating at all, found: ${found.join(", ")}`,
  );
});

test("policy: the JsonLd type map carries no AggregateRating or Review entry", () => {
  // Type-level backstop so `<JsonLd type="AggregateRating" ... />` cannot be
  // reintroduced without a compile error.
  const jsonLdSource = fs.readFileSync(path.join(NEXTJS_ROOT, "components", "seo", "JsonLd.tsx"), "utf8");
  assert.doesNotMatch(jsonLdSource, /AggregateRating:/, "JsonLd.tsx must not map AggregateRating");
  assert.doesNotMatch(jsonLdSource, /^\s*Review:/m, "JsonLd.tsx must not map Review");

  const typesSource = fs.readFileSync(path.join(NEXTJS_ROOT, "types", "index.ts"), "utf8");
  assert.doesNotMatch(
    typesSource,
    /"AggregateRating"/,
    'JsonLdProps.type must not include "AggregateRating"',
  );
  assert.doesNotMatch(typesSource, /"Review"/, 'JsonLdProps.type must not include "Review"');
});

test("policy: the visible homepage rating card is copy, not markup, and is untracked by schema", () => {
  // Guard the boundary this change was scoped to: the visible stat card may
  // stay (it is a separate editorial decision) but it must never be re-wired
  // into JSON-LD. If a future edit puts it back into schema, the generator
  // tests above are the ones that must fail — this one documents the intent.
  const found = aggregateRatingNodes(homepagePayload());
  assert.equal(found.length, 0, "no schema node may carry the visible 4.9/5 card's value");
});

// ---------------------------------------------------------------------------
// 5. regression guards for the three assigned fixes
// ---------------------------------------------------------------------------

test("regression: generateProfessionalServiceSchema() no longer carries a rating", () => {
  const node = schemas.generateProfessionalServiceSchema();
  assert.equal(node["@type"], "WebPage");
  assert.ok(
    !("aggregateRating" in node),
    "generateProfessionalServiceSchema() emits a WebPage; a business rating does not belong on it",
  );
  assert.ok(node.hasOfferCatalog, "the offer catalog must survive the rating removal");
});

test("regression: generateTechServiceSchema() carries no rating", () => {
  const node = schemas.generateTechServiceSchema();
  assert.equal(node["@type"], "ProfessionalService");
  assert.ok(
    !("aggregateRating" in node),
    "generateTechServiceSchema() rates Max's own business on Max's own site — ineligible markup",
  );
  assert.ok(node.hasOfferCatalog, "the offer catalog must survive the rating removal");
});

test("regression: the Google Business Profile sentinel never reaches output", () => {
  const serialized = JSON.stringify(schemas.generateOrganizationWithGBP());
  assert.doesNotMatch(
    serialized,
    /TODO_ADD_AFTER_VERIFICATION/,
    "GOOGLE_BUSINESS_PROFILE_ID is conditionally spread; it must never be rendered",
  );
  assert.doesNotMatch(JSON.stringify(homepagePayload()), /TODO_ADD_AFTER_VERIFICATION/);
});

test("regression: generateOrganizationWithGBP() carries no rating either", () => {
  // It used to append `aggregateRating: generateAggregateRatingSchema("spirituality")`
  // to the Organization — the most explicitly self-serving shape of all.
  const node = schemas.generateOrganizationWithGBP();
  assert.ok(
    !("aggregateRating" in node),
    "the Organization node must not rate itself",
  );
});
