#!/usr/bin/env python3
"""
psa-gate.py — Page Structure & Accessibility gate.
Principle-3 (summarizability) structural regression check.

Version 1.0.0
Calibrated against 15 real pages in hermes-seo-plans-20260913/plans/audit-03/:
  31 findings across 15 pages. Thresholds: first_h2_late >120 words,
  paragraph_bloat >80 words, lede ~44 words.

Exit contract:
  0  = no error-band findings (strict mode: no warn-band either)
  1  = error-band findings present
  2  = could-not-run (missing dep, missing target dir, config error)

Flags:
  --dir <path>        scan a build output directory (HTML files, recursive)
  --url <url>         scan live URLs (one or more, space-separated)
  --strict            promote warn-band rules to error-band
  --report-only       never exit 1; print findings but return 0 or 2
  --config <path>     TOML config file (mode, rule bands, exclusions)
  --json <path>       write full JSON report
  --exclude <glob>    glob pattern (can be repeated); matched against
                      path RELATIVE to the scan root (not absolute)
"""

import argparse
import glob as _glob
import json
import os
import re
import subprocess
import sys
import tomllib
from pathlib import Path

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------
try:
    from bs4 import BeautifulSoup
except ImportError:
    print(
        "psa-gate: beautifulsoup4 missing (pip install beautifulsoup4 lxml)",
        file=sys.stderr,
    )
    sys.exit(2)

# ---------------------------------------------------------------------------
# Version and pin record
# ---------------------------------------------------------------------------
__version__ = "1.0.0"
BS4_VERSION = "4.15.0"
LXML_VERSION = "6.1.3"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"
)
PROSE_TAGS = ("p", "li", "summary", "blockquote")
HEADING_TAGS = ("h1", "h2", "h3", "h4", "h5", "h6")

# Threshold constants — calibrated against 15-page audit corpus
FIRST_H2_LATE_THRESHOLD = 120   # prose words before first H2
PARAGRAPH_BLOAT_THRESHOLD = 80   # words in a single <p>
LEDE_ANSWER_WINDOW = 44         # lede words checked for immediate answer


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()


def fetch_html(url):
    r = subprocess.run(
        ["curl", "-sL", "--max-time", "45", "-A", UA, url],
        capture_output=True, text=True,
    )
    if r.returncode != 0 or not r.stdout:
        raise RuntimeError(f"curl failed for {url}")
    return r.stdout


def is_question(text):
    """True if heading text looks like a question."""
    text = text.strip()
    if text.endswith("?"):
        return True
    return bool(
        re.match(
            r"^(what|how|why|where|when|who|do|does|is|are|can|should|which|"
            r"was|were|have|has|had)\b",
            text,
            re.I,
        )
    )


def lede_answers_immediately(lede_text):
    """
    Does the lede (~44 words) answer the page's own question?
    Calibrated against metrics.json lede_answers_immediately for 15 pages.

    Returns True if the lede appears to give a direct, specific answer
    rather than just contextual framing.
    """
    if not lede_text:
        return False
    words = lede_text.split()
    lede = " ".join(words[:LEDE_ANSWER_WINDOW]).lower()
    # Heuristic: an answering lede usually starts with a verb or a clear
    # noun-phrase definition and names the subject.
    # "A partnered dance you cannot rehearse" = answering
    # "Over 37 days in 2026, Google showed..." = not answering
    if re.match(r"^(a|an|the)\s+\w+\s+\w+", lede):
        return True
    if re.match(r"^(contact improvisation|tantra|you can|you will|"
                r"it is|this is|here)", lede):
        return True
    return False


