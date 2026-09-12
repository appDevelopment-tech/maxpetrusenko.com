#!/usr/bin/env python3
"""sd-check.py -- canonical structured-data CI validator.

Offline-first gate over local JSON-LD artifacts, driven by a TOML policy file
(``sd-policy.toml``) and an invocation config (``sd-gate.toml``).  Part A of
``docs/plans/structured-data-ci-gate-phase-0-2026-09-12.md`` is the spec.

Invariants implemented here
---------------------------
* Policy is data, not code (``sd-policy.toml``).
* Policy keys must be real schema.org types, or an explicit predicate
  (``types`` + ``all_props`` + ``any_props``).
* TOML via stdlib ``tomllib`` -> Python >= 3.11 asserted, exit 2 below that.
* Offline-first: the blocking path performs no network I/O.  Live-only rules
  (``image-reachability``, ``live-crawl``) cannot fire in ``dir`` mode; ``--gsc``
  is an inert stub.
* Bands are declared per mode and the exit-code contract is explicit:

      exit 0  no error-band findings
      exit 1  at least one error-band finding
      exit 2  internal failure (unreadable policy, missing vocab snapshot,
              bad args, Python < 3.11) -- "the gate broke", not "the site broke"
      ``--strict`` promotes warn-band findings to exit 1
      ``--report-only`` never exits 1 on findings (internal failures still 2)

No third-party imports.  No YAML.  No network on the blocking path.

Usage
-----
    python3 sd-check.py --config .github/scripts/sd-gate.toml
    python3 sd-check.py --dir site --policy scripts/sd-policy.toml --json report.json
    python3 sd-check.py --validate-policy
"""

from __future__ import annotations

import argparse
import glob as _glob
import hashlib
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from typing import Any, Iterable, Iterator, NoReturn
from urllib.parse import unquote, urlparse

# --------------------------------------------------------------------------
# Hard version gate.  Must run before `import tomllib`, which does not exist
# before 3.11.  Exit 2 per the exit-code contract.
# --------------------------------------------------------------------------
if sys.version_info < (3, 11):  # pragma: no cover - exercised via runpy
    sys.stderr.write(
        "sd-check: Python >= 3.11 required (found %d.%d.%d). "
        "stdlib tomllib is required to read the policy file; "
        "the validator refuses to run rather than guess. Exit 2.\n"
        % (sys.version_info[0], sys.version_info[1], sys.version_info[2])
    )
    raise SystemExit(2)

import tomllib  # noqa: E402

REPORT_SCHEMA_VERSION = 1
# 1.1.0: comment-stripping before extraction (E43), the rule-11 identity/
# reference host-binding split with a per-repo reference_allowlist (E44),
# and zero-filled identifiers in rule 14 (E52).  The finding shape is
# unchanged, so report_schema_version stays 1.
VALIDATOR_VERSION = "1.1.0"

# --------------------------------------------------------------------------
# Band / mode catalogue  (§A3)
# --------------------------------------------------------------------------
E, W, I, OBS = "E", "W", "I", "-"

# code -> (declared band, mode, human description)
RULE_SPECS: "dict[str, tuple[str, str, str]]" = {
    # --- plumbing ---------------------------------------------------------
    "block-parse":            (E, "dir+live", "Every JSON-LD block parses as JSON"),
    "payload-shape":          (E, "dir+live", "Payload is an object or an array of objects"),
    "html-noise":             (W, "dir+live", "No HTML noise inside payloads"),
    "context-missing":        (E, "dir+live", "The page graph carries @context at a root node"),
    "type-casing":            (W, "dir+live", "@type casing exact; unknown type warns only"),
    # --- graph integrity --------------------------------------------------
    "id-unique":              (E, "dir+live", "Every @id is unique per page"),
    "ref-unresolved":         (E, "dir+live", "Every reference resolves in-graph or to the canonical host"),
    "duplicate-type-conflict": (E, "dir+live", "Duplicate type with one identity and conflicting values"),
    "nested-subset":          (I, "dir+live", "Nested strict-subset node"),
    "repeat-identical":       (I, "dir+live", "Repeated identical node"),
    "multi-aggregaterating":  (E, "dir+live", "At most one AggregateRating per entity per page"),
    "multi-faqpage":          (W, "dir+live", "At most one FAQPage per page"),
    "url-absolute":           (E, "dir+live", "url/@id/item/image/logo/sameAs are absolute HTTPS URLs"),
    "url-host":               (E, "dir+live", "Absolute URLs use the property's canonical host"),
    "canonical-align":        (E, "dir+live", "Root WebPage.url/@id equals <link rel=canonical>"),
    "brand-zerotrace":        (E, "dir+live", "Declared brand/zero-trace invariant"),
    # --- type-specific required / recommended ------------------------------
    "missing-required":       (E, "dir+live", "Required property present (band I for the info types)"),
    "missing-recommended":    (W, "dir+live", "Recommended property present"),
    # --- content truth -----------------------------------------------------
    "placeholder-text":       (E, "dir+live", "No placeholder strings in any string value"),
    "visible-content":        (W, "dir+live", "Visible-content match (approximation)"),
    "rating-consistency":     (E, "dir+live", "Rating / review-count consistency"),
    "self-serving-review":    (W, "dir+live", "Self-serving review snippets"),
    "image-reachability":     (E, "live", "Images resolve 2xx, are robots-allowed, logo is not SVG"),
    "date-sanity":            (E, "dir+live", "Date sanity (ISO 8601, ordering, no placeholders)"),
    "policy-finding":         (W, "dir+live", "Policy-band finding from sd-policy.toml"),
    # --- regression control ------------------------------------------------
    "shape-digest":           (E, "dir", "Shape digest matches the baseline"),
    "content-snapshot":       (W, "dir", "Content snapshot matches the baseline"),
    "volatile-allowlist":     (OBS, "dir", "Volatile-field allowlist / array-order semantics"),
    "coverage":               (E, "dir", "Coverage assertion, both directions"),
    "surface-parity":         (E, "dir", "Block count and @type multiset parity across surfaces"),
    # --- post-deploy -------------------------------------------------------
    "live-crawl":             (E, "live", "Same contract against production"),
    "gsc-sample":             (OBS, "live", "GSC URL Inspection sampling (stub; inert without a credential)"),
}

# Types whose required-props findings are info-band, not error-band (§A3).
INFO_TYPES = {"FAQPage", "Question", "Answer", "Course", "CourseInstance"}

# --------------------------------------------------------------------------
# Required / recommended property table  (§A3, "table unchanged from v2")
# A required entry may declare an alternative with '|': both sides satisfy it.
# --------------------------------------------------------------------------
REQUIRED_PROPS: "dict[str, tuple[tuple[str, ...], tuple[str, ...]]]" = {
    "Article":             (("headline", "author", "datePublished"),
                            ("dateModified", "image", "publisher", "mainEntityOfPage")),
    "BlogPosting":         (("headline", "author", "datePublished"),
                            ("dateModified", "image", "publisher", "mainEntityOfPage")),
    "NewsArticle":         (("headline", "author", "datePublished"),
                            ("dateModified", "image", "publisher", "mainEntityOfPage")),
    "BreadcrumbList":      (("itemListElement",), ()),
    "ListItem":            (("position",), ("item", "name")),
    "Organization":        (("name", "url"), ("logo", "sameAs", "contactPoint")),
    "Person":              (("name",), ("url", "sameAs", "jobTitle")),
    "WebSite":             (("name", "url"), ("potentialAction", "publisher")),
    "WebPage":             (("name", "url"),
                            ("description", "isPartOf", "inLanguage", "datePublished", "dateModified")),
    "AboutPage":           (("name", "url"), ("description", "isPartOf", "inLanguage")),
    "CollectionPage":      (("name", "url"), ("description", "isPartOf", "inLanguage")),
    "ProfilePage":         (("name", "url", "mainEntity"), ("description",)),
    "Service":             (("name", "provider"),
                            ("description", "areaServed", "serviceType", "offers")),
    "ProfessionalService": (("name", "provider"),
                            ("description", "areaServed", "serviceType", "offers")),
    "Offer":               (("price", "priceCurrency"), ("availability", "url", "validFrom")),
    "OfferCatalog":        (("name", "itemListElement"), ()),
    "Review":              (("author", "reviewRating"), ("reviewBody", "datePublished", "itemReviewed")),
    "AggregateRating":     (("ratingValue", "reviewCount|ratingCount"),
                            ("bestRating", "worstRating")),
    "FAQPage":             (("mainEntity",), ()),
    "Question":            (("name", "acceptedAnswer"), ()),
    "Answer":              (("text",), ()),
    "LocalBusiness":       (("name", "address"),
                            ("telephone", "url", "openingHours", "priceRange", "image")),
    "Place":               (("name", "address"), ("geo", "url")),
    "PostalAddress":       (("streetAddress", "addressLocality", "addressCountry"),
                            ("postalCode", "addressRegion")),
    "ContactPoint":        (("contactType",), ("telephone", "email", "url", "areaServed")),
    "ImageObject":         (("url",), ("width", "height", "caption")),
    "Course":              (("name", "description", "provider"), ("hasCourseInstance", "offers")),
    "CourseInstance":      (("courseMode",), ("name", "description")),
    "Event":               (("name", "startDate", "location"),
                            ("endDate", "description", "image", "offers", "performer", "eventStatus")),
    "VideoObject":         (("name", "description", "thumbnailUrl", "uploadDate"),
                            ("duration", "contentUrl", "embedUrl", "publisher")),
    "ItemList":            (("itemListElement",), ("numberOfItems", "name")),
    # Book is ACTIVE under policy: a missing required prop on Book is an E.
    "Book":                (("name", "author"),
                            ("isbn", "numberOfPages", "publisher", "bookFormat", "image", "url", "offers")),
}

# Rule 10 URL-bearing properties (absolute HTTPS required).
URL_PROPS = ("url", "@id", "item", "image", "logo", "sameAs")

# --- rule 11 host-binding split (E44) -------------------------------------
# Identity props are bound to the configured canonical host(s).  `sameAs`
# exists to point off-host, so it is exempt from host-binding while still
# being required to be absolute HTTPS.  `image`/`logo` may be off-host only
# when the host is named in the invocation config's [hosts]
# reference_allowlist.  Without the split the gate can never leave
# report-only on either consumer site.
IDENTITY_URL_PROPS = ("url", "@id", "item", "mainEntityOfPage")
REFERENCE_URL_PROPS = ("image", "logo")
HOST_EXEMPT_URL_PROPS = ("sameAs",)
# Every property rules 10/11 inspect, identity first.
URL_CHECK_PROPS = URL_PROPS + ("mainEntityOfPage",)

