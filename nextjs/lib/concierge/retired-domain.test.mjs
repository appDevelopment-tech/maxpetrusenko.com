import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Needle is built from parts so this file never matches itself.
const NEEDLE = ["studio", "maxpetrusenko", "com"].join(".");
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|pdf|woff2?|ttf|otf|mp4|mov|zip|gz|map)$/i;

test("no tracked file references the retired studio subdomain", () => {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 })
    .split("\0")
    .filter((f) => f && !BINARY.test(f));
  const hits = [];
  for (const f of files) {
    let text;
    try {
      text = readFileSync(path.join(root, f), "utf8");
    } catch {
      continue;
    }
    if (!text.includes(NEEDLE)) continue;
    text.split("\n").forEach((line, i) => {
      if (line.includes(NEEDLE)) hits.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, [], `retired domain found:\n${hits.join("\n")}`);
});
