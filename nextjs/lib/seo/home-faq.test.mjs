import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildHomeFaqMainEntity, homeFaqEntries } from "./home-faq.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appPagePath = path.resolve(__dirname, "../../app/page.tsx");
const homeFaqSectionPath = path.resolve(__dirname, "../../components/home/HomeFaqSection.tsx");

test("homepage FAQ schema is generated from the shared FAQ entries", () => {
  const mainEntity = buildHomeFaqMainEntity();

  assert.ok(Array.isArray(mainEntity));
  assert.equal(mainEntity.length, homeFaqEntries.length);

  const schemaQuestions = mainEntity.map((item) => item.name);
  const entryQuestions = homeFaqEntries.map((item) => item.question);

  assert.deepEqual(schemaQuestions, entryQuestions);
});

test("homepage renders a visible FAQ section from the shared FAQ entries", () => {
  const pageSource = fs.readFileSync(appPagePath, "utf8");
  const sectionSource = fs.readFileSync(homeFaqSectionPath, "utf8");

  assert.match(pageSource, /HomeFaqSection/);
  assert.match(pageSource, /faqEntries=\{homeFaqEntries\}/);
  assert.match(sectionSource, /Frequently Asked Questions/);
  assert.match(sectionSource, /faqEntries\.map/);
});
