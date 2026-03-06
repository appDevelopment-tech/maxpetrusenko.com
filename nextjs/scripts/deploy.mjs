import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const repoRoot = path.resolve(projectRoot, "..");
const envFile = path.join(repoRoot, ".env");

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!/^[A-Z0-9_]+$/.test(key)) continue;
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }

  return env;
}

const fileEnv = loadEnvFile(envFile);
const env = { ...process.env, ...fileEnv };

if (!env.CLOUDFLARE_API_TOKEN) {
  env.CLOUDFLARE_API_TOKEN = env.CF_API_TOKEN || env.CLOUDFARE_USER_TOKEN || "";
}

if (!env.CLOUDFLARE_API_TOKEN) {
  console.error("Missing CLOUDFLARE_API_TOKEN. Add it to .env or shell env before deploy.");
  process.exit(1);
}

const result = spawnSync("wrangler", ["pages", "deploy"], {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);