# Rule 14 placeholder tokens.
PLACEHOLDER_STRINGS = (
    "TODO", "TBD", "PLACEHOLDER", "lorem", "Replace with", "First name",
    "Your Name", "YYYY-MM-DD", "20XX-MM-DD", "example.com", "localhost",
    # zero-filled identifiers (E52): a fabricated numeric id such as
    # https://stackoverflow.com/users/0000000/max-petrusenko
    "0000000",
)
PLACEHOLDER_XXX_RE = re.compile(r"\bXXX\b")
# A zero-filled numeric id in a profile / company / org path segment:
# /users/0000, /company/0000, /orgs/0000.  A real id (/users/1234567/)
# has no run of four zeros and does not match.
PLACEHOLDER_ZERO_ID_RE = re.compile(r"/(?:users|company|orgs)/0{4,}(?=[/?#\s\"']|$)")

# Rule 19 date properties.
DATE_PROPS = ("datePublished", "dateModified", "uploadDate", "dateCreated", "startDate", "endDate", "validFrom", "expires")

PLACEHOLDER_DATE_RE = re.compile(r"^\s*(?:\d{4}-\s*M{1,4}-\s*D{1,4}|\s*\d{2}X{2}-.*)$", re.IGNORECASE)
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$")
ISO_LOOSE_RE = re.compile(r"^\d{4}(?:-\d{2})?(?:-\d{2})?$")


class GateError(Exception):
    """Internal failure -> exit 2."""


def die(msg: str) -> NoReturn:
    raise GateError(msg)


# ==========================================================================
# small helpers
# ==========================================================================
def utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today_iso() -> str:
    return date.today().isoformat()


