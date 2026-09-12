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
 *  - rule 8  the homepage composition carries at most ONE AggregateRating per
 *            entity, and no bare root-level AggregateRating.
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
  generateReviewSchema: [
    { quote: "Quote", author: "Author", role: "Role", type: "tech" },
    "AI & Automation Services",
  ],
  generateAllReviewsSchema: ["tech"],
  generateAggregateRatingSchema: ["all"],
  generateItemListWithReviewsSchema: [[{ name: "Svc", description: "D", url: "/tech" }], "tech"],
  generateOrganizationWithGBP: [],
  generateProfessionalServiceSchemaByRequest: [],
  generateProfessionalServiceSchemaMiami: [],
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
// 4. rule 8 — the homepage emits at most ONE AggregateRating, on an entity
// ---------------------------------------------------------------------------

/** Mirror of sd-check's rule 8 owner test: group by immediate ancestor node path. */
function aggregateRatingOwners(payload) {
  const byOwner = new Map();
  const walk = (obj, nodePath = "$", ancestors = []) => {
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => walk(v, `${nodePath}[${i}]`, ancestors));
      return;
    }
    if (!obj || typeof obj !== "object") return;
    const hasType = "@type" in obj;
    if (hasType && typesOf(obj).includes("AggregateRating")) {
      const owner = ancestors.length > 0 ? ancestors[ancestors.length - 1] : "$";
      const owners = byOwner.get(owner) ?? [];
      owners.push(nodePath);
      byOwner.set(owner, owners);
    }
    const nextAncestors = hasType ? [...ancestors, nodePath] : ancestors;
    for (const [key, value] of Object.entries(obj)) {
      if (key === "@context") continue;
      walk(value, `${nodePath}.${key}`, nextAncestors);
    }
  };
  walk(payload);
  return byOwner;
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

test("contract: the homepage carries exactly one AggregateRating (rule 8)", () => {
  const payload = homepagePayload();
  const owners = aggregateRatingOwners(payload);

  const all = [...owners.values()].flat();
  assert.equal(
    all.length,
    1,
    `homepage must emit exactly one AggregateRating, found ${all.length}: ${all.join(", ")}`,
  );

  for (const [owner, paths] of owners) {
    assert.equal(
      paths.length,
      1,
      `entity ${owner} carries ${paths.length} AggregateRating nodes (rule 8 allows one): ${paths.join(", ")}`,
    );
  }
});

test("contract: the surviving homepage AggregateRating rides on the rated entity, not the page", () => {
  const payload = homepagePayload();
  const owners = aggregateRatingOwners(payload);

  // One owner, and it must be a page-graph root block (the payload is an array
  // of independent <script> blocks, so roots are $[0]..$[n]).
  assert.equal(owners.size, 1, `expected one AggregateRating owner, got ${owners.size}`);
  const [ownerPath] = [...owners.keys()];
  assert.match(
    ownerPath,
    /^\$(\[\d+\])?$/,
    `the AggregateRating owner ${ownerPath} is not a root block`,
  );

  const roots = Array.isArray(payload) ? payload : [payload];
  const rootIndex = ownerPath === "$" ? null : Number(ownerPath.replace(/^\$\[(\d+)\]$/, "$1"));
  const ownerNode = rootIndex === null ? payload : roots[rootIndex];
  assert.ok(ownerNode, `no node found at ${ownerPath}`);
  assert.ok(
    typesOf(ownerNode).includes("ProfessionalService"),
    `the AggregateRating should be attached to the ProfessionalService entity, got ${typesOf(ownerNode).join("|")}`,
  );

  // and NOT on a WebPage / Organization / Person
  for (const [node, nodePath] of nodes(payload)) {
    if (!("aggregateRating" in node)) continue;
    const types = typesOf(node);
    assert.ok(
      types.includes("ProfessionalService") || types.includes("AggregateRating"),
      `${nodePath} (${types.join("|")}) must not carry an aggregateRating`,
    );
  }
});

test("contract: no generator emits a bare root-level AggregateRating payload", () => {
  // An AggregateRating is not a standalone entity: it belongs on the item it rates.
  // app/page.tsx used to render `<JsonLd type="AggregateRating" data={generateAggregateRatingSchema("all")} />`.
  const payload = schemas.generateAggregateRatingSchema("all");
  assert.equal(payload["@type"], "AggregateRating");
  assert.ok(
    payload.itemReviewed,
    "generateAggregateRatingSchema() must name the entity it rates via itemReviewed",
  );

  const homepageBlocks = homepagePayload();
  assert.ok(
    !homepageBlocks.some((block) => block["@type"] === "AggregateRating"),
    "the homepage must not render a standalone AggregateRating block",
  );
  assert.ok(
    !homepageBlocks.some((block) =>
      block["@type"] === "WebPage" && "aggregateRating" in block,
    ),
    "the homepage must not put an aggregateRating on a WebPage node",
  );
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

test("regression: generateTechServiceSchema() still carries the tech rating", () => {
  const node = schemas.generateTechServiceSchema();
  assert.equal(node["@type"], "ProfessionalService");
  const rating = node.aggregateRating;
  assert.ok(rating, "the ProfessionalService should keep its AggregateRating");
  assert.equal(rating["@type"], "AggregateRating");
  assert.match(String(rating.ratingValue), /^\d+(\.\d+)?$/);
  assert.match(String(rating.reviewCount), /^\d+$/);
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

test("regression: generateAllReviewsSchema() is callable without CommonJS require()", () => {
  // It used to do `const { testimonials } = require("@/lib/cms/testimonials")`,
  // which throws "require is not defined in ES module scope" under any ESM loader.
  for (const serviceType of ["tech", "spirituality", "mindfold"]) {
    const reviews = schemas.generateAllReviewsSchema(serviceType);
    assert.ok(Array.isArray(reviews), `generateAllReviewsSchema(${serviceType}) must return an array`);
    assert.ok(reviews.length > 0, `generateAllReviewsSchema(${serviceType}) returned nothing`);
    for (const review of reviews) {
      assert.equal(review["@type"], "Review");
      assert.ok(review.author, "Review.author is required");
      assert.ok(review.reviewRating, "Review.reviewRating is required");
      assert.ok(review.reviewBody, "Review.reviewBody should be present");
    }
  }
});