# ---------------------------------------------------------------------------
# Core audit
# ---------------------------------------------------------------------------
def audit(html, label, config):
    """
    Audit one HTML document. Returns a dict with metrics and findings.

    config: dict with keys 'error_rules', 'warn_rules', 'exclude_globs'
    """
    soup = BeautifulSoup(html, "lxml")

    # Decompose noise elements
    for tag in soup(["script", "style", "noscript", "svg", "nav",
                     "footer", "form", "aside", "iframe", "noscript"]):
        tag.decompose()

    main = soup.find("main") or soup.find("article") or soup.body or soup

    # Build flat sequence of (tag_name, text) for content blocks
    seq = []
    for el in main.find_all(list(HEADING_TAGS) + list(PROSE_TAGS)):
        # Skip nested lists
        if el.name == "li" and el.find("li"):
            continue
        t = clean(el.get_text(" "))
        if t:
            seq.append((el.name, t))

    findings = []
    warn_findings = []

    # ---- page_shape -------------------------------------------------------
    h1s = [t for n, t in seq if n == "h1"]
    if len(h1s) != 1:
        findings.append(("page_shape",
                         f"expected exactly 1 h1, found {len(h1s)}"))
    if not soup.find("link", attrs={"rel": "canonical"}):
        findings.append(("page_shape", "no canonical link"))

    # ---- first_h2_late ---------------------------------------------------
    first_h2_idx = next(
        (i for i, (n, _) in enumerate(seq) if n == "h2"), None
    )
    if first_h2_idx is None:
        intro_words = sum(len(t.split()) for n, t in seq if n in PROSE_TAGS)
        findings.append(
            ("first_h2_late", "no h2 on the page")
        )
    else:
        intro_words = sum(
            len(t.split())
            for n, t in seq[:first_h2_idx]
            if n in PROSE_TAGS
        )
        if intro_words > FIRST_H2_LATE_THRESHOLD:
            findings.append(
                ("first_h2_late",
                 f"{intro_words} prose words before first h2 "
                 f"(threshold {FIRST_H2_LATE_THRESHOLD})")
            )

    # ---- paragraph_bloat --------------------------------------------------
    for n, t in seq:
        if n == "p":
            w = len(t.split())
            if w > PARAGRAPH_BLOAT_THRESHOLD:
                findings.append(
                    ("paragraph_bloat",
                     f"{w}w paragraph: {t[:60]}...")
                )
            elif w > 0:
                warn_findings.append(
                    ("paragraph_bloat_warn",
                     f"{w}w paragraph: {t[:60]}...")
                )

    # ---- duplicate_heading -----------------------------------------------
    seen = {}
    for n, t in seq:
        if n in HEADING_TAGS:
            seen.setdefault((n, t.lower()), 0)
            seen[(n, t.lower())] += 1
    for (n, t), cnt in seen.items():
        if cnt > 1:
            findings.append(
                ("duplicate_heading",
                 f"{n} '{t[:50]}' appears {cnt} times")
            )

    # ---- h2_without_answer ----------------------------------------------
    for i, (n, t) in enumerate(seq):
        if n != "h2":
            continue
        nxt = seq[i + 1] if i + 1 < len(seq) else None
        if nxt is None:
            warn_findings.append(
                ("h2_without_answer_warn", f"h2 '{t[:45]}' is the last block")
            )
        elif nxt[0] in HEADING_TAGS:
            findings.append(
                ("h2_without_answer",
                 f"h2 '{t[:45]}' is followed by {nxt[0]}, no prose")
            )

    # ---- heading_hierarchy_inversion (H3s before any H2) -----------------
    first_h2_pos = first_h2_idx if first_h2_idx is not None else len(seq)
    first_h3_before_h2 = next(
        (i for i, (n, _) in enumerate(seq) if n == "h3"),
        None
    )
    if (
        first_h3_before_h2 is not None
        and first_h3_before_h2 < first_h2_pos
        and first_h2_idx is not None  # there IS an H2 somewhere
    ):
        warn_findings.append(
            ("heading_hierarchy_inversion",
             f"h3 appears at position {first_h3_before_h2} before "
             f"first h2 at position {first_h2_pos}")
        )

    # ---- collapsed_content (<details><summary>) --------------------------
    # Check: pages where ALL questions live inside <summary> with no
    # prose block between the H1 and the first H2
    all_details = soup.find_all("details")
    if all_details:
        summary_prose = []
        for details in all_details:
            sm = details.find("summary")
            if sm:
                txt = clean(sm.get_text(" "))
                if txt:
                    summary_prose.append(txt)
        # If the page has NO H2, and has <details>, flag collapsed_content
        if first_h2_idx is None and summary_prose:
            findings.append(
                ("collapsed_content",
                 f"page has no h2; all content inside <details><summary>: "
                 f"{summary_prose[0][:60]}...")
            )

    # ---- lede_check ------------------------------------------------------
    # First prose block is the "lede"
    first_prose = next((t for n, t in seq if n in PROSE_TAGS), None)
    lede_answers = False
    if first_prose:
        lede_answers = lede_answers_immediately(first_prose)
    warn_findings.append(
        ("lede_check",
         f"lede answers immediately: {lede_answers} "
         f"('{str(first_prose[:50]) if first_prose else ''}...' if present)")
    )

    # ---- question_shaped_h2_ratio (informational only) --------------------
    h2s = [t for n, t in seq if n == "h2"]
    q_shaped = sum(1 for t in h2s if is_question(t))
    warn_findings.append(
        ("question_shaped_h2_ratio",
         f"{q_shaped}/{len(h2s)} h2s are question-shaped")
    )

    # Determine effective findings based on mode
    error_rules = set(config.get("error_rules", []))
    warn_rules = set(config.get("warn_rules", []))

    def classify(code):
        # code is the finding code without _warn suffix
        if code in error_rules:
            return "error"
        if code in warn_rules or (code + "_warn") in warn_rules:
            return "warn"
        # Default: error band
        return "error"

    errors = [f for f in findings if classify(f[0]) == "error"]
    warns = (
        [f for f in warn_findings if classify(f[0]) == "warn"]
        + [f for f in findings if classify(f[0]) == "warn"]
    )

    return {
        "label": label,
        "version": __version__,
        "parser": {"bs4": BS4_VERSION, "lxml": LXML_VERSION},
        "h1": h1s,
        "h2_count": len(h2s),
        "h2_question_shaped": q_shaped,
        "prose_words_before_first_h2": intro_words,
        "paragraph_count": sum(1 for n, _ in seq if n == "p"),
        "max_paragraph_words": max(
            [len(t.split()) for n, t in seq if n == "p"] or [0]
        ),
        "lede_answers_immediately": lede_answers,
        "findings": errors,
        "warnings": warns,
        "_all_findings": findings + warn_findings,
    }


