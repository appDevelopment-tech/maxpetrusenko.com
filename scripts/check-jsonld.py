#!/usr/bin/env python3
"""check-jsonld.py — fail CI when any HTML in the tree has invalid JSON-LD.

Why: 2026-08-18 Google Search Console flagged tantrastudio.app with
"Unparsable structured data — Parsing error: Missing '}' or object member
name". Root cause: a trailing comma after the last property in a WebSite
JSON-LD block on 5 pages (approach/inquiry/modalities/research/trust). JSON
parsers reject trailing commas, Google's parser treats the whole block as
unparsable, and the rich-result feature silently dies.

This scanner is the regression net: every HTML file in the tree gets every
application/ld+json block parsed; ANY parse error fails the run (exit 1).

Usage:
  python3 check-jsonld.py [dirs...]     # default: current dir, recursive

Exit 0 = every ld+json block in every html file parses. Exit 1 = invalid.
"""
import glob
import json
import os
import re
import sys

LDJSON_RE = re.compile(
    r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>",
    re.DOTALL | re.IGNORECASE,
)


def check_file(path: str) -> list:
    """Return [(block_index, error)] for invalid JSON-LD blocks in one file."""
    try:
        html = open(path, encoding="utf-8", errors="replace").read()
    except OSError as e:
        return [(-1, f"read error: {e}")]
    errs = []
    for i, block in enumerate(LDJSON_RE.findall(html)):
        try:
            json.loads(block)
        except Exception as e:  # any parse failure = the bug class we guard
            errs.append((i, str(e)))
    return errs


def main(argv) -> int:
    roots = argv or ["."]
    files = []
    for root in roots:
        if os.path.isfile(root):
            # Accept explicit html FILE paths too (a mis-wired CI step that
            # passes a file path must still be checked, not silently skipped).
            if root.endswith(".html"):
                files.append(root)
        else:
            files += sorted(glob.glob(root.rstrip("/") + "/**/*.html", recursive=True))
    files = sorted(set(files))
    if not files:
        print(
            f"check-jsonld: FAIL — no html files found under {roots} "
            "(misconfigured path? fix the CI invocation)",
            file=sys.stderr,
        )
        return 1
    bad = []
    for f in files:
        for i, e in check_file(f):
            bad.append((f, i, e))
    if bad:
        for f, i, e in bad:
            print(f"INVALID JSON-LD: {f} block {i}: {e}", file=sys.stderr)
        print(
            f"check-jsonld: FAIL — {len(bad)} invalid block(s) across {len(files)} html files",
            file=sys.stderr,
        )
        return 1
    print(f"check-jsonld: OK — {len(files)} html files, every JSON-LD block parses")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
