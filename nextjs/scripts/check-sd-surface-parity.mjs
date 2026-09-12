#!/usr/bin/env node
/**
 * Surface-parity check (§A4.1/§A4.2/§A4.3 of the structured-data CI gate plan).
 *
 * WHY
 * ---
 * `@cloudflare/next-on-pages` writes a Next.js App Router build into two very
 * different shapes:
 *
 *   static/**\/*.html                        pre-rendered pages, ready to serve
 *   functions/**\/*prerender-fallback.html   the RSC prerender fallback twin
 *
 * Both can carry JSON-LD, and nothing guarantees they agree. This script
 * extracts the JSON-LD from each surface for a route set, compares block counts
 * and `@type` multisets, prints a table, and exits non-zero when they diverge.
 * A divergence means the gate and the deploy are looking at different markup —
 * the exact failure the artifact-fidelity preflight exists to catch.
 *
 * ADAPTER PINNING (§A4.2)
 * -----------------------
 * The output layout of `@cloudflare/next-on-pages` is internal API. This script
 * records the resolved version from `package-lock.json` in its result and, when
 * asked to compare against a stored result (`--baseline-result`), refuses to
 * compare across a version change — a version bump invalidates the recorded
 * parity result and forces a re-run. `--expect-adapter VER` is the state-free
 * form of the same rule for CI: the pinned version must match the resolved one
 * or the check exits 2, so a lockfile bump cannot silently pass.
 *
 * ROUTE-KEY DERIVATION (§A4.3, mirrored from sd-check.py)
 * ------------------------------------------------------
 *   1. strip a leading `static/`
 *   2. strip a leading `functions/` and a trailing `.func`
 *   3. `X.prerender-fallback.html` -> `/X`
 *   4. `index.html`                -> the directory, i.e. `/X/index.html` -> `/X`
 *   5. drop a trailing `.html`
 *   6. URL-decode, collapse `//`, drop a trailing `/`, lowercase
 *   Excluded from the coverage set: `*.rsc*` (they duplicate the same JSON-LD
 *   escaped), `_not-found*`, `404.html`.
 *
 * WITHIN-SURFACE DUPLICATE KEYS
 * -----------------------------
 * Measured on this repo (#6f9a20b, next-on-pages output of 2026-09-12):
 * `.vercel/output/static` holds 69 `/medium/*` routes TWICE — as
 * `medium/<slug>.html` (the real page, 2 JSON-LD blocks) and as
 * `medium/<slug>/index.html` (a 0-block twin). Both derive the same route key.
 * sd-check does not dedupe within a surface, so it validates and counts both.
 * This script must dedupe to compare anything, so the tie-break is explicit and
 * deterministic: the SHORTEST relative path wins (`X.html` beats `X/index.html`),
 * ties broken lexicographically. Every collision is reported in the table so the
 * ambiguity is visible rather than silently resolved.
 *
 * EXIT CODES (same contract as sd-check, §A5.3)
 * --------------------------------------------
 *   0  no divergence
 *   1  at least one divergence (unless --report-only)
 *   2  internal failure (bad args, unreadable surface, missing package-lock)
 *
 * USAGE
 *   node scripts/check-sd-surface-parity.mjs \
 *     --surface static=.vercel/output/static \
 *     --surface fallback='.vercel/output/functions/**\/*prerender-fallback.html' \
 *     --sample 0 --expect-adapter 1.13.16 --report-only --json /tmp/sd-parity.json
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const TOOL = "check-sd-surface-parity";
const RESULT_SCHEMA_VERSION = 1;
const ADAPTER_PACKAGE = "@cloudflare/next-on-pages";
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

class InternalError extends Error {}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  return `usage: node check-sd-surface-parity.mjs [options]

  --surface LABEL=PATH   a surface to compare (repeatable, >= 2 required).
                         PATH may be a directory or a glob.
  --sample N             routes to sample; 0 = every route (default 0 = all)
  --root DIR             repo package dir the route keys are relative to
                         (default: the parent of this script's dir)
  --json PATH            write the parity report JSON ('-' = stdout)
  --write-result PATH    write this run's result (records the adapter version)
  --baseline-result PATH compare against a stored result; a different adapter
                         version invalidates it and forces a re-run
  --expect-adapter VER   fail (exit 2) unless the resolved
                         @cloudflare/next-on-pages version equals VER. The
                         adapter's output layout is internal API, so a version
                         bump invalidates the comparison and forces a re-run.
  --report-only          never exit 1 on divergence (internal failures still 2)
  --strict               exit 1 when the sampled set is empty
  --quiet                do not print the table
  -h, --help             show this help

Surfaces that do not exist are an internal error (exit 2): a typo'd path must
not read as "no divergence". A surface whose files are ALL excluded routes
(404.html / _not-found* / *.rsc / cdn-cgi/* / .tmp-*) is also an internal error:
a parity check that compares nothing must never be green.`;
}

function parseArgs(argv) {
  const opts = {
    surfaces: [],
    // Default = the FULL route set. A sample that is not shown to be
    // representative is a silent coverage hole: the previous default of 3
    // compared 3 of 60 routes and a real 1-in-60 divergence read as exit 0
    // (found in adversarial review 2026-09-12). The full set is a few hundred
    // small HTML files per surface — reading and comparing all of them is
    // sub-second, so there is no runtime reason to sample. `--sample N` remains
    // available for a deliberately cheap interactive run.
    sample: 0,
    root: DEFAULT_ROOT,
    json: null,
    writeResult: null,
    baselineResult: null,
    expectAdapter: null,
    reportOnly: false,
    strict: false,
    quiet: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new InternalError(`${arg} needs a value`);
      return argv[i];
    };
    switch (arg) {
      case "-h":
      case "--help":
        process.stdout.write(`${usage()}\n`);
        process.exit(0);
        break;
      case "--surface": {
        const raw = next();
        const eq = raw.indexOf("=");
        const label = eq === -1 ? path.basename(raw.replace(/\/+$/, "")) : raw.slice(0, eq);
        const target = eq === -1 ? raw : raw.slice(eq + 1);
        if (!label || !target) throw new InternalError(`bad --surface ${JSON.stringify(raw)}`);
        opts.surfaces.push({ label, target });
        break;
      }
      case "--sample":
        opts.sample = Number(next());
        if (!Number.isInteger(opts.sample) || opts.sample < 0) {
          throw new InternalError("--sample must be a non-negative integer");
        }
        break;
      case "--root":
        opts.root = path.resolve(next());
        break;
      case "--json":
        opts.json = next();
        break;
      case "--write-result":
        opts.writeResult = next();
        break;
      case "--baseline-result":
        opts.baselineResult = next();
        break;
      case "--expect-adapter":
        opts.expectAdapter = next();
        break;
      case "--report-only":
        opts.reportOnly = true;
        break;
      case "--strict":
        opts.strict = true;
        break;
      case "--quiet":
        opts.quiet = true;
        break;
      default:
        throw new InternalError(`unknown argument ${JSON.stringify(arg)}`);
    }
  }

  if (opts.surfaces.length < 2) {
    throw new InternalError("--surface-parity needs at least two --surface entries");
  }
  return opts;
}

// ---------------------------------------------------------------------------
// adapter version (§A4.2)
// ---------------------------------------------------------------------------

function resolveAdapterVersion(root) {
  const lockPath = path.join(root, "package-lock.json");
  if (!fs.existsSync(lockPath)) {
    throw new InternalError(`package-lock.json not found at ${lockPath}`);
  }
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch (error) {
    throw new InternalError(`package-lock.json is not valid JSON: ${error.message}`);
  }
  const packages = lock.packages ?? {};
  const direct = packages[`node_modules/${ADAPTER_PACKAGE}`];
  if (direct?.version) return direct.version;

  // Fallbacks for older lockfile shapes.
  const legacyKey = Object.keys(packages).find((key) => key.endsWith(`/${ADAPTER_PACKAGE}`));
  if (legacyKey && packages[legacyKey].version) return packages[legacyKey].version;
  const deps = lock.dependencies?.[ADAPTER_PACKAGE];
  if (deps?.version) return deps.version;

  throw new InternalError(
    `${ADAPTER_PACKAGE} not found in ${lockPath} — cannot pin the adapter version`,
  );
}

// ---------------------------------------------------------------------------
// surface expansion (directory or glob, no dependencies)
// ---------------------------------------------------------------------------

function globToRegExp(pattern) {
  const normalized = pattern.split(path.sep).join("/");
  let out = "^";
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (ch === "*") {
      if (normalized[i + 1] === "*") {
        i += 1;
        if (normalized[i + 1] === "/") i += 1;
        out += "(?:.*/)?";
      } else {
        out += "[^/]*";
      }
      continue;
    }
    if (ch === "?") {
      out += "[^/]";
      continue;
    }
    out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${out}$`);
}

function listHtmlFiles(dir) {
  const found = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) found.push(full);
    }
  }
  return found.sort();
}

/**
 * Resolve a surface spec into { root, files }:
 *   root  — the directory route keys are derived relative to (the surface root)
 *   files — sorted absolute HTML paths under that root
 *
 * Route keys are relative to the SURFACE root, not the repo root: that is what
 * makes two surfaces comparable at all. A bare directory spec uses itself as the
 * root; a glob spec uses the directory containing its literal head, so
 * `.vercel/output/functions/**\/*prerender-fallback.html` keys as `/about`, not
 * as `/.vercel/output/functions/about`.
 */