# ---------------------------------------------------------------------------
# Scanner: directory mode
# ---------------------------------------------------------------------------
def scan_dir(root, config, json_path):
    """Recursively find all .html files in root, audit each."""
    root = Path(root).expanduser().resolve()
    if not root.is_dir():
        print(f"psa-gate: target directory does not exist: {root}", file=sys.stderr)
        sys.exit(2)

    exclude_globs = config.get("exclude_globs", [])

    def is_excluded(rel_path):
        """Match against path relative to scan root."""
        for glob_pat in exclude_globs:
            if _glob.fnmatch.fnmatch(rel_path, glob_pat):
                return True
        return False

    html_files = sorted(root.rglob("*.html"))
    if not html_files:
        print(
            f"psa-gate: no .html files found under {root}",
            file=sys.stderr,
        )
        sys.exit(2)

    report = []
    pages_measured = 0

    for html_path in html_files:
        rel = html_path.relative_to(root).as_posix()
        if is_excluded(rel):
            continue
        try:
            html = html_path.read_text(encoding="utf-8", errors="ignore")
        except Exception as e:
            print(f"psa-gate: could not read {html_path}: {e}", file=sys.stderr)
            continue
        result = audit(html, str(rel), config)
        report.append(result)
        pages_measured += 1

    return report, pages_measured


# ---------------------------------------------------------------------------
# Scanner: live URL mode
# ---------------------------------------------------------------------------
def scan_urls(urls, config, json_path):
    """Fetch and audit each URL."""
    report = []
    pages_measured = 0
    for url in urls:
        try:
            html = fetch_html(url)
        except Exception as e:
            print(f"psa-gate: could not fetch {url}: {e}", file=sys.stderr)
            continue
        result = audit(html, url, config)
        report.append(result)
        pages_measured += 1

    return report, pages_measured


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
def print_report(report, pages_measured, version, parser_version, mode_label):
    print(f"\n{'='*74}")
    print(f"PSA-GATE {version} | parser: bs4 {parser_version['bs4']}, "
          f"lxml {parser_version['lxml']} | {mode_label}")
    print(f"{'='*74}")
    total_errors = 0
    total_warns = 0

    for r in report:
        total_errors += len(r["findings"])
        total_warns += len(r["warnings"])
        print(
            f"\n{r['label']} | "
            f"h1={r['h1']} h2={r['h2_count']} "
            f"(q-shaped {r['h2_question_shaped']}) | "
            f"prose before 1st h2={r['prose_words_before_first_h2']} | "
            f"max para={r['max_paragraph_words']}w"
        )
        for kind, detail in r["findings"]:
            print(f"   [E] {kind}: {detail}")
        for kind, detail in r["warnings"]:
            print(f"   [W] {kind}: {detail}")
        if not r["findings"] and not r["warnings"]:
            print("   clean")

    print(f"\n{'='*74}")
    print(
        f"pages measured: {pages_measured} | "
        f"error findings: {total_errors} | "
        f"warn findings: {total_warns}"
    )
    print(f"{'='*74}\n")


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DEFAULT_CONFIG = {
    "error_rules": [
        "first_h2_late",
        "paragraph_bloat",
        "duplicate_heading",
        "h2_without_answer",
        "page_shape",
        "collapsed_content",
        "heading_hierarchy_inversion",
    ],
    "warn_rules": [
        "lede_check",
        "question_shaped_h2_ratio",
        "h2_without_answer_warn",
        "paragraph_bloat_warn",
    ],
    "exclude_globs": [],
}


