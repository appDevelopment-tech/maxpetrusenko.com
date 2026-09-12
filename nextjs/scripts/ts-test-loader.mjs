import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/**
 * `@/*` tsconfig path-alias support for the `node --test` runner.
 *
 * The alias is declared in tsconfig.json `compilerOptions.paths` and resolved by
 * Next.js/webpack at build time. `node --test` knows nothing about it, so any
 * module reached from a test that imports `@/...` (directly or transitively)
 * needs this resolution step. tsconfig maps `"@/*": ["./*"]` against the
 * project root, which is the runner's cwd (the `nextjs/` package directory).
 */
const ALIAS_PREFIX = "@/";
const ALIAS_SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".mjs",
  ".js",
  ".json",
  "/index.ts",
  "/index.tsx",
];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(ALIAS_PREFIX)) {
    const base = path.resolve(process.cwd(), specifier.slice(ALIAS_PREFIX.length));
    for (const suffix of ALIAS_SUFFIXES) {
      const candidate = `${base}${suffix}`;
      try {
        const stat = fsSync.statSync(candidate);
        if (stat.isFile()) {
          return {
            url: pathToFileURL(candidate).href,
            format: candidate.endsWith(".json") ? "json" : "module",
            shortCircuit: true,
          };
        }
      } catch {
        // keep probing
      }
    }
    throw new Error(
      `ts-test-loader: unresolved tsconfig alias ${JSON.stringify(specifier)} ` +
        `(looked for ${base}{${ALIAS_SUFFIXES.join(",")}}) ` +
        `imported from ${context.parentURL ?? "<entry>"}`,
    );
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = await fs.readFile(new URL(url), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
      },
    });

    return {
      format: "module",
      shortCircuit: true,
      source: outputText,
    };
  }

  return nextLoad(url, context);
}