function expandSurface(spec, root) {
  const resolved = path.isAbsolute(spec.target) ? spec.target : path.resolve(root, spec.target);

  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    const files = listHtmlFiles(resolved);
    if (files.length === 0) {
      throw new InternalError(
        `surface ${JSON.stringify(spec.label)} matched nothing: no HTML files under ${resolved}`,
      );
    }
    return { root: resolved, files };
  }

  if (!/[*?]/.test(spec.target)) {
    if (fs.existsSync(resolved)) return { root: path.dirname(resolved), files: [resolved] };
    throw new InternalError(
      `surface ${JSON.stringify(spec.label)} matched nothing: ${resolved} does not exist`,
    );
  }

  // Glob: anchor at the longest literal prefix, then filter with the pattern.
  // The literal head MUST resolve to a real directory. Falling back to the
  // parent directory (the previous behaviour) made a typo'd glob silently
  // rescan an unintended tree and fabricate route keys like `/../func/r00`
  // (found in adversarial review 2026-09-12): a typo must be an error, not a
  // different scan.
  const firstMagic = spec.target.search(/[*?]/);
  const literalHead = spec.target.slice(0, firstMagic);
  const headNoSlash = literalHead.replace(/\/+$/, "");
  const surfaceRoot = path.resolve(root, headNoSlash.length > 0 ? headNoSlash : ".");
  if (!fs.existsSync(surfaceRoot) || !fs.statSync(surfaceRoot).isDirectory()) {
    throw new InternalError(
      `surface ${JSON.stringify(spec.label)} matched nothing: the glob's literal head ` +
        `${JSON.stringify(headNoSlash || ".")} does not resolve to a directory under ` +
        `${root} (refusing to rescan a parent directory)`,
    );
  }
  const startDir = surfaceRoot;

  const pattern = path
    .relative(surfaceRoot, path.resolve(root, spec.target))
    .split(path.sep)
    .join("/");
  const regex = globToRegExp(pattern);

  const candidates = listHtmlFiles(startDir);
  const matched = candidates.filter((file) => {
    const rel = path.relative(surfaceRoot, file).split(path.sep).join("/");
    return regex.test(rel);
  });

  if (matched.length === 0) {
    throw new InternalError(
      `surface ${JSON.stringify(spec.label)} matched nothing: no HTML under ${startDir} ` +
        `matching ${JSON.stringify(pattern)}`,
    );
  }
  return { root: surfaceRoot, files: matched.sort() };
}