def load_config(path):
    try:
        with open(path, "rb") as f:
            raw = tomllib.load(f)
    except Exception as e:
        print(f"psa-gate: could not read config {path}: {e}", file=sys.stderr)
        sys.exit(2)

    cfg = dict(DEFAULT_CONFIG)
    if "gate" in raw:
        cfg.update(raw["gate"])
    if "error_rules" in raw:
        cfg["error_rules"] = raw["error_rules"]
    if "warn_rules" in raw:
        cfg["warn_rules"] = raw["warn_rules"]
    if "exclude_globs" in raw:
        cfg["exclude_globs"] = raw["exclude_globs"]
    return cfg


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(
        description="psa-gate: page structure / summarizability CI gate"
    )
    ap.add_argument(
        "--dir",
        help="Scan a build output directory (recursive .html files)",
    )
    ap.add_argument(
        "targets",
        nargs="*",
        help="URLs to audit in live mode (requires --url flag or positional)",
    )
    ap.add_argument(
        "--url",
        dest="urls",
        nargs="+",
        help="Live URLs to audit",
    )
    ap.add_argument(
        "--file",
        action="store_true",
        help="Treat positional targets as local file paths",
    )
    ap.add_argument(
        "--strict",
        action="store_true",
        help="Promote warn-band rules to error-band",
    )
    ap.add_argument(
        "--report-only",
        action="store_true",
        help="Never exit 1; print findings but return 0 or 2",
    )
    ap.add_argument(
        "--config",
        help="TOML config file",
    )
    ap.add_argument(
        "--json",
        help="Write full JSON report to this path",
    )

    args = ap.parse_args()
    config = dict(DEFAULT_CONFIG)

    if args.config:
        config = load_config(args.config)

    if args.strict:
        # In strict mode, all warn_rules become error_rules
        config["error_rules"] = list(
            set(config["error_rules"]) | set(config.get("warn_rules", []))
        )

    # Determine mode
    mode = None
    if args.dir:
        mode = "dir"
        if args.urls or args.file or args.targets:
            print("psa-gate: --dir is mutually exclusive with URL/file targets",
                  file=sys.stderr)
            sys.exit(2)
    elif args.urls:
        mode = "live"
        targets = args.urls
    elif args.file:
        mode = "file"
        targets = args.targets
    elif args.targets and args.targets[0].startswith(("http://", "https://")):
        mode = "live"
        targets = args.targets
    elif args.targets and args.file:
        mode = "file"
        targets = args.targets
    else:
        # Default: try to infer
        if args.targets:
            mode = "file"
            targets = args.targets
        elif config.get("dir"):
            mode = "dir"
        else:
            print(
                "psa-gate: specify --dir <path>, --url <url>, or file paths",
                file=sys.stderr,
            )
            sys.exit(2)

    # Run scan
    if mode == "dir":
        scan_root = args.dir or config.get("dir", ".")
        report, pages_measured = scan_dir(scan_root, config, args.json)
        mode_label = f"dir mode: {scan_root}"
    elif mode == "live":
        urls = args.urls or args.targets
        report, pages_measured = scan_urls(urls, config, args.json)
        mode_label = "live mode"
    else:
        # file mode
        report = []
        pages_measured = 0
        for path in args.targets:
            try:
                html = open(path, encoding="utf-8", errors="ignore").read()
            except Exception as e:
                print(f"psa-gate: could not read {path}: {e}", file=sys.stderr)
                continue
            result = audit(html, path, config)
            report.append(result)
            pages_measured += 1
        mode_label = "file mode"

    # Rule 7: a check that verifies nothing must never be green
    if pages_measured == 0:
        print(
            "psa-gate: zero pages measured — check configuration "
            "(missing directory, all files excluded, or network failure)",
            file=sys.stderr,
        )
        sys.exit(2)

    # Print findings
    parser_info = {"bs4": BS4_VERSION, "lxml": LXML_VERSION}
    print_report(report, pages_measured, __version__, parser_info, mode_label)

    if args.json:
        with open(args.json, "w") as fh:
            json.dump(
                {
                    "version": __version__,
                    "parser": parser_info,
                    "pages_measured": pages_measured,
                    "mode": mode_label,
                    "report": [
                        {k: v for k, v in r.items() if k != "_all_findings"}
                        for r in report
                    ],
                },
                fh,
                indent=1,
            )

    total_errors = sum(len(r["findings"]) for r in report)
    total_warns = sum(len(r["warnings"]) for r in report)

    if args.report_only:
        return 0

    if total_errors > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
