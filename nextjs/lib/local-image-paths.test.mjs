import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(repoRoot, "public");
const scanRoots = ["app", "components", "lib"].map((dir) => path.join(repoRoot, dir));
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".txt"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

test("local /images references point to files that exist in public/", () => {
  const references = new Map();
  const imagePathPattern = /["'`](\/images\/[^"'` )}]+)/g;

  for (const root of scanRoots) {
    for (const file of walk(root)) {
      const text = fs.readFileSync(file, "utf8");
      let match;

      while ((match = imagePathPattern.exec(text)) !== null) {
        const imagePath = match[1];
        if (!references.has(imagePath)) {
          references.set(imagePath, []);
        }
        references.get(imagePath).push(path.relative(repoRoot, file));
      }
    }
  }

  const missing = [];
  for (const [imagePath, files] of references) {
    const assetPath = path.join(publicDir, imagePath.replace(/^\//, ""));
    if (!fs.existsSync(assetPath)) {
      missing.push(`${imagePath} <- ${files.join(", ")}`);
    }
  }

  assert.deepEqual(missing, []);
});