// ---------------------------------------------------------------------------
// route keys (§A4.3)
// ---------------------------------------------------------------------------

export function deriveRouteKey(relativePath) {
  let p = relativePath.split(path.sep).join("/").replace(/^\.\//, "");
  try {
    p = decodeURIComponent(p);
  } catch {
    // leave it as-is if it is not valid percent-encoding
  }
  if (p.startsWith("static/")) p = p.slice("static/".length);
  if (p.startsWith("functions/")) {
    p = p.slice("functions/".length);
    if (p.endsWith(".func")) p = p.slice(0, -".func".length);
  }

  const name = p.slice(p.lastIndexOf("/") + 1);
  if (name.endsWith(".prerender-fallback.html")) {
    p = p.slice(0, -".prerender-fallback.html".length);
  } else if (name === "index.html") {
    p = p.slice(0, -"index.html".length).replace(/\/+$/, "");
  } else if (p.endsWith(".html")) {
    p = p.slice(0, -".html".length);
  }

  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (p === "") p = "/";
  return p.toLowerCase();
}

export function isExcludedRoute(relativePath) {
  const normalized = relativePath.split(path.sep).join("/").toLowerCase();
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (normalized.includes(".rsc")) return true;
  if (base.startsWith("_not-found")) return true;
  if (base === "404.html" || base === "404") return true;
  // System/error routes. `404` is named in §A4.3; `500` and `cdn-cgi/*` are the
  // same class of non-page artifact — the edge error handler and Cloudflare's
  // internal namespace. They carry no JSON-LD, they are not in the sitemap, and
  // they are the only two routes the two surfaces disagree about (static has
  // them, functions does not), so leaving them in would make parity permanently
  // red for reasons that have nothing to do with structured data.
  if (base === "500.html" || base === "500") return true;
  if (normalized === "cdn-cgi" || normalized.startsWith("cdn-cgi/")) return true;
  // Adapter residue: Next writes transient prerender temps as
  // `.tmp-<slug>-<epoch>*.html` / `.tmp-*.prerender-fallback.html` and never
  // serves them. They are not routes, so they are not part of the coverage set
  // (same class as `.rsc`, different mechanism). Observed 2026-09-12.
  if (base.startsWith(".tmp-")) return true;
  return false;
}

// ---------------------------------------------------------------------------
// JSON-LD extraction
// ---------------------------------------------------------------------------

const SCRIPT_RE =
  /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function* walkNodes(value) {
  if (Array.isArray(value)) {
    for (const item of value) yield* walkNodes(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  if ("@type" in value) yield value;
  for (const [key, child] of Object.entries(value)) {
    if (key === "@context") continue;
    yield* walkNodes(child);
  }
}

function typesOf(node) {
  const t = node["@type"];
  return Array.isArray(t) ? t : [t];
}

/** Extract per-page JSON-LD shape: block count, @type multiset, parse errors. */
export function extractJsonLd(html) {
  const blocks = [...html.matchAll(SCRIPT_RE)].map((match) => match[1]);
  const types = [];
  let parseErrors = 0;
  let unparseable = 0;

  for (const raw of blocks) {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      parseErrors += 1;
      unparseable += 1;
      continue;
    }
    for (const node of walkNodes(payload)) {
      for (const t of typesOf(node)) {
        if (typeof t === "string" && t.length > 0) types.push(t);
      }
    }
  }

  types.sort();
  return {
    blocks: blocks.length,
    types,
    parseErrors,
    unparseable,
  };
}

function shapeOf(html) {
  const { blocks, types, parseErrors } = extractJsonLd(html);
  return { blocks, types, parseErrors, typeMs: types.join(",") };
}

// ---------------------------------------------------------------------------
// per-surface tables
// ---------------------------------------------------------------------------

function buildSurfaceTable(spec, root) {
  const { root: surfaceRoot, files } = expandSurface(spec, root);
  const entries = new Map(); // routeKey -> { rel, shape }
  const collisions = [];

  for (const file of files) {
    const rel = path.relative(surfaceRoot, file).split(path.sep).join("/");
    // Defensive: a route key must never escape the surface root. The glob
    // literal-head guard above should make this unreachable, but a fabricated
    // `/../…` key (previously produced) must be a hard error, not a table row.
    if (rel.startsWith("..")) {
      throw new InternalError(
        `surface ${JSON.stringify(spec.label)}: expanded file ${file} escapes the ` +
          `surface root ${surfaceRoot}; refusing to derive a route key`,
      );
    }
    if (isExcludedRoute(rel)) continue;

    const key = deriveRouteKey(rel);
    let html;
    try {
      html = fs.readFileSync(file, "utf8");
    } catch (error) {
      throw new InternalError(`cannot read ${file}: ${error.message}`);
    }
    const shape = shapeOf(html);

    const existing = entries.get(key);
    if (!existing) {
      entries.set(key, { rel, shape });
      continue;
    }
    // Deterministic tie-break: shortest relative path wins, then lexicographic.
    const winner =
      rel.length < existing.rel.length || (rel.length === existing.rel.length && rel < existing.rel)
        ? { rel, shape }
        : existing;
    const loser = winner.rel === rel ? existing : { rel, shape };
    collisions.push({
      route: key,
      winner: winner.rel,
      loser: loser.rel,
      winnerBlocks: winner.shape.blocks,
      loserBlocks: loser.shape.blocks,
    });
    entries.set(key, winner);
  }

  // A surface that yields zero comparable routes must never be green: the
  // previous code checked only that HTML FILES existed, so a surface whose
  // files are all excluded routes reported `sampled 0 of 0` and exit 0
  // (found in adversarial review 2026-09-12). The sole defence was `--strict`,
  // which no caller passed.
  if (entries.size === 0) {
    throw new InternalError(
      `surface ${JSON.stringify(spec.label)} matched ${files.length} HTML file(s) ` +
        `but yielded 0 comparable routes (every file is an excluded route: ` +
        `404.html / _not-found* / *.rsc / cdn-cgi/* / .tmp-*). ` +
        `A parity check that compares nothing must never pass — fix the surface ` +
        `path or the exclusion set.`,
    );
  }

  return { label: spec.label, target: spec.target, files: files.length, entries, collisions };
}

// ---------------------------------------------------------------------------
// sampling
// ---------------------------------------------------------------------------

/** Deterministic sample that spans distinct first-segment families. */
function sampleRoutes(routeKeys, sample) {
  const sorted = [...routeKeys].sort();
  if (sample === 0 || sample >= sorted.length) return sorted;

  const familyOf = (route) => {
    const segment = route.split("/").filter(Boolean)[0];
    return segment ?? "(root)";
  };

  const byFamily = new Map();
  for (const route of sorted) {
    const family = familyOf(route);
    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family).push(route);
  }

  const picked = [];
  const families = [...byFamily.keys()].sort();
  // First pass: one route per family, in family order (spans templates).
  for (const family of families) {
    if (picked.length >= sample) break;
    picked.push(byFamily.get(family)[0]);
  }
  // Second pass: keep filling from the front if there were fewer families than N.
  for (const route of sorted) {
    if (picked.length >= sample) break;
    if (!picked.includes(route)) picked.push(route);
  }
  return picked.sort();
}

// ---------------------------------------------------------------------------
// comparison
// ---------------------------------------------------------------------------

function compare(surfaces, routes) {
  const [reference, ...others] = surfaces;
  const divergences = [];
  const rows = [];

  for (const route of routes) {
    const refEntry = reference.entries.get(route);
    const refShape = refEntry?.shape ?? null;
    const row = {
      route,
      surfaces: { [reference.label]: refShape ? { blocks: refShape.blocks, types: refShape.types.length } : null },
      divergences: [],
    };

    for (const surface of others) {
      const entry = surface.entries.get(route);
      const shape = entry?.shape ?? null;
      row.surfaces[surface.label] = shape ? { blocks: shape.blocks, types: shape.types.length } : null;

      if (!refShape && !shape) continue;

      if (!refShape || !shape) {
        const missingFrom = refShape ? surface.label : reference.label;
        const presentIn = refShape ? reference.label : surface.label;
        const message = `route present in surface '${presentIn}' but absent from '${missingFrom}'`;
        divergences.push({ route, message });
        row.divergences.push(message);
        continue;
      }

      if (refShape.blocks !== shape.blocks || refShape.typeMs !== shape.typeMs) {
        const message =
          `surface '${surface.label}' and '${reference.label}' diverge ` +
          `(blocks ${shape.blocks} vs ${refShape.blocks}, ` +
          `types [${shape.types.join(", ")}] vs [${refShape.types.join(", ")}])`;
        divergences.push({ route, message });
        row.divergences.push(message);
      }
    }

    rows.push(row);
  }

  return { rows, divergences };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function writeJson(target, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (target === "-") {
    process.stdout.write(text);
    return;
  }
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  fs.writeFileSync(target, text);
}

function note(message) {
  process.stderr.write(`${TOOL}: ${message}\n`);
}

function main(argv) {
  const opts = parseArgs(argv);
  const adapterVersion = resolveAdapterVersion(opts.root);

  // §A4.2 made load-bearing. The adapter's output layout is internal API, so a
  // record of the resolved version is only protection if something refuses to
  // compare across a change. `--baseline-result`/`--write-result` did that but
  // no caller passed them, leaving the recorded version inert (found in
  // adversarial review 2026-09-12). `--expect-adapter` is the state-free form:
  // the wired invocation pins the version and a bump fails the check.
  if (opts.expectAdapter && adapterVersion !== opts.expectAdapter) {
    throw new InternalError(
      `adapter pin mismatch: the caller pinned ${ADAPTER_PACKAGE}@${opts.expectAdapter}, ` +
        `this run resolved ${ADAPTER_PACKAGE}@${adapterVersion}. The adapter's output ` +
        `layout is internal API, so a version bump invalidates a recorded parity ` +
        `result — re-run the build and update the pinned version before trusting a pass.`,
    );
  }

  const surfaces = opts.surfaces.map((spec) => buildSurfaceTable(spec, opts.root));

  const allRoutes = new Set();
  for (const surface of surfaces) {
    for (const key of surface.entries.keys()) allRoutes.add(key);
  }
  const routes = sampleRoutes([...allRoutes], opts.sample);

  const { rows, divergences } = compare(surfaces, routes);

  const sampled = routes.length;
  const routeCounts = surfaces.map((s) => `${s.label}=${s.entries.size}`).join(" ");
  note(
    `adapter ${ADAPTER_PACKAGE}@${adapterVersion} | routes ${routeCounts} | ` +
      `sampled ${sampled}${opts.sample === 0 ? " (full set)" : ` of ${allRoutes.size}`}`,
  );

  // Make partial coverage loud: a divergence on an unsampled route is simply
  // not compared, and under --report-only it would not even be reported.
  if (opts.sample > 0 && sampled < allRoutes.size) {
    note(
      `coverage: sampled ${sampled} of ${allRoutes.size} route(s) (--sample ${opts.sample}); ` +
        `a divergence on an unsampled route is NOT compared. Omit --sample for the full set.`,
    );
  }

  if (!opts.quiet) {
    const headers = ["route", ...surfaces.map((s) => `${s.label} blk/types`)];
    const tableRows = rows.map((row) => [
      row.route,
      ...surfaces.map((s) => {
        const cell = row.surfaces[s.label];
        return cell === null ? "ABSENT" : `${cell.blocks}/${cell.types}`;
      }),
      row.divergences.length > 0 ? `DIVERGE x${row.divergences.length}` : "ok",
    ]);
    const widths = headers.map((h, i) =>
      Math.max(h.length, ...tableRows.map((r) => String(r[i] ?? "").length)),
    );
    const line = (cells) =>
      cells.map((c, i) => String(c ?? "").padEnd(widths[i])).join("  ").trimEnd();
    process.stdout.write(`${line(headers)}\n`);
    process.stdout.write(`${line(widths.map((w) => "-".repeat(w)))}\n`);
    for (const row of tableRows) process.stdout.write(`${line(row)}\n`);

    const collisions = surfaces.flatMap((s) => s.collisions);
    if (collisions.length > 0) {
      process.stdout.write(
        `\nadapter output carries ${collisions.length} duplicate route key(s); ` +
          `shortest path wins:\n`,
      );
      for (const collision of collisions.slice(0, 10)) {
        process.stdout.write(
          `  ${collision.route}: kept ${collision.winner} (${collision.winnerBlocks} blocks), ` +
            `ignored ${collision.loser} (${collision.loserBlocks} blocks)\n`,
        );
      }
      if (collisions.length > 10) {
        process.stdout.write(`  ... and ${collisions.length - 10} more\n`);
      }
    }
    if (divergences.length > 0) {
      process.stdout.write(`\n${divergences.length} divergence(s):\n`);
      for (const d of divergences.slice(0, 25)) process.stdout.write(`  ${d.route}: ${d.message}\n`);
      if (divergences.length > 25) {
        process.stdout.write(`  ... and ${divergences.length - 25} more\n`);
      }
    }
  }

  const result = {
    result_schema_version: RESULT_SCHEMA_VERSION,
    tool: TOOL,
    generated_at: new Date().toISOString(),
    adapter_package: ADAPTER_PACKAGE,
    adapter_version: adapterVersion,
    root: opts.root,
    surfaces: surfaces.map((s) => ({
      label: s.label,
      target: s.target,
      html_files: s.files,
      routes: s.entries.size,
      duplicate_route_keys: s.collisions.length,
    })),
    sample_requested: opts.sample,
    sampled_routes: sampled,
    total_routes: allRoutes.size,
    verdict: divergences.length === 0 ? "parity" : "divergence",
    divergence_count: divergences.length,
    divergences,
    rows,
  };

  // §A4.2: a different adapter version invalidates a stored result.
  if (opts.baselineResult) {
    const baselinePath = path.resolve(opts.baselineResult);
    if (!fs.existsSync(baselinePath)) {
      throw new InternalError(`--baseline-result does not exist: ${baselinePath}`);
    }
    let baseline;
    try {
      baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    } catch (error) {
      throw new InternalError(`--baseline-result is not valid JSON: ${error.message}`);
    }
    if (baseline.adapter_version !== adapterVersion) {
      note(
        `INVALIDATED: the recorded parity result was produced with ` +
          `${ADAPTER_PACKAGE}@${baseline.adapter_version}, this run resolved ` +
          `${ADAPTER_PACKAGE}@${adapterVersion}. ` +
          `The adapter's output layout is internal API, so the stored result does not ` +
          `apply — re-run and store a new result.`,
      );
      return { code: 2, result };
    }
    if (baseline.result_schema_version !== RESULT_SCHEMA_VERSION) {
      note(
        `INVALIDATED: stored result uses result_schema_version ` +
          `${baseline.result_schema_version}, this tool emits ${RESULT_SCHEMA_VERSION}.`,
      );
      return { code: 2, result };
    }
  }

  if (opts.writeResult) writeJson(opts.writeResult, result);
  if (opts.json) writeJson(opts.json, result);

  if (divergences.length > 0) {
    if (opts.reportOnly) {
      note(
        `report-only -> ${divergences.length} divergence(s) reported, exit 0 ` +
          `(findings never fail under --report-only)`,
      );
      return { code: 0, result };
    }
    note(`${divergences.length} divergence(s): the surfaces do not agree.`);
    return { code: 1, result };
  }

  // A zero-route comparison can never be green, with or without --strict. The
  // zero-route surfaces already throw above; this is the belt-and-braces guard
  // so no future path can reach a green exit having compared nothing. (--strict
  // is kept as a no-op-compatible flag for existing callers.)
  if (sampled === 0) {
    note(
      "no routes were sampled: nothing was actually compared. " +
        "A check that compares nothing must not pass.",
    );
    return { code: 1, result };
  }

  note(`parity: ${sampled} route(s) compared across ${surfaces.length} surface(s), no divergence.`);
  return { code: 0, result };
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    const { code } = main(process.argv.slice(2));
    process.exit(code);
  } catch (error) {
    if (error instanceof InternalError) {
      note(`internal error: ${error.message}`);
      note("the parity check broke, not the site (exit 2)");
      process.exit(2);
    }
    note(`unexpected error: ${error?.stack ?? error}`);
    process.exit(2);
  }
}