def trunc(value: Any, limit: int = 220) -> str:
    s = value if isinstance(value, str) else json.dumps(value, sort_keys=True, ensure_ascii=False)
    s = s.replace("\n", " ").strip()
    return s if len(s) <= limit else s[: limit - 3] + "..."


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def as_list(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def types_of(node: dict) -> "list[str]":
    t = node.get("@type")
    return [x for x in as_list(t) if isinstance(x, str)]


def primary_type(node: dict) -> "str | None":
    ts = types_of(node)
    return ts[0] if ts else None


# ==========================================================================
# HTML extraction (stdlib only)
# ==========================================================================
class PageParser(HTMLParser):
    """Collect JSON-LD blocks, the canonical link, and visible text."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.blocks: "list[str]" = []
        self.canonical: "str | None" = None
        self._in_ld = False
        self._buf: "list[str]" = []
        self._skip_depth = 0
        self._text: "list[str]" = []
        self._pending_text: "list[str]" = []

    # -- script handling
    def handle_starttag(self, tag: str, attrs: "list[tuple[str, str | None]]") -> None:
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "link":
            rel = a.get("rel", "").lower()
            if "canonical" in rel.split() and self.canonical is None:
                self.canonical = a.get("href", "").strip() or None
        if tag in ("script", "style"):
            stype = a.get("type", "").lower().replace(" ", "")
            if tag == "script" and stype == "application/ld+json":
                self._in_ld = True
                self._buf = []
            else:
                self._skip_depth += 1
        elif tag in ("noscript", "template"):
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "script":
            if self._in_ld:
                self.blocks.append("".join(self._buf))
                self._in_ld = False
                self._buf = []
            elif self._skip_depth > 0:
                self._skip_depth -= 1
        elif tag in ("style", "noscript", "template"):
            if self._skip_depth > 0:
                self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._in_ld:
            self._buf.append(data)
            return
        if self._skip_depth == 0 and data.strip():
            self._text.append(data.strip())

    @property
    def visible_text(self) -> str:
        return " ".join(self._text)


# An HTML comment is only a comment outside a raw-text element; the raw
# alternative is matched first and returned verbatim so payload-internal
# `<!-- -->` noise survives for rule 3.
_RAW_OR_COMMENT_RE = re.compile(
    r"(?P<raw><(?P<tag>script|style)\b[^>]*>.*?</(?P=tag)\s*>)|<!--.*?-->",
    re.IGNORECASE | re.DOTALL,
)


def strip_html_comments(html: str) -> str:
    """Remove HTML comments (non-greedy, multi-line) before extraction.

    Google does not parse ``<script>`` tags inside an HTML comment, so a
    commented-out JSON-LD block is not live markup and must not be
    extracted (E43: the proven false-positive class that read raw HTML and
    saw a "live placeholder fake-review markup" that did not exist).

    ``<script>`` / ``<style>`` bodies are raw text, not markup, so a
    ``<!-- ... -->`` inside a payload is *not* a comment and is left alone --
    rule 3 still has to see HTML noise inside a JSON-LD payload.
    """
    return _RAW_OR_COMMENT_RE.sub(
        lambda m: m.group(0) if m.group("raw") else "", html)


def parse_page(html: str) -> PageParser:
    p = PageParser()
    try:
        p.feed(strip_html_comments(html))
        p.close()
    except Exception:  # noqa: BLE001 - tolerate malformed HTML; rule 1 covers JSON
        pass
    return p


# ==========================================================================
# JSON-LD traversal  (§A3 "Traversal, defined once")
# ==========================================================================
def walk_nodes(obj: Any, path: str = "$", ancestors: "tuple[str, ...]" = ()) -> "Iterator[tuple[dict, str, tuple[str, ...]]]":
    """Yield (node, jsonpath, ancestor_node_paths) for every object carrying @type.

    Walking covers the top-level object, a top-level array, and recursively
    every ``@graph`` array and nested ``@graph`` -- plus ordinary nested
    objects, which rules 7/8/17 need (an AggregateRating inside a
    LocalBusiness is still a node).
    """
    if isinstance(obj, dict):
        has_type = "@type" in obj
        if has_type:
            yield obj, path, ancestors
        new_anc = ancestors + (path,) if has_type else ancestors
        for key, value in obj.items():
            if key == "@context":
                continue
            yield from walk_nodes(value, "%s.%s" % (path, key), new_anc)
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            yield from walk_nodes(value, "%s[%d]" % (path, i), ancestors)


def walk_values(obj: Any, path: str = "$") -> "Iterator[tuple[Any, str]]":
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield from walk_values(value, "%s.%s" % (path, key))
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            yield from walk_values(value, "%s[%d]" % (path, i))
    else:
        yield obj, path


def payload_has_root_context(payload: Any) -> bool:
    """Rule 4: is @context present on a root node of this payload?"""
    if isinstance(payload, dict):
        if "@context" in payload:
            return True
        graph = payload.get("@graph")
        if isinstance(graph, list):
            return payload_has_root_context(graph)
        return False
    if isinstance(payload, list):
        return any(isinstance(e, dict) and "@context" in e for e in payload)
    return False


# ==========================================================================
# route-key derivation  (§A4.3)
# ==========================================================================
def derive_route_key(relpath: str) -> str:
    """Specified route-key derivation.  Input is a path relative to the surface root."""
    p = relpath.replace(os.sep, "/").lstrip("./")
    p = unquote(p)
    if p.startswith("static/"):
        p = p[len("static/"):]
    if p.startswith("functions/"):
        p = p[len("functions/"):]
        if p.endswith(".func"):
            p = p[: -len(".func")]
    name = p.split("/")[-1]
    if name.endswith(".prerender-fallback.html"):
        head = p[: -len(".prerender-fallback.html")]
        p = head or ""
    elif name == "index.html":
        head = p[: -len("index.html")].rstrip("/")
        p = head or ""
    elif p.endswith(".html"):
        p = p[: -len(".html")]
    if not p.startswith("/"):
        p = "/" + p
    p = re.sub(r"/{2,}", "/", p)
    if len(p) > 1 and p.endswith("/"):
        p = p[:-1]
    if p == "":
        p = "/"
    return p.lower()


def is_excluded_route(relpath: str) -> bool:
    base = os.path.basename(relpath).lower()
    norm = relpath.replace(os.sep, "/").lower()
    if ".rsc" in norm:
        return True
    if base.startswith("_not-found"):
        return True
    if base == "404.html":
        return True
    return False


# ==========================================================================
# policy
# ==========================================================================
VALID_STATUSES = {
    "active", "reinstated", "retired_from_reporting", "feature_removed",
    "out_of_scope", "quota",
}
VALID_BANDS = {"E", "W", "I", "-"}


class PolicyEntry:
    __slots__ = ("id", "types", "all_props", "any_props", "status", "band",
                 "source_url", "last_verified", "announced", "effective",
                 "api_end", "reporting_end", "bigquery_null_from", "history",
                 "note", "raw", "index")

    def __init__(self, raw: dict, index: int) -> None:
        self.raw = raw
        self.index = index
        self.id = str(raw.get("id", "")).strip()
        m = raw.get("match") or {}
        if not isinstance(m, dict):
            die("policy entry %r: match must be a table" % (self.id or index))
        self.types = [str(t) for t in as_list(m.get("types"))]
        self.all_props = [str(t) for t in as_list(m.get("all_props"))]
        self.any_props = [str(t) for t in as_list(m.get("any_props"))]
        self.status = str(raw.get("status", "")).strip()
        self.band = str(raw.get("band", "")).strip()
        self.source_url = raw.get("source_url")
        self.last_verified = raw.get("last_verified")
        self.announced = raw.get("announced")
        self.effective = raw.get("effective")
        self.api_end = raw.get("api_end")
        self.reporting_end = raw.get("reporting_end")
        self.bigquery_null_from = raw.get("bigquery_null_from")
        self.history = raw.get("history")
        self.note = raw.get("note")

    @property
    def is_documentary(self) -> bool:
        """A documentary entry has no type predicate and can never match a node."""
        return not self.types

    @property
    def has_property_constraints(self) -> bool:
        return bool(self.all_props or self.any_props)

    def matches(self, node: dict) -> bool:
        if not self.types:
            # A documentary entry never matches a node.  It exists so policy
            # facts with no schema.org type (quotas, report features) live in
            # the same file with the same citation discipline.
            return False
        nts = set(types_of(node))
        if not nts:
            return False
        if not (nts & set(self.types)):
            return False
        if self.all_props and not all(p in node for p in self.all_props):
            return False
        if self.any_props and not any(p in node for p in self.any_props):
            return False
        return True


class Policy:
    def __init__(self, path: str, vocab: "set[str]") -> None:
        self.path = path
        try:
            with open(path, "rb") as fh:
                doc = tomllib.load(fh)
        except FileNotFoundError:
            die("policy file not found: %s" % path)
        except tomllib.TOMLDecodeError as exc:
            die("policy file is malformed TOML: %s: %s" % (path, exc))
        except OSError as exc:
            die("policy file is unreadable: %s: %s" % (path, exc))
        if not isinstance(doc, dict):
            die("policy root is not a table: %s" % path)
        self.doc = doc
        meta = doc.get("meta")
        if not isinstance(meta, dict):
            die("policy is missing the [meta] table: %s" % path)
        self.meta = meta
        self.meta_schema_version = meta.get("schema_version")
        self.policy_version = meta.get("policy_version", 1)
        self.vocab_snapshot_name = str(meta.get("vocab_snapshot", ""))
        self.vocab_version = str(meta.get("vocab_version", ""))
        self.vocab_fetched = str(meta.get("vocab_fetched", ""))
        self.staleness_max_days = int(meta.get("staleness_max_days", 90))
        raw_entries = doc.get("policy", [])
        if not isinstance(raw_entries, list):
            die("[[policy]] must be an array of tables in %s" % path)
        self.entries = [PolicyEntry(e, i) for i, e in enumerate(raw_entries) if isinstance(e, dict)]
        if len(self.entries) != len(raw_entries):
            die("every [[policy]] entry must be a table in %s" % path)
        self.vocab = vocab
        self._validate()

    # -- §A2.4 policy-file fixtures, offline ---------------------------------
    def _validate(self) -> None:
        self.check_meta()
        self.check_types_resolvable()
        self.check_cited()

    def check_meta(self) -> None:
        if self.meta_schema_version != 1:
            die("policy meta.schema_version must be 1 (got %r) in %s"
                % (self.meta_schema_version, self.path))
        if not self.vocab_snapshot_name:
            die("policy meta.vocab_snapshot is required in %s" % self.path)

    def check_types_resolvable(self) -> "list[tuple[str, str]]":
        """§A2.4 rule 1.  Every match.types value must be in the pinned snapshot."""
        bad = []
        for entry in self.entries:
            for t in entry.types:
                if t not in self.vocab:
                    bad.append((entry.id, t))
        return bad

    def assert_types_resolvable(self) -> None:
        bad = self.check_types_resolvable()
        if bad:
            lines = "\n".join(
                "  policy entry %-32s -> %r is not a schema.org type in the pinned "
                "vocabulary (%s)" % (eid, t, self.vocab_snapshot_name) for eid, t in bad
            )
            die(
                "policy_types_resolvable FAILED: %d unresolvable match.types value(s) "
                "in %s.\n%s\nA key on a feature name can never fire and passes "
                "silently while the markup goes unmatched -- this is a gate "
                "configuration error, not a site error." % (len(bad), self.path, lines)
            )

    def check_cited(self) -> "list[str]":
        """§A2.4 rule 3.  Date-bearing entries carry >=1 source_url + last_verified."""
        missing = []
        date_keys = ("announced", "effective", "api_end", "reporting_end", "bigquery_null_from")
        for entry in self.entries:
            date_bearing = any(entry.raw.get(k) is not None for k in date_keys)
            if date_bearing or entry.status not in ("active", "reinstated"):
                if not entry.source_url or not entry.last_verified:
                    missing.append(entry.id)
        return missing

    def assert_cited(self) -> None:
        missing = self.check_cited()
        if missing:
            die(
                "policy_cited FAILED: %d date-bearing entry/entries lack source_url "
                "and/or last_verified in %s:\n%s"
                % (len(missing), self.path, "\n".join("  " + m for m in missing))
            )

    def check_staleness(self, today: "date | None" = None) -> "list[tuple[str, str, int]]":
        """§A2.3.  Returns (entry_id, last_verified, age_days) for stale entries."""
        ref = today or date.today()
        stale = []
        for entry in self.entries:
            lv = entry.last_verified
            if not lv:
                continue
            if isinstance(lv, (date, datetime)):
                d = lv.date() if isinstance(lv, datetime) else lv
            else:
                d = parse_date_flex(str(lv))
            if d is None:
                continue
            age = (ref - d).days
            if age > self.staleness_max_days:
                stale.append((entry.id, d.isoformat(), age))
        return stale

    # -- matching with the declared precedence rule --------------------------
    def match(self, node: dict) -> "PolicyEntry | None":
        """§A2.2 precedence: an entry with property constraints wins over a
        type-only entry.  Within a tier the first declaration wins."""
        candidates = [e for e in self.entries if e.matches(node)]
        if not candidates:
            return None
        constrained = [e for e in candidates if e.has_property_constraints]
        pool = constrained or candidates
        return sorted(pool, key=lambda e: e.index)[0]


# ==========================================================================
# config (sd-gate.toml)
# ==========================================================================
class Gate:
    def __init__(self) -> None:
        self.mode = "dir"
        self.site = "unnamed-site"
        self.surface: "list[str]" = []
        self.policy: "str | None" = None
        self.baseline: "str | None" = None
        self.coverage_manifest: "str | None" = None
        self.report_only = False
        self.strict = False
        self.allowed_hosts: "list[str]" = []
        # Per-repo off-host allowlist for `image` / `logo` (rule 11, E44),
        # read from the invocation config's [hosts] table.
        self.reference_allowlist: "list[str]" = []
        self.zero_trace: "list[str]" = []
        self.volatile: "list[str]" = []
        self.rules: "list[str]" = []
        self.bands: "dict[str, str]" = {}
        self.adapter_version: "str | None" = None
        self.parity_surfaces: "list[str]" = []
        self.config_path: "str | None" = None
        self.config_dir = os.getcwd()

    @classmethod
    def from_file(cls, path: str) -> "Gate":
        g = cls()
        g.config_path = os.path.abspath(path)
        g.config_dir = os.path.dirname(g.config_path)
        try:
            with open(g.config_path, "rb") as fh:
                doc = tomllib.load(fh)
        except FileNotFoundError:
            die("--config file not found: %s" % path)
        except tomllib.TOMLDecodeError as exc:
            die("--config is malformed TOML: %s: %s" % (path, exc))
        except OSError as exc:
            die("--config is unreadable: %s: %s" % (path, exc))
        if not isinstance(doc, dict):
            die("--config root is not a table: %s" % path)
        gate = doc.get("gate") or {}
        if not isinstance(gate, dict):
            die("--config [gate] must be a table: %s" % path)
        g.mode = str(gate.get("mode", "dir"))
        g.site = str(gate.get("site", "unnamed-site"))
        g.surface = [str(s) for s in as_list(gate.get("surface"))]
        g.policy = gate.get("policy")
        g.baseline = gate.get("baseline")
        g.coverage_manifest = gate.get("coverage_manifest")
        g.report_only = bool(gate.get("report_only", False))
        g.strict = bool(gate.get("strict", False))
        g.allowed_hosts = [str(h).lower() for h in as_list(gate.get("allowed_hosts"))]
        g.zero_trace = [str(s) for s in as_list(gate.get("zero_trace"))]
        g.volatile = [str(s) for s in as_list(gate.get("volatile"))]
        g.rules = [str(s) for s in as_list(gate.get("rules"))]
        g.adapter_version = gate.get("adapter_version")
        g.parity_surfaces = [str(s) for s in as_list(gate.get("parity_surfaces"))]
        bands = doc.get("bands") or {}
        if not isinstance(bands, dict):
            die("--config [bands] must be a table: %s" % path)
        g.bands = {str(k): str(v) for k, v in bands.items()}
        for code, band in g.bands.items():
            if band not in VALID_BANDS:
                die("--config [bands].%s = %r is not one of E/W/I/-" % (code, band))
        hosts = doc.get("hosts") or {}
        if not isinstance(hosts, dict):
            die("--config [hosts] must be a table: %s" % path)
        g.reference_allowlist = [str(h).lower() for h in as_list(hosts.get("reference_allowlist"))]
        return g

    def binding_hosts(self) -> "set[str]":
        """Every host rule 11 identity props may legitimately live on (E44).

        ``allowed_hosts`` is repeatable by design (``--allowed-host`` /
        ``[gate].allowed_hosts``); the binding is to a set, not to the first
        entry, so a site with more than one canonical host (e.g. an atelier
        subdomain) can pass rule 11 without disabling it.
        """
        return {h.lower() for h in self.allowed_hosts if h}

    def resolve(self, value: "str | None") -> "str | None":
        if not value:
            return None
        if os.path.isabs(value):
            return value
        return os.path.normpath(os.path.join(self.config_dir, value))

    def band_for(self, code: str) -> str:
        spec = RULE_SPECS.get(code)
        declared = spec[0] if spec else W
        return self.bands.get(code, declared)

    def rule_enabled(self, code: str, mode: str) -> bool:
        spec = RULE_SPECS.get(code)
        if spec is None:
            return False
        spec_mode = spec[1]
        if spec_mode == "dir" and mode != "dir":
            return False
        if spec_mode == "live" and mode != "live":
            return False
        if self.rules and code not in self.rules:
            return False
        return True


# ==========================================================================
# findings
# ==========================================================================
class Finding:
    __slots__ = ("rule", "band", "route", "node_id", "path", "message",
                 "evidence", "first_seen", "baseline", "mode")

    def __init__(self, rule: str, band: str, route: str, path: str,
                 message: str, evidence: str = "", node_id: "str | None" = None,
                 mode: str = "dir") -> None:
        self.rule = rule
        self.band = band              # resolved band code: E / W / I / -
        self.route = route
        self.node_id = node_id
        self.path = path
        self.message = message
        self.evidence = evidence
        self.first_seen = today_iso()
        self.baseline = False
        self.mode = mode

    @property
    def band_name(self) -> str:
        return {"E": "error", "W": "warn", "I": "info", "-": "observation"}.get(self.band, "info")

    def key(self) -> "tuple[str, str, str]":
        return (self.rule, self.route, self.path)

    def to_json(self) -> dict:
        return {
            "rule": self.rule,
            "band": self.band_name,
            "route": self.route,
            "node_id": self.node_id,
            "path": self.path,
            "message": self.message,
            "evidence": self.evidence,
            "first_seen": self.first_seen,
            "baseline": self.baseline,
        }


class Reporter:
    def __init__(self, gate: Gate, mode: str) -> None:
        self.gate = gate
        self.mode = mode
        self.findings: "list[Finding]" = []
        self.info_lines: "list[str]" = []
        self.skipped: "list[str]" = []

    def add(self, rule: str, route: str, path: str, message: str,
            evidence: str = "", node_id: "str | None" = None,
            band_override: "str | None" = None) -> None:
        if not self.gate.rule_enabled(rule, self.mode):
            return
        band = band_override or self.gate.band_for(rule)
        self.findings.append(Finding(rule, band, route, path, message, evidence, node_id, self.mode))

    def note(self, message: str) -> None:
        self.info_lines.append(message)

    def skip(self, message: str) -> None:
        self.skipped.append(message)

    def counts(self) -> "tuple[int, int, int]":
        err = sum(1 for f in self.findings if f.band == E)
        warn = sum(1 for f in self.findings if f.band == W)
        info = sum(1 for f in self.findings if f.band == I)
        return err, warn, info


# ==========================================================================
# baseline
# ==========================================================================
class Baseline:
    def __init__(self, path: "str | None") -> None:
        self.path = path
        self.routes: "dict[str, dict]" = {}
        self.findings: "set[tuple[str, str, str]]" = set()
        self.first_seen: "dict[tuple[str, str, str], str]" = {}
        self.loaded = False
        if not path:
            return
        index = os.path.join(path, "_index.json")
        if not os.path.exists(index):
            return
        try:
            with open(index, "r", encoding="utf-8") as fh:
                doc = json.load(fh)
        except Exception as exc:  # noqa: BLE001
            die("baseline index is unreadable: %s: %s" % (index, exc))
        self.routes = doc.get("routes", {}) or {}
        for f in doc.get("findings", []) or []:
            k = (f.get("rule", ""), f.get("route", ""), f.get("path", ""))
            self.findings.add(k)
            if f.get("first_seen"):
                self.first_seen[k] = f["first_seen"]
        self.loaded = True


# ==========================================================================
# the validator
# ==========================================================================
class Validator:
    def __init__(self, gate: Gate, policy: Policy, baseline: Baseline,
                 mode: str, root: str) -> None:
        self.gate = gate
        self.policy = policy
        self.baseline = baseline
        self.mode = mode
        self.root = root
        self.rep = Reporter(gate, mode)
        self.vocab = policy.vocab
        self.routes_checked = 0
        self.routes_seen: "set[str]" = set()
        self.routes_expected: "set[str]" = set()
        self.route_digests: "dict[str, dict]" = {}

    # ------------------------------------------------------------------ util
    @property
    def canonical_host(self) -> "str | None":
        if self.gate.allowed_hosts:
            return self.gate.allowed_hosts[0]
        return None

    def band_for_required(self, node: dict, rule_code: str) -> str:
        if rule_code == "missing-required" and (set(types_of(node)) & INFO_TYPES):
            return I
        return self.gate.band_for(rule_code)

    # ------------------------------------------------------- surface walker
    def expand_surfaces(self) -> "list[tuple[str, str]]":
        """Return (surface_entry, absolute_file_path) for every HTML artifact."""
        found: "list[tuple[str, str]]" = []
        seen: "set[str]" = set()
        for entry in self.gate.surface:
            resolved = self.gate.resolve(entry) or entry
            matches: "list[str]" = []
            if any(ch in resolved for ch in "*?["):
                matches = _glob.glob(resolved, recursive=True)
            elif os.path.isdir(resolved):
                matches = _glob.glob(os.path.join(resolved, "**", "*.html"), recursive=True)
            elif os.path.isfile(resolved):
                matches = [resolved]
            else:
                self.rep.skip("surface entry matched nothing: %s" % entry)
                continue
            for m in sorted(matches):
                if not m.lower().endswith(".html"):
                    continue
                ap = os.path.abspath(m)
                if ap in seen:
                    continue
                seen.add(ap)
                found.append((entry, ap))
        return found

    def rel_for(self, abspath: str) -> str:
        base = self.gate.resolve(self.gate.surface[0]) if self.gate.surface else self.root
        if base and os.path.isfile(base):
            base = os.path.dirname(base)
        try:
            return os.path.relpath(abspath, base or self.root)
        except ValueError:
            return os.path.basename(abspath)

    # ------------------------------------------------------------ main loop
    def run(self) -> None:
        self.check_policy_offline()
        surfaces = self.expand_surfaces()
        if not surfaces:
            self.rep.skip("no HTML artifacts found on the configured surface(s)")
        for _entry, path in surfaces:
            rel = self.rel_for(path)
            if is_excluded_route(rel):
                continue
            route = derive_route_key(rel)
            self.routes_checked += 1
            self.routes_seen.add(route)
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as fh:
                    html = fh.read()
            except OSError as exc:
                die("cannot read artifact %s: %s" % (path, exc))
            self.check_page(route, html, source=rel)
        self.check_coverage()
        if self.mode == "live":
            self.rep.skip("rule image-reachability / live-crawl: network rules not exercised "
                          "by this invocation")
        self.rep.skip("rule gsc-sample: --gsc is a stub; no credential configured, skipped")
        self.apply_baseline()

    # ------------------------------------------------- offline policy checks
    def check_policy_offline(self) -> None:
        """§A2.4 rules 1 and 3 run as part of loading, plus staleness (§A2.3)."""
        self.policy.assert_types_resolvable()
        self.policy.assert_cited()
        stale = self.policy.check_staleness()
        for eid, lv, age in stale:
            self.rep.add(
                "policy-finding", "(policy)", "policy.%s.last_verified" % eid,
                "policy entry %r last_verified %s is %d days old (> %d)"
                % (eid, lv, age, self.policy.staleness_max_days),
                evidence="last_verified=%s age_days=%d" % (lv, age), band_override=W,
            )
        # §A2.4 rule 4 is the weekly, network-touching job.
        self.rep.skip("rule policy_source_url_live: network; weekly job, not the blocking gate")

    # ------------------------------------------------------------ per page
    def check_page(self, route: str, html: str, source: str) -> None:
        page = parse_page(html)
        canonical = page.canonical

        # -- rules 1 and 2: parse + payload shape ---------------------------
        parsed: "list[tuple[int, Any]]" = []
        for idx, block in enumerate(page.blocks):
            raw = block.strip()
            if raw == "":
                continue
            ok = False
            payload: Any = None
            try:
                payload = json.loads(raw)
                ok = True
            except json.JSONDecodeError:
                # rule 2: double-encoded JSON (a JSON string holding JSON).
                try:
                    inner = json.loads(json.loads(raw))
                    ok = True
                    payload = inner
                    self.rep.add(
                        "payload-shape", route, "block[%d]" % idx,
                        "block is double-encoded JSON (a JSON string containing JSON)",
                        evidence=trunc(raw),
                    )
                except Exception:  # noqa: BLE001
                    ok = False
            if not ok:
                self.rep.add(
                    "block-parse", route, "block[%d]" % idx,
                    "JSON-LD block does not parse",
                    evidence=trunc(raw),
                )
                continue

            # rule 2: object or array of objects.
            shape_ok = isinstance(payload, dict) or (
                isinstance(payload, list) and all(isinstance(e, dict) for e in payload)
            )
            if not shape_ok:
                if isinstance(payload, str):
                    self.rep.add("payload-shape", route, "block[%d]" % idx,
                                 "payload is a JSON string, not an object or array of objects",
                                 evidence=trunc(payload))
                elif isinstance(payload, list):
                    bad = next((i for i, e in enumerate(payload) if not isinstance(e, dict)), None)
                    self.rep.add("payload-shape", route, "block[%d]" % idx,
                                 "payload array contains a non-object element",
                                 evidence="index=%s raw=%s" % (bad, trunc(payload[bad] if bad is not None else payload)))
                else:
                    self.rep.add("payload-shape", route, "block[%d]" % idx,
                                 "payload is not an object or array of objects",
                                 evidence=trunc(payload))
            parsed.append((idx, payload))

        # rule 3: HTML noise.
        for idx, _ in parsed:
            blob = page.blocks[idx]
            hits = [tok for tok in ("<!--", "&nbsp;", "&amp;", "&quot;", "&lt;", "&gt;", "&#") if tok in blob]
            if hits:
                self.rep.add("html-noise", route, "block[%d]" % idx,
                             "HTML noise inside the JSON-LD payload",
                             evidence="tokens=%s" % ",".join(hits))

        if not parsed:
            if canonical is not None:
                pass  # nothing to align; handled by coverage, not here
            self.route_digests[route] = self.digest(route, [], canonical, page)
            return

        # rule 4: @context at a root node.  The page graph is the union of nodes
        # across all blocks, so this is a page-level property, not a per-block one.
        if not any(payload_has_root_context(p) for _i, p in parsed):
            self.rep.add("context-missing", route, "$",
                         "the page graph has no @context at a root node "
                         "(nested nodes legitimately omit it; roots do not)",
                         evidence=trunc(", ".join("block[%d]" % i for i, _ in parsed)))

        # -- flatten the page graph ----------------------------------------
        nodes: "list[tuple[dict, str, tuple[str, ...]]]" = []
        for idx, payload in parsed:
            for node, path, ancestors in walk_nodes(payload, "$"):
                nodes.append((node, "block[%d]%s" % (idx, path[1:]), ancestors))

        self.check_type_casing(route, nodes)
        self.check_id_unique(route, nodes)
        self.check_references(route, nodes)
        self.check_duplicate_types(route, nodes)
        self.check_aggregate_rating(route, nodes)
        self.check_faqpage(route, nodes)
        self.check_urls(route, nodes, canonical)
        self.check_canonical_align(route, nodes, canonical)
        self.check_zero_trace(route, nodes)
        self.check_required_props(route, nodes)
        self.check_placeholders(route, parsed)
        self.check_visible_content(route, nodes, page.visible_text)
        self.check_rating_consistency(route, nodes)
        self.check_self_serving(route, nodes, canonical)
        self.check_dates(route, nodes)
        self.check_images_live(route, nodes)
        self.check_policy(route, nodes)
        self.check_volatile(route, nodes)

        self.route_digests[route] = self.digest(route, nodes, canonical, page)
        self.check_shape_digest(route, self.route_digests[route])

    # -------------------------------------------------------------- rule 5
    def check_type_casing(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        lower_map = {t.lower(): t for t in self.vocab}
        for node, path, _a in nodes:
            for t in types_of(node):
                if t in self.vocab:
                    continue
                canon = lower_map.get(t.lower())
                if canon:
                    self.rep.add("type-casing", route, path + ".@type",
                                 "@type %r has wrong casing; schema.org type is %r" % (t, canon),
                                 evidence=t)
                else:
                    self.rep.add("type-casing", route, path + ".@type",
                                 "unknown @type %r is not in the pinned schema.org vocabulary "
                                 "(warn only; never blocks)" % (t,),
                                 evidence=t)

    # -------------------------------------------------------------- rule 6
    def check_id_unique(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        seen: "dict[str, str]" = {}
        for node, path, _a in nodes:
            nid = node.get("@id")
            if not isinstance(nid, str) or not nid:
                continue
            if nid in seen:
                self.rep.add("id-unique", route, path + ".@id",
                             "@id %r is not unique on this page (also at %s)" % (nid, seen[nid]),
                             evidence=nid, node_id=nid)
            else:
                seen[nid] = path

    # -------------------------------------------------------------- rule 6
    def check_references(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        defined = set()
        for node, _p, _a in nodes:
            nid = node.get("@id")
            if isinstance(nid, str):
                defined.add(nid)
        for node, path, _a in nodes:
            # References live at property level; walk direct property values
            # (a dict value is the reference itself, not something to descend
            # past -- descending would only ever reach the "@id" string).
            for prop, value in node.items():
                if prop in ("@context", "@id", "@type"):
                    continue
                for item in as_list(value):
                    if not isinstance(item, dict):
                        continue
                    keys = set(item.keys()) - {"@context"}
                    if "@id" not in keys:
                        continue
                    if keys - {"@id", "@type"}:
                        continue  # an embedded entity, not a bare reference
                    ref = item.get("@id")
                    if not isinstance(ref, str):
                        continue
                    vpath = "%s.%s.@id" % (path, prop)
                    if ref in defined:
                        continue
                    if ref.startswith("#"):
                        self.rep.add("ref-unresolved", route, vpath,
                                     "reference %r does not resolve to any @id in the page graph"
                                     % ref, evidence=ref, node_id=ref)
                        continue
                    if ref.startswith("http"):
                        continue  # absolute; host is rule 11's business
                    self.rep.add("ref-unresolved", route, vpath,
                                 "reference %r is neither an in-graph @id nor an absolute URL" % ref,
                                 evidence=ref, node_id=ref)

    # -------------------------------------------------------------- rule 7
    def check_duplicate_types(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        by_type: "dict[str, list[tuple[dict, str]]]" = {}
        for node, path, _a in nodes:
            for t in types_of(node):
                by_type.setdefault(t, []).append((node, path))

        for t, group in by_type.items():
            if len(group) < 2:
                continue
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    (na, pa), (nb, pb) = group[i], group[j]
                    if not self._same_identity(na, nb):
                        continue
                    ka = {k: v for k, v in na.items() if k not in ("@context",)}
                    kb = {k: v for k, v in nb.items() if k not in ("@context",)}
                    shared = set(ka) & set(kb)
                    conflicts = [k for k in sorted(shared) if ka[k] != kb[k]]
                    nested = pa.startswith(pb + ".") or pb.startswith(pa + ".")
                    if conflicts:
                        self.rep.add(
                            "duplicate-type-conflict", route, "%s <-> %s" % (pa, pb),
                            "%s node with one identity carries conflicting values for: %s"
                            % (t, ", ".join(conflicts)),
                            evidence=trunc({k: ka[k] for k in conflicts}),
                            node_id=na.get("@id") if isinstance(na.get("@id"), str) else None,
                        )
                    elif ka == kb:
                        self.rep.add("repeat-identical", route, pa,
                                     "%s node repeated identically at %s (fix with @id referencing, not deletion)"
                                     % (t, pb), evidence=t,
                                     node_id=na.get("@id") if isinstance(na.get("@id"), str) else None)
                    elif nested and (set(ka) <= set(kb) or set(kb) <= set(ka)):
                        self.rep.add("nested-subset", route, pa,
                                     "nested %s node at %s is a strict subset of its ancestor" % (t, pb),
                                     evidence=t,
                                     node_id=na.get("@id") if isinstance(na.get("@id"), str) else None)

    @staticmethod
    def _same_identity(a: dict, b: dict) -> bool:
        ia, ib = a.get("@id"), b.get("@id")
        if isinstance(ia, str) and isinstance(ib, str):
            return ia == ib
        if isinstance(ia, str) or isinstance(ib, str):
            return False
        na, ua = a.get("name"), a.get("url")
        nb, ub = b.get("name"), b.get("url")
        if na is None and ua is None and nb is None and ub is None:
            # Two anonymous nodes with no distinguishing key are NOT the same
            # entity.  Treating them as one turns every pair of anonymous
            # Answers/Ratings on a page into a false conflict.
            return False
        return (na, ua) == (nb, ub)

    # -------------------------------------------------------------- rule 8
    def check_aggregate_rating(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        by_owner: "dict[str, list[str]]" = {}
        for node, path, ancestors in nodes:
            if "AggregateRating" not in types_of(node):
                continue
            owner = ancestors[-1] if ancestors else "$"
            by_owner.setdefault(owner, []).append(path)
        for owner, paths in by_owner.items():
            if len(paths) > 1:
                self.rep.add("multi-aggregaterating", route, owner,
                             "entity carries %d AggregateRating nodes (at most one per entity per page)"
                             % len(paths),
                             evidence=", ".join(paths))

    # -------------------------------------------------------------- rule 9
    def check_faqpage(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        hits = [p for n, p, _a in nodes if "FAQPage" in types_of(n)]
        if len(hits) > 1:
            self.rep.add("multi-faqpage", route, hits[0],
                         "%d FAQPage nodes on one page (at most one)" % len(hits),
                         evidence=", ".join(hits))

    # ------------------------------------------------------------- rule 10/11
    def check_urls(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]",
                   canonical: "str | None") -> None:
        # Rule 11 host-binding split (E44):
        #   identity props (url, non-fragment @id, item, mainEntityOfPage)
        #     -> bound to the configured canonical host(s);
        #   sameAs -> must be absolute HTTPS but is exempt from host-binding
        #     (its purpose is to point off-host);
        #   image / logo -> absolute HTTPS and same-host OR on the per-repo
        #     [hosts] reference_allowlist; off-host without an entry is an error.
        hosts = self.gate.binding_hosts()
        if canonical:
            ch = urlparse(canonical).netloc.lower()
            if ch:
                hosts.add(ch)
        allowlist = {h.lower() for h in self.gate.reference_allowlist}
        for node, path, _a in nodes:
            for prop in URL_CHECK_PROPS:
                if prop not in node:
                    continue
                for value in as_list(node[prop]):
                    if not isinstance(value, str):
                        continue
                    if value.startswith("#"):
                        # graph-internal identifier: rule 6 owns it, not rule 10.
                        continue
                    parsed = urlparse(value)
                    if not parsed.scheme:
                        self.rep.add("url-absolute", route, "%s.%s" % (path, prop),
                                     "%s is not an absolute URL" % prop, evidence=value)
                        continue
                    if parsed.scheme != "https":
                        self.rep.add("url-absolute", route, "%s.%s" % (path, prop),
                                     "%s uses scheme %r; absolute HTTPS required" % (prop, parsed.scheme),
                                     evidence=value)
                        continue
                    netloc = parsed.netloc.lower()
                    if not hosts or not netloc or netloc in hosts:
                        continue
                    if prop in HOST_EXEMPT_URL_PROPS:
                        # sameAs must still be absolute HTTPS; it is not host-bound.
                        continue
                    if prop in REFERENCE_URL_PROPS:
                        if netloc in allowlist:
                            continue
                        self.rep.add(
                            "url-host", route, "%s.%s" % (path, prop),
                            "%s host %r does not match the canonical host %s and is not in "
                            "the [hosts] reference_allowlist"
                            % (prop, netloc, ", ".join(sorted(hosts)) or "-"),
                            evidence=value)
                        continue
                    # identity prop (url / @id / item / mainEntityOfPage)
                    if prop in IDENTITY_URL_PROPS:
                        self.rep.add("url-host", route, "%s.%s" % (path, prop),
                                     "%s host %r does not match the canonical host %s"
                                     % (prop, netloc, ", ".join(sorted(hosts)) or "-"),
                                     evidence=value)

    # -------------------------------------------------------------- rule 12
    def check_canonical_align(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]",
                              canonical: "str | None") -> None:
        if not canonical:
            return
        for node, path, _a in nodes:
            tset = set(types_of(node))
            if not (tset & {"WebPage", "AboutPage", "CollectionPage", "ProfilePage"}):
                continue
            url = node.get("url")
            nid = node.get("@id")
            candidate = url if isinstance(url, str) and not url.startswith("#") else None
            if candidate is None and isinstance(nid, str) and not nid.startswith("#"):
                candidate = nid
            if candidate is None:
                continue
            if candidate.rstrip("/") != canonical.rstrip("/"):
                self.rep.add("canonical-align", route, "%s.url" % path,
                             "root WebPage URL does not equal <link rel=canonical>",
                             evidence="graph=%s canonical=%s" % (candidate, canonical))

    # -------------------------------------------------------------- rule 13
    def check_zero_trace(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        if not self.gate.zero_trace:
            return
        for node, path, _a in nodes:
            for value, vpath in walk_values(node, path):
                if not isinstance(value, str):
                    continue
                for token in self.gate.zero_trace:
                    if token and token.lower() in value.lower():
                        self.rep.add("brand-zerotrace", route, vpath,
                                     "declared zero-trace token %r appears in the page graph" % token,
                                     evidence=trunc(value))

    # ---------------------------------------------------- required/recommended
    def check_required_props(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        for node, path, _a in nodes:
            for t in types_of(node):
                spec = REQUIRED_PROPS.get(t)
                if not spec:
                    continue
                required, recommended = spec
                for req in required:
                    if "|" in req:
                        if any(part in node for part in req.split("|")):
                            continue
                        missing = req
                    else:
                        if req in node:
                            continue
                        missing = req
                    self.rep.add(
                        "missing-required", route, "%s.%s" % (path, missing.replace("|", "|")),
                        "%s is missing the required property %s" % (t, missing),
                        evidence=json.dumps({k: node.get(k) for k in ("@id", "name", "url") if k in node}),
                        node_id=node.get("@id") if isinstance(node.get("@id"), str) else None,
                        band_override=self.band_for_required(node, "missing-required"),
                    )
                for rec in recommended:
                    if rec in node:
                        continue
                    self.rep.add(
                        "missing-recommended", route, "%s.%s" % (path, rec),
                        "%s is missing the recommended property %s" % (t, rec),
                        evidence=t,
                        node_id=node.get("@id") if isinstance(node.get("@id"), str) else None,
                    )

    # -------------------------------------------------------------- rule 14
    def check_placeholders(self, route: str, parsed: "list[tuple[int, Any]]") -> None:
        for idx, payload in parsed:
            for value, vpath in walk_values(payload, "block[%d]$" % idx):
                if not isinstance(value, str):
                    continue
                hit = None
                for token in PLACEHOLDER_STRINGS:
                    if token.lower() in value.lower():
                        hit = token
                        break
                if hit is None and PLACEHOLDER_XXX_RE.search(value):
                    hit = "XXX"
                if hit:
                    self.rep.add("placeholder-text", route, vpath,
                                 "placeholder string %r in a JSON-LD value" % hit,
                                 evidence=trunc(value))
                    continue
                zero = PLACEHOLDER_ZERO_ID_RE.search(value)
                if zero:
                    self.rep.add("placeholder-text", route, vpath,
                                 "zero-filled identifier %r in a JSON-LD value" % zero.group(0),
                                 evidence=trunc(value))

    # -------------------------------------------------------------- rule 15
    def check_visible_content(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]",
                              visible: str) -> None:
        page_tokens = set(re.findall(r"[a-z0-9]{3,}", visible.lower()))
        if len(page_tokens) < 20:
            return
        props = ("name", "headline", "description", "reviewBody", "text", "articleBody")
        for node, path, _a in nodes:
            for prop in props:
                value = node.get(prop)
                if not isinstance(value, str) or len(value) < 12:
                    continue
                toks = set(re.findall(r"[a-z0-9]{3,}", value.lower()))
                if len(toks) < 5:
                    continue
                overlap = len(toks & page_tokens) / float(len(toks))
                if overlap < 0.5:
                    self.rep.add(
                        "visible-content", route, "%s.%s" % (path, prop),
                        "%s.%s has only %.0f%% token overlap with visible page text "
                        "(approximation; CSS-hidden content is invisible to this check)"
                        % (path, prop, overlap * 100),
                        evidence=trunc(value),
                    )

    # -------------------------------------------------------------- rule 16
    def check_rating_consistency(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        reviews = []
        for node, path, _a in nodes:
            if "Review" not in types_of(node):
                continue
            rr = node.get("reviewRating")
            value = None
            if isinstance(rr, dict):
                value = rr.get("ratingValue")
            elif rr is not None:
                value = rr
            reviews.append((node, path, value))
        for node, path, ancestors in nodes:
            if "AggregateRating" not in types_of(node):
                continue
            owner_path = ancestors[-1] if ancestors else None
            rating = node.get("ratingValue")
            try:
                rating_f = float(rating) if rating is not None else None
            except (TypeError, ValueError):
                rating_f = None
            best = node.get("bestRating", 5)
            try:
                best_f = float(best)
            except (TypeError, ValueError):
                best_f = 5.0
            if rating_f is not None and not (0.0 <= rating_f <= best_f):
                self.rep.add("rating-consistency", route, "%s.ratingValue" % path,
                             "ratingValue %s is outside [0, bestRating=%s]" % (rating, best),
                             evidence=trunc(node))
            count = node.get("reviewCount", node.get("ratingCount"))
            try:
                count_i = int(count) if count is not None else None
            except (TypeError, ValueError):
                count_i = None
            mine = [(n, p, v) for (n, p, v) in reviews
                    if owner_path and (p.startswith(owner_path + ".") or not owner_path)]
            if count_i is not None and count_i > 0 and not reviews:
                self.rep.add(
                    "rating-consistency", route, "%s.reviewCount" % path,
                    "AggregateRating claims %d reviews but the page carries zero Review nodes"
                    % count_i, evidence=trunc(node))
            elif count_i is not None and reviews and count_i != len(reviews):
                self.rep.add(
                    "rating-consistency", route, "%s.reviewCount" % path,
                    "AggregateRating reviewCount=%d but the page carries %d Review node(s)"
                    % (count_i, len(reviews)), evidence=trunc(node))
            if rating_f is not None and len(reviews) >= 1:
                vals = []
                for _n, _p, v in reviews:
                    try:
                        vals.append(float(v))
                    except (TypeError, ValueError):
                        pass
                if vals:
                    mean = sum(vals) / len(vals)
                    if abs(mean - rating_f) > 0.05:
                        self.rep.add(
                            "rating-consistency", route, "%s.ratingValue" % path,
                            "AggregateRating ratingValue=%s but the mean of %d on-page "
                            "Review node(s) is %.2f" % (rating, len(vals), mean),
                            evidence=trunc(node))

    # -------------------------------------------------------------- rule 17
    def check_self_serving(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]",
                           canonical: "str | None") -> None:
        host = self.canonical_host
        if canonical:
            ch = urlparse(canonical).netloc.lower()
            if ch:
                host = ch
        for node, path, _a in nodes:
            ts = set(types_of(node))
            if not (ts & {"LocalBusiness", "Organization"}):
                continue
            if "review" in node:
                self.rep.add(
                    "self-serving-review", route, "%s.review" % path,
                    "%s carries review snippets about itself; review snippets are only for "
                    "sites capturing reviews about other businesses" % (",".join(sorted(ts))),
                    evidence=trunc(node.get("review")))
        for node, path, _a in nodes:
            if "Review" not in types_of(node):
                continue
            item = node.get("itemReviewed")
            if not isinstance(item, dict):
                continue
            its = set(types_of(item))
            if not (its & {"LocalBusiness", "Organization"}):
                continue
            url = node.get("url") or item.get("url")
            if isinstance(url, str) and host and host in urlparse(url).netloc.lower():
                self.rep.add("self-serving-review", route, path,
                             "Review itemReviewed is a %s on this site (self-serving)"
                             % ",".join(sorted(its)), evidence=trunc(item))

    # -------------------------------------------------------------- rule 19
    def check_dates(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        horizon = date.today() + timedelta(days=1)
        long_ago = date.today() - timedelta(days=int(24 * 30.44))
        for node, path, _a in nodes:
            parsed_dates: "dict[str, date]" = {}
            for prop in DATE_PROPS:
                if prop not in node:
                    continue
                for value in as_list(node[prop]):
                    if not isinstance(value, str):
                        continue
                    vpath = "%s.%s" % (path, prop)
                    if PLACEHOLDER_DATE_RE.match(value) or not (
                        ISO_DATE_RE.match(value) or ISO_LOOSE_RE.match(value)
                    ):
                        self.rep.add("date-sanity", route, vpath,
                                     "%s=%r is not an ISO 8601 date (or is a placeholder)"
                                     % (prop, value), evidence=value)
                        continue
                    d = parse_date_flex(value)
                    if d is None:
                        self.rep.add("date-sanity", route, vpath,
                                     "%s=%r is not a parseable ISO 8601 date" % (prop, value),
                                     evidence=value)
                        continue
                    parsed_dates[prop] = d
                    if d > horizon:
                        self.rep.add("date-sanity", route, vpath,
                                     "%s=%s is more than one day in the future" % (prop, value),
                                     evidence=value)
                    if prop == "dateModified" and d < long_ago:
                        self.rep.add("date-sanity", route, vpath,
                                     "dateModified=%s is more than 24 months old" % value,
                                     evidence=value, band_override=W)
            pub, mod = parsed_dates.get("datePublished"), parsed_dates.get("dateModified")
            if pub and mod and pub > mod:
                self.rep.add("date-sanity", route, "%s.datePublished" % path,
                             "datePublished %s is after dateModified %s"
                             % (pub.isoformat(), mod.isoformat()),
                             evidence="published=%s modified=%s" % (pub, mod))

    # -------------------------------------------------------------- rule 18
    def check_images_live(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        if self.mode != "live":
            return  # E(live): cannot fire in dir mode
        # Network path intentionally minimal; the live lane owns the crawl.
        urls = []
        for node, path, _a in nodes:
            for prop in ("image", "logo", "thumbnailUrl"):
                for value in as_list(node.get(prop)):
                    if isinstance(value, str) and value.startswith("http"):
                        urls.append((path, prop, value))
                    elif isinstance(value, dict) and isinstance(value.get("url"), str):
                        urls.append((path, prop, value["url"]))
        for path, prop, url in urls:
            if prop == "logo" and url.lower().endswith(".svg"):
                self.rep.add("image-reachability", route, "%s.%s" % (path, prop),
                             "Organization.logo points at an SVG; bitmap required",
                             evidence=url)
                continue
            code, disallowed = self._probe(url)
            if disallowed:
                self.rep.add("image-reachability", route, "%s.%s" % (path, prop),
                             "image path is disallowed by the host robots.txt",
                             evidence=url)
            elif code != 200:
                self.rep.add("image-reachability", route, "%s.%s" % (path, prop),
                             "image GET returned %s (plain unauthenticated GET required)" % code,
                             evidence=url)

    def _probe(self, url: str) -> "tuple[int, bool]":
        import urllib.error
        import urllib.request
        import urllib.robotparser
        try:
            rp = urllib.robotparser.RobotFileParser()
            parsed = urlparse(url)
            rp.set_url("%s://%s/robots.txt" % (parsed.scheme, parsed.netloc))
            rp.read()
            if not rp.can_fetch("*", url):
                return 0, True
        except Exception:  # noqa: BLE001
            pass
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "sd-check/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return int(resp.status), False
        except urllib.error.HTTPError as exc:
            return int(exc.code), False
        except Exception:  # noqa: BLE001
            return 0, False

    # -------------------------------------------------------------- rule 20
    def check_policy(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        for node, path, _a in nodes:
            entry = self.policy.match(node)
            if entry is None:
                continue
            if entry.band == "-":
                self.rep.add("policy-finding", route, path,
                             "policy %r (%s) observation: %s"
                             % (entry.id, entry.status, entry.note or ""),
                             evidence=entry.source_url or "", band_override=OBS,
                             node_id=node.get("@id") if isinstance(node.get("@id"), str) else None)
                continue
            band = entry.band if entry.band in ("E", "W", "I") else I
            if band == "E":
                band = W  # policy findings are never E (§A3 rule 20)
            self.rep.add("policy-finding", route, path,
                         "policy %r (%s): %s" % (entry.id, entry.status, entry.note or ""),
                         evidence=entry.source_url or "", band_override=band,
                         node_id=node.get("@id") if isinstance(node.get("@id"), str) else None)

    # -------------------------------------------------------------- rule 23
    def check_volatile(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        if not self.gate.volatile:
            return
        for field in self.gate.volatile:
            hit = next((p for n, p, _a in nodes if field in n), None)
            if hit is None:
                continue
            self.rep.add("volatile-allowlist", route, hit + "." + field,
                         "volatile field %r is present and excluded from the shape digest "
                         "(per-property array-order semantics)" % field,
                         evidence="volatile allowlist: %s" % ", ".join(self.gate.volatile),
                         band_override=OBS)

    # ---------------------------------------------------------- baseline side
    def digest(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]",
               canonical: "str | None", page: PageParser) -> dict:
        types: "list[str]" = []
        ids: "list[str]" = []
        required_present: "dict[str, list[str]]" = {}
        values: "dict[str, Any]" = {}
        content: "dict[str, Any]" = {}
        for node, _path, _a in nodes:
            for t in types_of(node):
                types.append(t)
                spec = REQUIRED_PROPS.get(t)
                if spec:
                    required_present.setdefault(t, []).extend(
                        p for p in spec[0] if not p.startswith("|") and p in node
                    )
            nid = node.get("@id")
            if isinstance(nid, str):
                ids.append(nid)
            for prop in ("price", "priceCurrency", "ratingValue", "reviewCount",
                         "ratingCount", "bestRating", "worstRating"):
                if prop in node:
                    values["%s.%s" % (primary_type(node) or "Node", prop)] = node[prop]
            for prop in ("name", "headline", "description", "reviewBody"):
                if isinstance(node.get(prop), str):
                    content["%s.%s" % (primary_type(node) or "Node", prop)] = node[prop]
        volatile = set(self.gate.volatile)
        for key in list(values):
            if key.split(".", 1)[-1] in volatile:
                values.pop(key, None)
        shape_material = {
            "types": sorted(types),
            "ids": sorted(ids),
            "required_present": {k: sorted(v) for k, v in sorted(required_present.items())},
            "values": {k: values[k] for k in sorted(values)},
            "canonical": canonical,
        }
        return {
            "route": route,
            "shape": shape_material,
            "shape_digest": sha256_text(json.dumps(shape_material, sort_keys=True)),
            "content": {k: content[k] for k in sorted(content)},
            "content_digest": sha256_text(json.dumps(content, sort_keys=True)),
            "blocks": len(page.blocks),
        }

    def check_shape_digest(self, route: str, digest: dict) -> None:
        if not self.baseline.loaded:
            return
        stored = self.baseline.routes.get(route)
        if not stored:
            return  # rule 24 owns the missing-baseline direction
        if stored.get("shape_digest") != digest["shape_digest"]:
            before = stored.get("shape", {})
            after = digest["shape"]
            diffs = []
            for key in ("types", "ids", "required_present", "values", "canonical"):
                if before.get(key) != after.get(key):
                    diffs.append(key)
            self.rep.add("shape-digest", route, "$",
                         "shape digest differs from the baseline (changed: %s)" % ", ".join(diffs),
                         evidence="baseline=%s now=%s"
                                  % (str(stored.get("shape_digest"))[:12], digest["shape_digest"][:12]),
                         band_override=self.gate.band_for("shape-digest"))
        if stored.get("content_digest") != digest["content_digest"]:
            self.rep.add("content-snapshot", route, "$",
                         "content snapshot differs from the baseline",
                         evidence="baseline=%s now=%s"
                                  % (str(stored.get("content_digest"))[:12], digest["content_digest"][:12]))

    # -------------------------------------------------------------- rule 24
    def check_coverage(self) -> None:
        manifest_routes: "set[str]" = set()
        if self.gate.coverage_manifest:
            mp = self.gate.resolve(self.gate.coverage_manifest)
            if mp and os.path.exists(mp):
                try:
                    with open(mp, "r", encoding="utf-8", errors="replace") as fh:
                        xml = fh.read()
                    for loc in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml):
                        route = urlparse(loc).path or "/"
                        route = unquote(route)
                        if len(route) > 1 and route.endswith("/"):
                            route = route[:-1]
                        manifest_routes.add(route.lower() or "/")
                except OSError as exc:
                    die("coverage manifest unreadable: %s: %s" % (mp, exc))
            else:
                self.rep.skip("coverage manifest not found: %s" % (self.gate.coverage_manifest,))
        self.routes_expected = set(manifest_routes) if manifest_routes else set(self.baseline.routes)
        if not self.baseline.loaded:
            return
        band_override = W if self.gate.report_only else self.gate.band_for("coverage")
        # direction 1: a baseline route with no extraction
        for route in sorted(self.baseline.routes):
            if route not in self.routes_seen:
                self.rep.add("coverage", route, "$",
                             "baseline route produced no extraction in this run",
                             evidence="baseline route %s missing from the surface walk" % route,
                             band_override=band_override)
        # direction 2: a manifest route with no baseline entry
        for route in sorted(manifest_routes):
            if route not in self.baseline.routes:
                self.rep.add("coverage", route, "$",
                             "coverage-manifest route has no baseline entry",
                             evidence="route %s absent from the baseline index" % route,
                             band_override=band_override)

    # --------------------------------------------------------------- parity
    def check_surface_parity(self) -> None:
        """§A4.1: extract per surface and fail when block counts or the @type
        multiset diverge."""
        specs = self.gate.parity_surfaces or self.gate.surface
        if len(specs) < 2:
            self.rep.skip("--surface-parity needs at least two surfaces; skipped")
            return
        per_surface: "dict[str, dict[str, tuple[int, tuple[str, ...]]]]" = {}
        for spec in specs:
            resolved = self.gate.resolve(spec) or spec
            files = (_glob.glob(resolved, recursive=True)
                     if any(c in resolved for c in "*?[")
                     else _glob.glob(os.path.join(resolved, "**", "*.html"), recursive=True))
            label = os.path.basename(spec.rstrip("/"))
            table: "dict[str, tuple[int, tuple[str, ...]]]" = {}
            for f in sorted(files):
                if not f.lower().endswith(".html") or is_excluded_route(f):
                    continue
                rel = os.path.relpath(f, self.root)
                try:
                    with open(f, "r", encoding="utf-8", errors="replace") as fh:
                        html = fh.read()
                except OSError:
                    continue
                page = parse_page(html)
                types: "list[str]" = []
                for block in page.blocks:
                    try:
                        payload = json.loads(block)
                    except Exception:  # noqa: BLE001
                        continue
                    for node, _p, _a in walk_nodes(payload, "$"):
                        types.extend(types_of(node))
                table[derive_route_key(rel)] = (len(page.blocks), tuple(sorted(types)))
            per_surface[label] = table
        labels = sorted(per_surface)
        base_label = labels[0]
        base = per_surface[base_label]
        for label in labels[1:]:
            other = per_surface[label]
            for route in sorted(set(base) & set(other)):
                bc_a, ta = base[route]
                bc_b, tb = other[route]
                if bc_a != bc_b or ta != tb:
                    self.rep.add("surface-parity", route, "$",
                                 "surface %r and %r diverge (blocks %d vs %d, types %s vs %s)"
                                 % (base_label, label, bc_a, bc_b, list(ta), list(tb)),
                                 evidence="adapter_version=%s" % self.gate.adapter_version)
            only_base = sorted(set(base) - set(other))
            only_other = sorted(set(other) - set(base))
            for route in only_base[:10]:
                self.rep.add("surface-parity", route, "$",
                             "route present in surface %r but absent from %r" % (base_label, label))
            for route in only_other[:10]:
                self.rep.add("surface-parity", route, "$",
                             "route present in surface %r but absent from %r" % (label, base_label))

    # ------------------------------------------------------------ baseline IO
    def apply_baseline(self) -> None:
        for f in self.rep.findings:
            if f.key() in self.baseline.findings:
                f.baseline = True
                f.first_seen = self.baseline.first_seen.get(f.key(), f.first_seen)

    def write_baseline(self, path: str) -> None:
        os.makedirs(path, exist_ok=True)
        for route, digest in sorted(self.route_digests.items()):
            safe = route.strip("/").replace("/", "__") or "index"
            with open(os.path.join(path, "%s.json" % safe), "w", encoding="utf-8") as fh:
                json.dump(digest, fh, indent=2, sort_keys=True)
                fh.write("\n")
        index = {
            "baseline_schema_version": 1,
            "generated_at": utcnow_iso(),
            "site": self.gate.site,
            "mode": self.mode,
            "routes": {
                route: {
                    "shape_digest": d["shape_digest"],
                    "content_digest": d["content_digest"],
                    "shape": d["shape"],
                    "content": d["content"],
                    "blocks": d["blocks"],
                }
                for route, d in sorted(self.route_digests.items())
            },
            "findings": [
                {"rule": f.rule, "route": f.route, "path": f.path, "first_seen": f.first_seen}
                for f in sorted(self.rep.findings, key=lambda x: x.key())
            ],
        }
        with open(os.path.join(path, "_index.json"), "w", encoding="utf-8") as fh:
            json.dump(index, fh, indent=2, sort_keys=True)
            fh.write("\n")


# ==========================================================================
# date helper
# ==========================================================================
def parse_date_flex(value: str) -> "date | None":
    v = value.strip()
    if not v:
        return None
    m = re.match(r"^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$", v)
    if m:
        y = int(m.group(1))
        mo = int(m.group(2)) if m.group(2) else 1
        d = int(m.group(3)) if m.group(3) else 1
        try:
            return date(y, mo, d)
        except ValueError:
            return None
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})[T ](.*)$", v)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


# ==========================================================================
# report
# ==========================================================================
def build_report(gate: Gate, validator: Validator, mode: str,
                 routes_checked: int, routes_expected: int, surface_label: str,
                 policy_versions: "tuple[Any, str]") -> dict:
    err, warn, info = validator.rep.counts()
    return {
        "report_schema_version": REPORT_SCHEMA_VERSION,
        "validator_version": VALIDATOR_VERSION,
        "site": gate.site,
        "mode": mode,
        "surface": surface_label,
        "policy_version": policy_versions[0],
        "vocab_version": policy_versions[1],
        "adapter_version": gate.adapter_version,
        "generated_at": utcnow_iso(),
        "summary": {
            "error": err,
            "warn": warn,
            "info": info,
            "routes_checked": routes_checked,
            "routes_expected": routes_expected,
        },
        "findings": [f.to_json() for f in validator.rep.findings],
        "notes": list(validator.rep.info_lines),
        "skipped": list(validator.rep.skipped),
    }


def print_human(report: dict, validator: Validator, verbose: bool) -> None:
    s = report["summary"]
    w = sys.stdout.write
    w("sd-check: site=%s mode=%s surface=%s policy=%s vocab=%s\n"
      % (report["site"], report["mode"], report["surface"],
         report["policy_version"], report["vocab_version"]))
    for f in validator.rep.findings:
        w("  [%s] %-24s %-28s %s\n" % (f.band, f.rule, f.route, f.message))
        if verbose and f.evidence:
            w("        evidence: %s\n" % f.evidence)
        if verbose:
            w("        path: %s\n" % f.path)
    for line in validator.rep.info_lines:
        w("  (info) %s\n" % line)
    if verbose:
        for line in validator.rep.skipped:
            w("  (skip) %s\n" % line)
    w("summary: error=%d warn=%d info=%d routes_checked=%d routes_expected=%d\n"
      % (s["error"], s["warn"], s["info"], s["routes_checked"], s["routes_expected"]))


# ==========================================================================
# CLI
# ==========================================================================
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="sd-check.py",
        description="Canonical structured-data CI validator (offline-first).",
    )
    p.add_argument("--config", metavar="PATH", help="sd-gate.toml invocation config")
    p.add_argument("--dir", metavar="PATH", action="append", default=[],
                   help="surface dir or glob (repeatable)")
    p.add_argument("--url", metavar="URL", help="live-mode target URL")
    p.add_argument("--policy", metavar="PATH", help="path to sd-policy.toml")
    p.add_argument("--baseline", metavar="PATH", help="baseline directory")
    p.add_argument("--coverage-manifest", metavar="PATH", help="sitemap.xml listing expected routes")
    p.add_argument("--report-only", action="store_true",
                   help="never exit 1 on findings (internal failures still exit 2)")
    p.add_argument("--strict", action="store_true", help="promote warn-band findings to exit 1")
    p.add_argument("--update-baseline", action="store_true",
                   help="write the baseline from this run")
    p.add_argument("--surface-parity", action="store_true",
                   help="compare block counts and @type multisets across surfaces")
    p.add_argument("--json", nargs="?", const="-", default=None, metavar="PATH",
                   help="emit the report JSON ('-' or no value = stdout)")
    p.add_argument("--gsc", action="store_true",
                   help="GSC URL Inspection sampling (stub; inert without a credential)")
    p.add_argument("--site", metavar="NAME", help="site identifier recorded in the report")
    p.add_argument("--allowed-host", metavar="HOST", action="append", default=[],
                   help="canonical host (repeatable)")
    p.add_argument("--list-rules", action="store_true", help="print the rule catalogue and exit")
    p.add_argument("--validate-policy", action="store_true",
                   help="validate the policy file offline (types resolvable + cited) and exit")
    p.add_argument("--verbose", "-v", action="store_true")
    p.add_argument("--version", action="version", version="sd-check %s" % VALIDATOR_VERSION)
    return p


def load_vocab(policy_path: "str | None", policy_dir: str) -> "tuple[set[str], str]":
    candidates = []
    if policy_path:
        try:
            with open(policy_path, "rb") as fh:
                meta = tomllib.load(fh)
        except Exception as exc:  # noqa: BLE001
            die("cannot read policy %s: %s" % (policy_path, exc))
        name = str((meta.get("meta") or {}).get("vocab_snapshot", ""))
        if name:
            candidates.append(os.path.join(os.path.dirname(os.path.abspath(policy_path)), name))
    candidates.append(os.path.join(policy_dir, "schema-org-types.txt"))
    for cand in candidates:
        if cand and os.path.exists(cand):
            with open(cand, "r", encoding="utf-8") as fh:
                vocab = {ln.strip() for ln in fh if ln.strip()}
            if not vocab:
                die("vocabulary snapshot is empty: %s" % cand)
            return vocab, cand
    die("vocabulary snapshot not found (looked for: %s). Regenerate it with "
        "scripts/fetch-schema-org-types.py" % ", ".join(c for c in candidates if c))


def main(argv: "list[str] | None" = None) -> int:
    args = build_parser().parse_args(argv)

    if args.list_rules:
        for code in sorted(RULE_SPECS):
            band, mode, desc = RULE_SPECS[code]
            print("%-24s %-4s %-9s %s" % (code, band, mode, desc))
        return 0

    # ---- resolve invocation config --------------------------------------
    try:
        if args.config:
            gate = Gate.from_file(args.config)
        else:
            gate = Gate()
            gate.config_dir = os.getcwd()
        if args.dir:
            gate.surface = list(args.dir)
        if args.site:
            gate.site = args.site
        if args.allowed_host:
            gate.allowed_hosts = [h.lower() for h in args.allowed_host]
        if args.report_only:
            gate.report_only = True
        if args.strict:
            gate.strict = True
        if args.url:
            gate.mode = "live"
            gate.surface = []
        mode = gate.mode
        if mode not in ("dir", "live"):
            die("unknown mode %r (expected 'dir' or 'live')" % mode)

        # ---- resolve policy + vocab -------------------------------------
        script_dir = os.path.dirname(os.path.abspath(__file__))
        policy_path = args.policy or gate.resolve(gate.policy) or os.path.join(script_dir, "sd-policy.toml")
        vocab, vocab_path = load_vocab(policy_path, script_dir)
        policy = Policy(policy_path, vocab)

        if args.validate_policy:
            bad = policy.check_types_resolvable()
            missing = policy.check_cited()
            stale = policy.check_staleness()
            print("policy: %s" % policy_path)
            print("vocab snapshot: %s (%d types, pinned vocab_version=%s)"
                  % (vocab_path, len(vocab), policy.vocab_version))
            print("entries: %d" % len(policy.entries))
            print("policy_types_resolvable: %s"
                  % ("PASS" if not bad else "FAIL (%d)" % len(bad)))
            for eid, t in bad:
                print("  unresolvable: entry=%s type=%r" % (eid, t))
            print("policy_cited: %s" % ("PASS" if not missing else "FAIL (%d)" % len(missing)))
            for m in missing:
                print("  uncited: %s" % m)
            print("policy_staleness: %s"
                  % ("PASS" if not stale else "FAIL (%d)" % len(stale)))
            for eid, lv, age in stale:
                print("  stale: entry=%s last_verified=%s age_days=%d" % (eid, lv, age))
            return 0

        if not gate.surface and mode == "dir":
            die("no surface configured: pass --dir or set [gate].surface in --config")

        # ---- baseline ----------------------------------------------------
        baseline_path = args.baseline or gate.resolve(gate.baseline)
        baseline = Baseline(baseline_path)

        # ---- run ---------------------------------------------------------
        root = gate.resolve(gate.surface[0]) if gate.surface else os.getcwd()
        if root and os.path.isfile(root):
            root = os.path.dirname(root)
        root = root or os.getcwd()
        validator = Validator(gate, policy, baseline, mode, root)

        if mode == "live":
            validator.rep.skip("live mode: --url %s (fetch path is the live lane's; "
                               "no blocking-path network I/O)" % args.url)
        validator.run()
        if args.surface_parity:
            validator.check_surface_parity()

        # ---- GSC stub ----------------------------------------------------
        if args.gsc or mode == "live":
            validator.rep.skip("gsc: URL Inspection sampling skipped "
                               "(no credential configured); inert, never fails")

        if args.update_baseline:
            target = baseline_path
            if not target:
                die("--update-baseline needs a baseline path (--baseline or [gate].baseline)")
            validator.write_baseline(str(target))

        surface_label = ", ".join(gate.surface) if gate.surface else (args.url or "-")
        report = build_report(gate, validator, mode, validator.routes_checked,
                              len(validator.routes_expected) or validator.routes_checked,
                              surface_label, (policy.policy_version, policy.vocab_version))

        err, warn, info = validator.rep.counts()

        # `--json -` must emit pure JSON on stdout so callers can pipe it.
        def say(msg: str) -> None:
            stream = sys.stderr if args.json == "-" else sys.stdout
            stream.write(msg + "\n")

        if args.json is not None:
            blob = json.dumps(report, indent=2, sort_keys=True)
            if args.json == "-":
                sys.stdout.write(blob + "\n")
            else:
                with open(args.json, "w", encoding="utf-8") as fh:
                    fh.write(blob + "\n")

        if args.json != "-":
            print_human(report, validator, verbose=args.verbose)

        if args.json and args.json != "-":
            say("report written: %s" % os.path.abspath(args.json))

        # ---- exit-code contract (§A5.3) ---------------------------------
        if err:
            if gate.report_only:
                say("sd-check: report-only -> %d error-band finding(s) reported, exit 0" % err)
                return 0
            say("sd-check: FAIL -> %d error-band finding(s)" % err)
            return 1
        if warn:
            if gate.report_only:
                say("sd-check: report-only -> %d warn-band finding(s) reported, exit 0" % warn)
                return 0
            if gate.strict:
                say("sd-check: FAIL (--strict) -> %d warn-band finding(s)" % warn)
                return 1
        say("sd-check: OK -> error=0 warn=%d info=%d" % (warn, info))
        return 0

    except GateError as exc:
        sys.stderr.write("sd-check: internal failure (exit 2): %s\n" % exc)
        return 2
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001 - any unexpected error is exit 2
        import traceback
        sys.stderr.write("sd-check: internal failure (exit 2): %s: %s\n"
                         % (type(exc).__name__, exc))
        if os.environ.get("SD_CHECK_DEBUG"):
            traceback.print_exc()
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
