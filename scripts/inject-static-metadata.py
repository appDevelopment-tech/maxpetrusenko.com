#!/usr/bin/env python3
"""One-off: give checked-in static pages a meta description and favicon links.

Descriptions are derived from each page's OWN text (never invented): the existing
og:description if present, else the first substantial paragraph. Pages with no
suitable prose are reported and skipped rather than given a fabricated blurb.
"""
import html
import pathlib
import re
import sys

PUB = pathlib.Path("nextjs/public")
ICON_BLOCK = (
    '<link rel="icon" href="/favicon.ico" sizes="any">'
    '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">'
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">'
)


def text_of(fragment: str) -> str:
    fragment = re.sub(r"<(script|style)\b.*?</\1>", " ", fragment, flags=re.S | re.I)
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    fragment = html.unescape(fragment)
    fragment = re.sub(r"\s+", " ", fragment).strip()
    return fragment


def derive(t: str) -> tuple[str, str]:
    m = re.search(r'<meta[^>]+property=["\']og:description["\'][^>]*content=["\']([^"\']+)', t, re.I) \
        or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']og:description["\']', t, re.I)
    if m:
        return text_of(m.group(1)), "og:description"
    body = re.search(r"<body\b.*?</body>", t, re.S | re.I)
    region = body.group(0) if body else t
    paras = [text_of(p) for p in re.findall(r"<p\b[^>]*>(.*?)</p>", region, re.S | re.I)]
    paras = [p for p in paras if len(p) >= 80 and "cookie" not in p.lower()[:40]]
    if not paras:
        return "", "no-prose"
    p = paras[0]
    return trim(p), "first-paragraph"


DANGLING = {
    "a", "an", "the", "and", "of", "or", "to", "in", "on", "with", "that", "its", "it",
    "is", "was", "were", "for", "from", "as", "at", "by", "before", "after", "when",
    "while", "but", "so", "then", "their", "his", "her", "this", "these", "those",
}


def trim(p: str, limit: int = 155) -> str:
    """Cut to <=limit chars, preferring a sentence end, else a clean word boundary."""
    if len(p) <= limit:
        return p
    window = p[:limit]
    ends = [m.end() for m in re.finditer(r"[.!?](?=\s|$)", window)]
    if ends and ends[-1] >= 90:
        return window[: ends[-1]].strip()
    cut = window[: window.rfind(" ")].rstrip(" ,;:—-([\"'")
    words = cut.split()
    while words and words[-1].lower() in DANGLING:
        words.pop()
    cut = " ".join(words).rstrip(" ,;:—-([\"'")
    return (cut + "…") if cut else window


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


def main() -> int:
    changed = desc_added = icon_added = 0
    skipped: list[str] = []
    for f in sorted(PUB.rglob("*.html")):
        t = orig = f.read_text(errors="replace")
        rel = f.relative_to(PUB)
        if not re.search(r'rel=["\'](?:shortcut )?icon["\']', t, re.I) and "</head>" in t:
            t = t.replace("</head>", ICON_BLOCK + "</head>", 1)
            icon_added += 1
        if not re.search(r'<meta[^>]+name=["\']description["\']', t, re.I):
            d, how = derive(t)
            if d:
                tag = f'<meta name="description" content="{esc(d)}">'
                t = re.sub(r"</title>", "</title>" + tag, t, count=1, flags=re.I) if re.search(r"</title>", t, re.I) \
                    else t.replace("</head>", tag + "</head>", 1)
                desc_added += 1
                print(f"  desc[{how:15s}] {rel}\n      -> {d}")
            else:
                skipped.append(str(rel))
        if t != orig:
            f.write_text(t)
            changed += 1
    print(f"\n  files changed: {changed} | descriptions added: {desc_added} | icon links added: {icon_added}")
    if skipped:
        print(f"  SKIPPED (no usable prose, needs a human-written description): {len(skipped)}")
        for s in skipped:
            print(f"    {s}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
