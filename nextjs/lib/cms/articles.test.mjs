import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, "./articles.ts");
const source = fs.readFileSync(sourcePath, "utf8");

test("articles helpers export NaN-safe sorting and topic cluster selection", () => {
  assert.match(source, /export function sortArticlesByDateDesc/);
  assert.match(source, /function toSortTimestamp\(publishedAt: string\): number/);
  assert.match(source, /Number\.isNaN\(timestamp\) \? Number\.NEGATIVE_INFINITY : timestamp/);
  assert.match(source, /export function getTopicClusterArticles/);
});

test("topic cluster fetchers no longer hard-code the \/blog\/ path gate", () => {
  assert.doesNotMatch(source, /article\.link\.startsWith\("\/blog\/"\)/);
});
