import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const backlogFile = path.join(projectRoot, "lib", "cms", "article-backlog.ts");
const sitemapFile = path.join(projectRoot, "app", "sitemap.ts");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function extractArrayBlock(source, declarationPrefix) {
  const start = source.indexOf(declarationPrefix);
  if (start === -1) return null;

  const fromStart = source.slice(start);
  const match = fromStart.match(/=\s*\[([\s\S]*?)\n\];/);
  return match ? match[1] : null;
}

function extractObjectBlock(source, declarationPrefix) {
  const start = source.indexOf(declarationPrefix);
  if (start === -1) return null;

  const fromStart = source.slice(start);
  const match = fromStart.match(/=\s*\{([\s\S]*?)\n\};/);
  return match ? match[1] : null;
}

function collectMatches(block, regex, group = 1) {
  if (!block) return [];
  const values = [];
  let match;
  while ((match = regex.exec(block))) {
    values.push(match[group]);
  }
  return values;
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function main() {
  const backlog = read(backlogFile);
  const sitemap = read(sitemapFile);
  const errors = [];

  const seedsBlock = extractArrayBlock(backlog, "const SEEDS: BacklogSeed[]");
  const perspectivesBlock = extractArrayBlock(backlog, "const TOPIC_PERSPECTIVES: TopicPerspective[]");
  const topicsBlock = extractArrayBlock(backlog, "const USER_REQUEST_TOPICS: TopicSpec[]");
  const extraTopicBlock = extractObjectBlock(backlog, "const EXTRA_TANTRA_TOPIC: TopicSpec");

  const baseSeedSlugs = collectMatches(seedsBlock, /slug:\s*"([^"]+)"/g);
  const perspectiveKeys = collectMatches(perspectivesBlock, /key:\s*"([^"]+)"/g);
  const topicSlugs = collectMatches(topicsBlock, /slug:\s*"([^"]+)"/g);
  const extraTopicSlug = collectMatches(extraTopicBlock, /slug:\s*"([^"]+)"/g)[0];

  assert(baseSeedSlugs.length > 0, "No base seeds found in article-backlog.ts", errors);
  assert(perspectiveKeys.length >= 20, `Expected at least 20 perspectives; found ${perspectiveKeys.length}`, errors);
  assert(topicSlugs.length >= 24, `Expected at least 24 requested topics; found ${topicSlugs.length}`, errors);
  assert(Boolean(extraTopicSlug), "Missing EXTRA_TANTRA_TOPIC slug", errors);

  const uniquePerspectiveKeys = new Set(perspectiveKeys);
  const uniqueTopicSlugs = new Set(topicSlugs);
  const uniqueBaseSeedSlugs = new Set(baseSeedSlugs);

  assert(uniquePerspectiveKeys.size === perspectiveKeys.length, "Duplicate perspective keys detected", errors);
  assert(uniqueTopicSlugs.size === topicSlugs.length, "Duplicate topic slugs detected", errors);
  assert(uniqueBaseSeedSlugs.size === baseSeedSlugs.length, "Duplicate base seed slugs detected", errors);

  const generatedSlugs = new Set();
  for (const topic of [...topicSlugs, extraTopicSlug]) {
    for (const key of perspectiveKeys) {
      generatedSlugs.add(`${topic}-${key}`);
    }
  }

  for (const slug of baseSeedSlugs) {
    if (generatedSlugs.has(slug)) {
      errors.push(`Slug collision between base and generated seeds: ${slug}`);
    }
  }

  const expectedGeneratedCount = (topicSlugs.length + 1) * perspectiveKeys.length;
  const expectedExpansionTotal = baseSeedSlugs.length + expectedGeneratedCount;

  assert(
    /const TOPIC_PERSPECTIVE_KEYS:\s*string\[\]\s*=\s*TOPIC_PERSPECTIVES\.map/.test(backlog),
    "TOPIC_PERSPECTIVE_KEYS export is missing or changed unexpectedly",
    errors
  );
  assert(
    /const EXPANSION_TOPIC_GROUPS:\s*ExpansionTopicGroup\[\]\s*=\s*\[/.test(backlog),
    "EXPANSION_TOPIC_GROUPS export is missing or changed unexpectedly",
    errors
  );
  assert(
    sitemap.includes("`${baseUrl}/blog/topics`"),
    "Sitemap is missing /blog/topics static entry",
    errors
  );

  if (errors.length > 0) {
    console.error("\nTopic cluster verification failed:\n");
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }

  console.log("Topic cluster verification passed.");
  console.log(`- Requested topics: ${topicSlugs.length}`);
  console.log(`- Perspectives per topic: ${perspectiveKeys.length}`);
  console.log(`- Base seeds: ${baseSeedSlugs.length}`);
  console.log(`- Expected generated slugs: ${expectedGeneratedCount}`);
  console.log(`- Expected expansion article total: ${expectedExpansionTotal}`);
}

main();
