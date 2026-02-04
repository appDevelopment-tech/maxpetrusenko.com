import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const appDir = path.join(projectRoot, "app");

const knownDynamicPrefixes = [
  "/blog/",
  "/blog/tag/",
  "/tech/",
  "/tech/case-studies/",
];

const criticalRoutes = [
  "/",
  "/blog",
  "/spirituality",
  "/spirituality/articles",
  "/spirituality/blog",
  "/spirituality/blog/what-to-expect-first-tantra-session",
  "/spirituality/blog/questions-to-ask-tantra-practitioner",
  "/spirituality/blog/tantra-vs-regular-massage",
  "/spirituality/blog/temple-space-preparation",
  "/spirituality/articles/tantra-trauma-ptsd",
  "/tantra-massage-ubud",
  "/tech",
  "/tech/articles",
  "/tech/articles/openclaw-installation-playbook",
  "/tech/articles/answer-engine-optimization-aeo",
  "/tech/articles/generative-engine-optimization-geo",
  "/tech/articles/seo-is-dead",
  "/tech/case-studies",
  "/tech/case-studies/claude-code-automation",
];

const contentDirs = [
  path.join(appDir, "tech", "articles"),
  path.join(appDir, "spirituality", "articles"),
  path.join(appDir, "spirituality", "blog"),
];

const weakPatterns = [
  /lorem ipsum/i,
  /coming soon/i,
  /tbd/i,
  /TODO:/,
  /\bAI slop\b/i,
];

function routeFileExists(route) {
  if (route === "/") {
    return fs.existsSync(path.join(appDir, "page.tsx"));
  }

  const directFile = path.join(appDir, route.replace(/^\//, ""), "page.tsx");
  if (fs.existsSync(directFile)) return true;

  if (route.startsWith("/blog/")) {
    return fs.existsSync(path.join(appDir, "blog", "[slug]", "page.tsx"));
  }

  if (route.startsWith("/blog/tag/")) {
    return fs.existsSync(path.join(appDir, "blog", "tag", "[tag]", "page.tsx"));
  }

  if (route.startsWith("/tech/case-studies/")) {
    return fs.existsSync(path.join(appDir, "tech", "case-studies", "[id]", "page.tsx"));
  }

  if (route.startsWith("/tech/") && !route.startsWith("/tech/articles/") && route !== "/tech") {
    return fs.existsSync(path.join(appDir, "tech", "[slug]", "page.tsx"));
  }

  return false;
}

function extractSitemapRoutes() {
  const sitemapFile = path.join(appDir, "sitemap.ts");
  const source = fs.readFileSync(sitemapFile, "utf8");
  const routes = [];
  const regex = /`\$\{baseUrl\}(\/[^`]+)`/g;

  let match;
  while ((match = regex.exec(source))) {
    if (match[1] && !match[1].includes("${")) {
      routes.push(match[1]);
    }
  }

  return [...new Set(routes)];
}

function verifySpiritualityBlogSlugs() {
  const file = path.join(appDir, "spirituality", "blog", "page.tsx");
  const source = fs.readFileSync(file, "utf8");
  const slugRegex = /slug:\s*"([^"]+)"/g;

  const missing = [];
  let match;
  while ((match = slugRegex.exec(source))) {
    const slug = match[1];
    const postPage = path.join(appDir, "spirituality", "blog", slug, "page.tsx");
    if (!fs.existsSync(postPage)) {
      missing.push(`/spirituality/blog/${slug}`);
    }
  }

  return missing;
}

function collectFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }

  return files;
}

function checkWeakContentPatterns() {
  const offenders = [];

  for (const dir of contentDirs) {
    const files = collectFiles(dir);
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      const matched = weakPatterns.find((pattern) => pattern.test(source));
      if (matched) {
        offenders.push({ file, pattern: matched.toString() });
      }
    }
  }

  return offenders;
}

function main() {
  const errors = [];

  const missingCritical = criticalRoutes.filter((route) => !routeFileExists(route));
  if (missingCritical.length > 0) {
    errors.push(`Missing critical routes:\n${missingCritical.map((r) => `  - ${r}`).join("\n")}`);
  }

  const sitemapRoutes = extractSitemapRoutes();
  const missingSitemap = sitemapRoutes.filter((route) => !routeFileExists(route));
  if (missingSitemap.length > 0) {
    errors.push(`Sitemap contains missing routes:\n${missingSitemap.map((r) => `  - ${r}`).join("\n")}`);
  }

  const missingBlogPages = verifySpiritualityBlogSlugs();
  if (missingBlogPages.length > 0) {
    errors.push(
      `Spirituality blog index includes routes without pages:\n${missingBlogPages.map((r) => `  - ${r}`).join("\n")}`
    );
  }

  const weakContent = checkWeakContentPatterns();
  if (weakContent.length > 0) {
    errors.push(
      `Weak placeholder content patterns detected:\n${weakContent
        .map((item) => `  - ${path.relative(projectRoot, item.file)} (${item.pattern})`)
        .join("\n")}`
    );
  }

  if (errors.length > 0) {
    console.error("\nPredeploy verification failed:\n");
    console.error(errors.join("\n\n"));
    process.exit(1);
  }

  const inspectedRoutes = criticalRoutes.length + sitemapRoutes.length;
  const inspectedFiles = contentDirs.map((dir) => collectFiles(dir).length).reduce((a, b) => a + b, 0);

  console.log(`Predeploy verification passed.`);
  console.log(`- Critical + sitemap routes checked: ${inspectedRoutes}`);
  console.log(`- Content files scanned: ${inspectedFiles}`);

  const dynamicCovered = knownDynamicPrefixes.filter((prefix) =>
    sitemapRoutes.some((route) => route.startsWith(prefix))
  );
  console.log(`- Dynamic route families present in sitemap: ${dynamicCovered.join(", ") || "none"}`);
}

main();
