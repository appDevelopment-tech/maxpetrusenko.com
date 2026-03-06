import { chromium } from "playwright";
import fs from "node:fs";

const baseArg = process.argv[2];
const baseEnv = process.env.UI_SCAN_BASE_URL;
const baseUrl = new URL(baseArg || baseEnv || "https://www.maxpetrusenko.com");
const origin = baseUrl.origin;

const paths = [
  "/",
  "/about",
  "/blog/topics",
  "/blog/ssr-ai-citations-fundamentals",
  "/tantra-massage-ubud",
  "/tech",
  "/tech/articles",
  "/tech/articles/openclaw-installation-playbook",
  "/mindfold",
  "/mindfold/events",
  "/spirituality",
  "/spirituality/articles",
  "/tech/claude-subagents",
  "/tech/mindfold",
  "/tech/presence-atelier"
];

const timeoutMs = Number(process.env.UI_SCAN_TIMEOUT_MS || 45000);

const chromePathEnv = process.env.UI_SCAN_CHROME_PATH;
const chromePathDefault = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chromePath = chromePathEnv || (fs.existsSync(chromePathDefault) ? chromePathDefault : "");

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath || undefined,
  args: [
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-sandbox"
  ]
});
const page = await browser.newPage();

const results = [];
for (const path of paths) {
  const url = new URL(path, baseUrl).toString();
  let status = "no-response";
  let title = "";
  let h1 = "";
  let canonical = "";
  let robots = "";
  let error = "";

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    status = response ? String(response.status()) : "no-response";
    title = await page.title();
    h1 = await page.locator("h1").first().innerText().catch(() => "");
    canonical = await page.locator('link[rel="canonical"]').getAttribute("href").catch(() => "");
    robots = await page.locator('meta[name="robots"]').getAttribute("content").catch(() => "");
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const canonicalOk = canonical ? canonical.startsWith(origin) : false;
  const robotsNoindex = /noindex/i.test(robots || "");
  const ok = status === "200" && Boolean(title) && Boolean(h1) && canonicalOk && !robotsNoindex && !error;

  results.push({
    url,
    status,
    title: title.trim(),
    h1: h1.trim(),
    canonical,
    canonicalOk,
    robots,
    robotsNoindex,
    ok,
    error
  });
}

await browser.close();

const header = [
  "STATUS",
  "OK",
  "CANONICAL",
  "ROBOTS",
  "URL"
];

console.log(header.join("\t"));
for (const result of results) {
  const canonicalStatus = result.canonicalOk ? "ok" : result.canonical ? "bad" : "missing";
  const robotsStatus = result.robotsNoindex ? "noindex" : "ok";
  const okStatus = result.ok ? "ok" : "fail";
  console.log([result.status, okStatus, canonicalStatus, robotsStatus, result.url].join("\t"));
  if (!result.ok) {
    if (result.title) console.log(`  title: ${result.title}`);
    if (result.h1) console.log(`  h1: ${result.h1}`);
    if (result.canonical) console.log(`  canonical: ${result.canonical}`);
    if (result.robots) console.log(`  robots: ${result.robots}`);
    if (result.error) console.log(`  error: ${result.error}`);
  }
}

const failures = results.filter((r) => !r.ok);
if (failures.length) {
  process.exitCode = 1;
}
