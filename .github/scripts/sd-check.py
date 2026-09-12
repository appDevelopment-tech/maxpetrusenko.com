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
# 1.2.0: the REVERSE zero-trace direction -- `foreign-brand` (config-driven
# `foreign_brands`), so a property that serves another brand's markup is
# caught from the receiving side too.  Finding shape still unchanged;
#      report_schema_version stays 1.
# 1.3.0: rule 13s -- `self-serving-rating` (band E, config-driven
#        `self_owned_entities`), the type-aware companion to rule 17.  Rule 17
#        warns about ANY `review` on a LocalBusiness/Organization; this rule is
#        the band-E, type-aware, self-ownership-keyed version that covers the
#        `aggregateRating` form as well and is inert until a repo names its own
#        entity.  Finding shape still unchanged; report_schema_version stays 1.
# 1.4.0: TRUTHFULNESS FIXES (adversarial review of 1.1.0, 2026-09-12).  Five
#        defects, each of which made the gate greenest exactly where the work
#        was missing:
#          * `no-markup` (band E): a route that was walked and yielded ZERO
#            JSON-LD blocks is now a finding.  Before this, deleting a page's
#            markup made it CLEANER (proven: mp `/tech` 61 findings -> 0).
#          * the ld+json media type is parsed, not string-compared, so
#            `application/ld+json; charset=utf-8` no longer hides a block.
#          * `missing-required` is reference-aware and position-aware: a bare
#            `{"@id": ...}` pointer is not an entity, and a node's required set
#            now depends on the position it occupies (`publisher`,
#            `areaServed`, `itemOffered`, an `OfferCatalog`'s
#            `itemListElement`, `location`).  ~109 of the 112 `missing-required`
#            findings on the mp surface were false positives under these two
#            mechanisms plus one wrong table row (ProfessionalService).
#          * `date-sanity`: a FUTURE `Event.startDate` is correct, not an
#            error.  The `+1 day` horizon now applies only to publication-ish
#            dates; event/validity intervals are checked for ordering
#            (start after end) and for an implausible year instead.
#          * `placeholder-text`: whole-segment matching instead of a substring
#            scan, so a SKU or price containing `0000000` is not an error.
#        Plus: `[gate].report_only`/`strict`/`mode` are REQUIRED keys (a
#        missing `report_only` used to flip a gate from report-only to exit 1
#        as an invisible default), `--validate-policy` exits non-zero on FAIL,
#        and `--report-only` no longer downgrades the E-band `coverage` rule to
#        W.  Finding shape still unchanged; report_schema_version stays 1.
# 1.4.1: BAND CALIBRATION against Google's live documentation (fetched
#        2026-09-12; every page below self-reports "Last updated 2026-09-08
#        UTC").  1.4.0's positional regime fixed 99 false positives and
#        INTRODUCED a new over-strict class: `publisher: Organization` was
#        held to `name` + `logo`, which is 61 error-band findings on
#        tantrastudio and 10 on maxpetrusenko.  The bands are now attributed
#        from the documentation rather than from the v2 table:
#
#          BAND DEFINITION (codified here, enforced by the tables):
#            E  "Google REQUIRES this property for rich-result eligibility."
#            W  "Google RECOMMENDS, EXPECTS, or does not document a
#               requirement for this property."
#          A property may only be E if a Google page says it is required.
#          `docs: ...` comments under each table row carry the fetch date and
#          the verbatim sentence; `sd-policy.toml` carries the full quote,
#          source_url and last_verified for every decision.
#
#        E -> W (documented as Recommended / "include as many as possible" /
#        no documented requirement):
#          * Article/BlogPosting/NewsArticle — the doc now says, twice,
#            "There are no required properties; instead, add the properties
#            that apply to your content", and its ONLY property table is
#            headed "Recommended properties".  `publisher` is not in that
#            table at all; it survives only in an author best-practice note
#            and in examples.  So headline/author/datePublished were E with
#            no documentation behind them.
#          * Organization — "There are no required properties; instead, add
#            the properties that apply to your organization."  name/url were
#            E; `logo` was E in the `publisher` position and is documented
#            under Recommended properties ("A logo that is representative of
#            your organization, if applicable").
#          * PostalAddress — LocalBusiness requires `address`
#            ("Required properties address PostalAddress ... Include as many
#            properties as possible") but its SUB-properties are not
#            required; the Organization doc lists address.addressCountry /
#            address.addressLocality / address.addressRegion under
#            Recommended properties.  streetAddress/addressLocality/
#            addressCountry were E.
#          * WebPage — Google has no WebPage rich result: the
#            /structured-data/webpage path 404s and WebPage is absent from
#            the Search Gallery.  The one documented feature that targets
#            WebPage (Speakable, BETA) requires SpeakableSpecification
#            cssSelector|xPath, never `url`.  WebPage.url/name were E.  The
#            page URL is still policed, at E, by `canonical-align` (rule 12).
#          * VideoObject.description, Course.provider, ProfilePage.url —
#            found by the same sweep; each is documented as Recommended (or
#            simply absent from the doc's Required block).  Course is
#            info-band (INFO_TYPES) so this one never affected an exit code.
#
#        NOT changed, and stated here so the next reader does not re-derive
#        it: `seller`, `areaServed`, `itemOffered`, `location` and the
#        doc-less types (Person, WebSite, Service, Offer, Place,
#        ContactPoint, ImageObject, ItemList, ...) are NOT settled by any
#        Google page fetched on 2026-09-12.  `location` is the one position
#        where the doc is STRICTER than the gate ("Add the location.address
#        and location.name properties"); tightening it would ADD findings and
#        is deliberately out of scope for a calibration that only removes
#        unsupported E.  Finding shape still unchanged; report_schema_version
#        stays 1.
# 1.5.0: RULE-BEHAVIOUR FIXES, five defects.  Two of them made a finding
#        impossible; three made a silent path look clean.
#          * rule 8 `multi-aggregaterating` keyed the "one AggregateRating per
#            entity" count on the WALK PATH of the parent node, so the same
#            entity emitted twice (two <script> blocks, or once inside
#            `@graph`) was counted as two entities and the rule could not fire.
#            It now keys on the rated entity's IDENTITY (@id / url / resolved
#            itemReviewed / (type, name) / in-page fragment).  PROVEN with the
#            captured shape of www.maxpetrusenko.com/: three AggregateRatings
#            for one business, three different reviewCounts.
#          * rule 16 `rating-consistency` compared every AggregateRating's
#            reviewCount against the PAGE-WIDE Review-node count, so it
#            reported the same finding for two ratings of one entity (the
#            violation) and for two ratings of two different entities (which is
#            legitimate and licensed), and it never compared the ratings to
#            each other.  It is now scoped PER ENTITY across every block on the
#            route: a rating is checked against the Review nodes of its own
#            entity, and a second AggregateRating for the same entity with a
#            divergent ratingValue / reviewCount is a finding of its own.
#          * a `[gate].baseline` that is SET but whose `<path>/_index.json`
#            does not exist used to load nothing and stay silent -- and the
#            skip note dropped its "(no [gate].baseline configured)" suffix
#            precisely BECAUSE the key was present, so a dead path read as "no
#            baseline loaded" while three rules were quietly unable to fire.
#            A configured-but-missing baseline is now a config error (exit 2).
#            Not-configured is still the documented skip.  `--update-baseline`
#            is exempt: there, a missing index is that run's normal input.
#          * `<script type="application/ld+json">` inside `<noscript>` or
#            `<template>` was extracted as live markup.  Neither container is
#            rendered by a JS-enabled crawler, so neither is markup Google
#            sees; such blocks are no longer extracted and the route is
#            reported as an explicit skip.  Same reasoning as the HTML-comment
#            rule (E43).
#          * the `payload-shape` "double-encoded JSON" branch was UNREACHABLE
#            dead code: it ran only when `json.loads(raw)` raised, and its
#            first statement called `json.loads(raw)` again on the same
#            immutable string, so it raised before it could ever report.  The
#            reachable half of that intent is the "payload is a JSON string"
#            branch, which stays and is now pinned by a fixture.  Removed.
#          * a CONFIGURED surface that yields zero HTML artifacts exited 0 with
#            `routes_checked=0` and the verdict "sd-check: OK".  An empty
#            directory or a glob matching nothing therefore read as a clean run.
#            Only the consumer workflow's shell guard exited 2, and a guard is
#            not the gate: a direct invocation, or any future caller, still
#            passed while reading nothing.  Zero artifacts on a configured
#            surface is now exit 2.  "The surface key is ABSENT" stays its own
#            separate config error, and a surface whose every artifact is an
#            error-style route (0 routes checked, files real) is reported as an
#            explicit skip instead.
#        Finding shape unchanged; report_schema_version stays 1.
VALIDATOR_VERSION = "1.5.0"

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
    "foreign-brand":          (E, "dir+live", "Configured foreign-brand strings/hosts absent from the graph"),
    "self-serving-rating":    (E, "dir+live", "Self-owned entity carries its own rating (ineligible type)"),
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
    "no-markup":              (E, "dir+live", "Every walked route carries JSON-LD (see [gate].markup_optional)"),
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
    # --- 1.4.1 band calibration: E only where a Google page says "required" --
    # Article / NewsArticle / BlogPosting
    # docs: https://developers.google.com/search/docs/appearance/structured-data/article
    #       fetched 2026-09-12, page self-reports "Last updated 2026-09-08 UTC".
    #       "There are no required properties; instead, add the properties that
    #        apply to your content."  The page's ONLY property table is headed
    #       "Recommended properties"; `publisher` is not in it at all (it
    #       appears only in an author best-practice note and in examples), so
    #       headline/author/datePublished are W, not E.
    "Article":             ((), ("author", "dateModified", "datePublished", "headline",
                                 "image", "mainEntityOfPage", "publisher")),
    "BlogPosting":         ((), ("author", "dateModified", "datePublished", "headline",
                                 "image", "mainEntityOfPage", "publisher")),
    "NewsArticle":         ((), ("author", "dateModified", "datePublished", "headline",
                                 "image", "mainEntityOfPage", "publisher")),
    "BreadcrumbList":      (("itemListElement",), ()),
    "ListItem":            (("position",), ("item", "name")),
    # docs: https://developers.google.com/search/docs/appearance/structured-data/organization
    #       fetched 2026-09-12, "Last updated 2026-09-08 UTC".
    #       "There are no required properties; instead, add the properties that
    #        apply to your organization."  `logo` is under Recommended
    #       properties: "A logo that is representative of your organization, if
    #       applicable."
    "Organization":        ((), ("contactPoint", "logo", "name", "sameAs", "url")),
    "Person":              (("name",), ("url", "sameAs", "jobTitle")),
    "WebSite":             (("name", "url"), ("potentialAction", "publisher")),
    # docs: no WebPage rich result exists.  /structured-data/webpage 404s
    #       (2026-09-12) and WebPage is absent from the Search Gallery; the one
    #       documented feature that targets WebPage (Speakable, BETA,
    #       /structured-data/speakable) requires SpeakableSpecification
    #       cssSelector|xPath, never `url`.  The page URL stays E under
    #       `canonical-align` (rule 12), which is the rule that actually
    #       enforces it.
    "WebPage":             ((), ("name", "url", "description", "isPartOf", "inLanguage",
                                 "datePublished", "dateModified")),
    "AboutPage":           (("name", "url"), ("description", "isPartOf", "inLanguage")),
    "CollectionPage":      (("name", "url"), ("description", "isPartOf", "inLanguage")),
    # docs: https://developers.google.com/search/docs/appearance/structured-data/profile-page
    #       fetched 2026-09-12, "Last updated 2026-09-08 UTC".  Required
    #       properties are `mainEntity` and `name` only (name may be satisfied
    #       by alternateName).  `url` is not required.
    "ProfilePage":         (("name", "mainEntity"), ("url", "description")),
    "Service":             (("name", "provider"),
                            ("description", "areaServed", "serviceType", "offers")),
    # 1.4.0: `provider` is NOT a property of ProfessionalService.  It is a
    # `LocalBusiness` > `Organization` subtype, and schema.org defines
    # `provider` on CreativeWork / Service / EducationalOccupationalProgram --
    # never on Organization.  The former row was copied from `Service` and
    # demanded a property the type does not have, which is why 5 of the mp
    # findings were unfixable false positives (`/tech`'s own
    # ProfessionalService entity was told it must carry a `provider`).
    "ProfessionalService": (("name",),
                            ("description", "url", "areaServed", "serviceType",
                             "telephone", "image", "logo", "offers")),
    "Offer":               (("price", "priceCurrency"), ("availability", "url", "validFrom")),
    "OfferCatalog":        (("name", "itemListElement"), ()),
    "Review":              (("author", "reviewRating"), ("reviewBody", "datePublished", "itemReviewed")),
    "AggregateRating":     (("ratingValue", "reviewCount|ratingCount"),
                            ("bestRating", "worstRating")),
    "FAQPage":             (("mainEntity",), ()),
    "Question":            (("name", "acceptedAnswer"), ()),
    "Answer":              (("text",), ()),
    # docs: https://developers.google.com/search/docs/appearance/structured-data/local-business
    #       fetched 2026-09-12, "Last updated 2026-09-08 UTC": "Required
    #       properties address PostalAddress ... name Text The name of the
    #       business."  The top-level pair is unchanged; it is the PostalAddress
    #       row below that was over-strict.
    "LocalBusiness":       (("name", "address"),
                            ("telephone", "url", "openingHours", "priceRange", "image")),
    "Place":               (("name", "address"), ("geo", "url")),
    # docs: LocalBusiness requires `address` but says of its sub-properties
    #       "Include as many properties as possible. The more properties you
    #       provide, the higher quality the result is to users" -- expected,
    #       not required.  The Organization doc lists address.addressCountry /
    #       address.addressLocality / address.addressRegion under Recommended
    #       properties.  streetAddress/addressLocality/addressCountry were E
    #       and are now W.
    "PostalAddress":       ((), ("addressCountry", "addressLocality", "addressRegion",
                                 "postalCode", "streetAddress")),
    "ContactPoint":        (("contactType",), ("telephone", "email", "url", "areaServed")),
    "ImageObject":         (("url",), ("width", "height", "caption")),
    # docs: https://developers.google.com/search/docs/appearance/structured-data/course
    #       fetched 2026-09-12, "Last updated 2026-09-08 UTC".  "Required
    #       properties description ... name The title of the course.
    #       Recommended properties provider Organization".  `provider` was E;
    #       it is the FIRST recommended property in the doc's own table.
    "Course":              (("name", "description"), ("provider", "hasCourseInstance", "offers")),
    "CourseInstance":      (("courseMode",), ("name", "description")),
    "Event":               (("name", "startDate", "location"),
                            ("endDate", "description", "image", "offers", "performer", "eventStatus")),
    # docs: https://developers.google.com/search/docs/appearance/structured-data/video
    #       fetched 2026-09-12, "Last updated 2026-09-08 UTC".  "Required
    #       properties name ... thumbnailUrl ... uploadDate"; `description` is
    #       NOT in that block (it was E).  It is now W.
    "VideoObject":         (("name", "thumbnailUrl", "uploadDate"),
                            ("description", "duration", "contentUrl", "embedUrl", "publisher")),
    "ItemList":            (("itemListElement",), ("numberOfItems", "name")),
    # Book is ACTIVE under policy: a missing required prop on Book is an E.
    "Book":                (("name", "author"),
                            ("isbn", "numberOfPages", "publisher", "bookFormat", "image", "url", "offers")),
}

# --------------------------------------------------------------------------
# Position-aware required properties (1.4.0, P0-B mechanism 2)
# --------------------------------------------------------------------------
# The REQUIRED_PROPS table above encodes what a TYPE needs when it is the
# subject of the page graph.  It was applied to every node in every position,
# which is where ~89 of the mp `missing-required` findings came from: a `Place`
# used as an `areaServed` descriptor, an `Organization` used as a `publisher`
# stub, an `Offer` used as a catalogue ENTRY, and a `Service` used as
# `itemOffered` are all different requirement regimes from the top-level type.
#
# 1.4.1 CORRECTION: the 1.4.0 comment here read "Google's own Article
# guidance, for example, requires `name` + `logo` on `publisher`".  That is
# NOT what the Article doc says (fetched 2026-09-12, "Last updated 2026-09-08
# UTC"): it says "There are no required properties; instead, add the
# properties that apply to your content", its only property table is headed
# "Recommended properties", and `publisher` is not in that table at all.  The
# `publisher` regime below is therefore EMPTY, and `Organization.logo` is a
# recommended property everywhere -- which is what removes the 61
# tantrastudio / 10 maxpetrusenko error-band findings this table caused.
#
# KEY   : (parent @type, property the node hangs off).  "*" = any parent type.
# VALUE : {child @type: required-property tuple}.  Tuples are absolute for that
#         position: an empty tuple means "this position requires nothing", it
#         does NOT fall through to the global table.  A position that is not in
#         this table falls through to REQUIRED_PROPS[child type] unchanged.
#
# Recommended properties are deliberately NOT overridden here: this change is
# scoped to the error band.  See `--list-positions` to print this table.
POSITION_REQUIRED: "dict[tuple[str, str], dict[str, tuple[str, ...]]]" = {
    # An OfferCatalog's entries describe services; they are not purchasable
    # offers, so they carry no price by design.
    ("OfferCatalog", "itemListElement"): {
        "Offer": (),
    },
    # A publisher stub requires NOTHING.  See the 1.4.1 correction above:
    # neither of the two docs that could govern this position documents a
    # required property.  `logo` remains a RECOMMENDED property (Organization
    # row), so a publisher without one is a warn-band finding, not an error.
    ("*", "publisher"): {
        "Organization": (),
    },
    # A seller stub: name only.
    ("*", "seller"): {
        "Organization": ("name",),
    },
    # A service-area descriptor legitimately names a city / region; `address`
    # is a property of a PHYSICAL Place, not of an area descriptor.
    ("*", "areaServed"): {
        "Place": ("name",),
        "AdministrativeArea": ("name",),
        "City": ("name",),
        "Country": ("name",),
    },
    # An Event with a named venue ("Various locations by request") is not a
    # missing-address defect; a named Place requires a name.
    ("*", "location"): {
        "Place": ("name",),
        "VirtualLocation": ("name",),
    },
    # A Service offered inside an Offer/OfferCatalog is named; it does not
    # re-declare its own provider (the parent Offer/Service does).
    ("*", "itemOffered"): {
        "Service": ("name",),
        "Product": ("name",),
    },
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
#
# 1.4.0 (P1-E): these are matched as WHOLE SEGMENTS, not substrings.  The
# substring scan made any ordinary SKU, price, timestamp or hash containing
# `0000000` a hard error (~3 E-band false positives reproduced on one clean
# Product: sku `10000000`, price `10000000`, and `See notexample.com`), and it
# is the one rule where a false positive is unrecoverable -- there is no
# "maybe" in the error band.  See PLACEHOLDER_RES below for the delimiter
# semantics; `example.com` still fires in a URL, `10000000` does not.
PLACEHOLDER_STRINGS = (
    "TODO", "TBD", "PLACEHOLDER", "lorem", "Replace with", "First name",
    "Your Name", "YYYY-MM-DD", "20XX-MM-DD", "example.com", "localhost",
    # zero-filled identifiers (E52): a fabricated numeric id such as
    # https://stackoverflow.com/users/0000000/max-petrusenko.  Segment-bounded,
    # so it no longer matches a longer digit run such as a 8-digit SKU.
    "0000000",
)
PLACEHOLDER_XXX_RE = re.compile(r"\bXXX\b", re.IGNORECASE)


def _segment_bounded(token: str) -> "re.Pattern[str]":
    """Compile a placeholder token as a whole SEGMENT.

    A hit requires the token to be delimited by something that is not an
    ASCII letter or digit, on both sides.  `example.com` therefore fires in
    `https://example.com/x` and in `www.example.com`, but not in
    `notexample.com`; `0000000` fires in `/users/0000000/` but not inside the
    SKU `10000000`.
    """
    return re.compile(r"(?<![A-Za-z0-9])%s(?![A-Za-z0-9])" % re.escape(token),
                      re.IGNORECASE)


PLACEHOLDER_RES: "tuple[tuple[str, re.Pattern[str]], ...]" = tuple(
    (tok, _segment_bounded(tok)) for tok in PLACEHOLDER_STRINGS
)

# A zero-filled numeric id in a profile / company / org path segment:
# /users/0000, /company/0000, /orgs/0000.  A real id (/users/1234567/)
# has no run of four zeros and does not match.
PLACEHOLDER_ZERO_ID_RE = re.compile(r"/(?:users|company|orgs)/0{4,}(?=[/?#\s\"']|$)")

# Rule 19 date properties.  Split by SEMANTIC (1.4.0, P0-B mechanism 3): a
# future publication date is wrong, a future scheduled Event is correct.
DATE_PROPS = ("datePublished", "dateModified", "uploadDate", "dateCreated", "startDate", "endDate", "validFrom", "expires")
# Publication-ish dates may not be more than a day in the future.
FUTURE_HORIZON_PROPS = ("datePublished", "dateModified", "dateCreated", "uploadDate")
# Interval endpoints: no future horizon (scheduling one IS the use case), but
# the pair must be ordered and the year must be plausible.
INTERVAL_PROPS = ("startDate", "endDate", "validFrom", "expires")
# (start, end) pairs checked for ordering on the same node.
INTERVAL_PAIRS = (("startDate", "endDate"), ("validFrom", "expires"))
# A date outside this year range cannot be a real content date; the upper
# bound is a rolling +10 years so a genuinely long-lived event still passes.
MIN_PLAUSIBLE_YEAR = 1990
MAX_PLAUSIBLE_YEAR = date.today().year + 10

PLACEHOLDER_DATE_RE = re.compile(r"^\s*(?:\d{4}-\s*M{1,4}-\s*D{1,4}|\s*\d{2}X{2}-.*)$", re.IGNORECASE)
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$")
ISO_LOOSE_RE = re.compile(r"^\d{4}(?:-\d{2})?(?:-\d{2})?$")

# --- rule 13s: self-serving ratings (band E) ------------------------------
# Google's review-snippet documentation (fetched 2026-09-12; the page says
# "Last updated 2026-09-08 UTC") states that when "the entity that's being
# reviewed controls the reviews about itself", pages "that use LocalBusiness or
# any other type of Organization structured data are ineligible for star review
# feature", and it lists `Organization` as a reviewed-item type "only for sites
# that capture reviews about other organizations" (Local business likewise,
# "only for sites that capture reviews about other local businesses").
#
# The reviewed-item types the same page DOES support are: Book, Course,
# CreativeWorkSeason, CreativeWorkSeries, Episode, Event, Game, HowTo,
# LocalBusiness, MediaObject, Movie, MusicPlaylist, MusicRecording,
# Organization, Product, Recipe, SoftwareApplication.  `Person`, `WebSite` and
# `Service` are not on that list.
#
# So an entity rating ITSELF is ineligible exactly when the reviewed type is one
# the star feature never accepts a self-review for.  That is this set:
SELF_SERVING_INELIGIBLE_TYPES = frozenset({
    "Organization", "LocalBusiness", "ProfessionalService", "Person", "WebSite",
})
# Deliberately absent, each for a stated reason -- a false positive here is
# expensive, so the rule under-fires rather than guesses:
#   * Product / Course / SoftwareApplication / Book / Recipe / Event / Movie /
#     SoftwareApplication and friends -- supported reviewed-item types.  A page
#     rating ITS OWN product, course or app is the licensed case, not a finding.
#   * Service / Place / EducationalOrganization and other Organization-adjacent
#     types the documentation does not name -- eligibility for a self-review is
#     ambiguous there, so the rule stays silent and says so (see the docstring
#     on `check_self_serving_rating`).
#
# Properties that attach an evaluation to a node.  `aggregateRating` covers the
# star-aggregate form; `review` covers a single self-authored review.
RATING_PROPS = ("aggregateRating", "review")

# 1.5.0: the tolerance for "these two ratings agree".  Used by rule 16 for BOTH
# the ratingValue-vs-Review-mean comparison (where it has always been 0.05) and
# the new cross-block ratingValue comparison, so the two cannot drift apart.
# Chosen to absorb the one-decimal rounding that real markup does (4.9 vs a
# mean of 4.85... ) without letting two genuinely different published ratings
# through.
RATING_EPS = 0.05


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
        # 1.5.0: ld+json blocks found inside an INERT container (`<noscript>`,
        # `<template>`).  Counted, not extracted -- see `handle_starttag`.
        self.ld_inert = 0
        self._ld_inert = False
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
            # 1.4.0 (P0-A): parse the media type, do not string-compare it.
            # `type="application/ld+json; charset=utf-8"` is legal (RFC 2045)
            # and every real parser strips the parameter; the old exact
            # `==` comparison dropped the whole block, so a page carrying the
            # parameter was validated by NOTHING (byte-identical payload,
            # exit 1 vs exit 0).
            stype = a.get("type", "").split(";", 1)[0].strip().lower()
            if tag == "script" and stype == "application/ld+json":
                if self._skip_depth > 0:
                    # 1.5.0: inside `<noscript>` / `<template>`.  Neither
                    # container is RENDERED by a JS-enabled crawler, so a block
                    # in one is not markup Google sees.  Extract nothing and
                    # count it, so the route can report the inert blocks rather
                    # than silently seeing zero markup.  Same reasoning as the
                    # HTML-comment case (E43): a block the browser does not act
                    # on is not live markup.
                    self.ld_inert += 1
                    self._ld_inert = True
                else:
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
            elif self._ld_inert:
                # The inert ld+json block never incremented `_skip_depth`, so
                # decrementing here would corrupt the container depth and make
                # the container's own </noscript> close the wrong level.
                self._ld_inert = False
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


# Route keys that can legitimately carry no markup: error / fallback surfaces.
# Rule `no-markup` must never fire on these (a 404 page has no structured data
# and a 500 page is not content).
_ERROR_ROUTE_RE = re.compile(
    r"^/(?:4\d\d|5\d\d)(?:$|/)|^/cdn-cgi/|^/_error|^/500(?:$|/)|^/404(?:$|/)",
    re.IGNORECASE,
)


def is_error_style_route(route: str) -> bool:
    """True for error / infrastructure routes that legitimately have no markup."""
    return bool(_ERROR_ROUTE_RE.search(route or ""))


def route_matches_any(route: str, patterns: "Iterable[str]") -> "str | None":
    """Whole-segment / prefix glob match used by `[gate].markup_optional`.

    Patterns are route keys (`/privacy`) or globs (`/legal/*`); matching is on
    the derived lowercase route key with `fnmatch` semantics, plus a bare
    trailing `*` acting as a prefix.  Returns the matching pattern, or None.
    """
    import fnmatch as _fnmatch
    r = (route or "").lower()
    for pat in patterns:
        p = str(pat).strip().lower()
        if not p:
            continue
        if _fnmatch.fnmatchcase(r, p):
            return p
        if p.endswith("/*") and r.startswith(p[:-1]):
            return p
    return None


# --------------------------------------------------------------------------
# rated-entity identity  (rules 8 and 16, 1.5.0)
# --------------------------------------------------------------------------
# Rules 8 and 16 are both statements about *an entity's* ratings, and until
# 1.5.0 neither of them could name an entity: rule 8 grouped AggregateRating
# nodes by the JSON PATH of their parent, and rule 16 compared every
# AggregateRating on the page against the page-wide Review-node count.  Both
# keys are properties of the DOCUMENT, not of the rated thing, so:
#
#   * one entity emitted twice -- two <script> blocks, or one node inside
#     `@graph` -- produced two different owner paths, and rule 8 could not fire
#     (proved on the captured www.maxpetrusenko.com/ homepage: three
#     AggregateRating nodes, `ratingValue` 4.9 in all three, reviewCount
#     17 / 6 / 26, rule 8 silent);
#   * rule 16 fired IDENTICALLY for two ratings of one entity (the violation)
#     and for two ratings of two unrelated entities (which is what the star
#     review feature licenses), so its firing carried no information about
#     consistency at all.
#
# `rating_entity_key` returns the identity of the entity a rating-bearing node
# describes, or a route-local fallback when the markup does not state one.
# Identity is taken from the strongest signal the markup provides, in order:
#
#   @id (resolving a same-page `#fragment`) > url > (type, name)
#
# and for a rating node the `itemReviewed` target wins over its own container,
# because `itemReviewed` is the markup stating "this rating is ABOUT that".
#
# HONEST LIMIT, stated on purpose (same philosophy as rule 13s): an entity the
# markup does not identify is NOT grouped with anything.  Two anonymous ratings
# on one route stay two entities, because "these are the same business" cannot
# be shown from the bytes, and a false "inconsistent ratings for one entity"
# accusation is worse than a missed warning.  That is why the captured
# production page's three blocks -- one WebPage keyed by /spirituality, one
# ProfessionalService keyed by /tech, one standalone AggregateRating keyed by
# its literal itemReviewed name -- are still three keys, and why the fix is
# proved with a fixture that states its entity rather than with that page.
def _ident(value: str, kind: str) -> tuple:
    """Identity tuple for one identifier value.

    An identifier that is an absolute URL is an IRI, and in JSON-LD an IRI is
    an IRI whether it arrived as `@id` or as a `url` reference: `{"@id":
    "https://h/widget"}` and `{"url": "https://h/widget"}` denote the same
    resource.  So both collapse to one ("iri", ...) tuple and the two spellings
    meet without a union-find.  Anything else keeps its kind.
    """
    v = value.strip().rstrip("/")
    if re.match(r"^[a-z][a-z0-9+.\-]*://", v, re.I):
        return ("iri", v)
    return (kind, v)


def _entity_identities(node: Any, by_path: "dict[str, dict]", depth: int = 0) -> "list[tuple]":
    """Every identity tuple a node states, strongest first.

    A node may state more than one (`@id` AND `url`); `identity_index` decides
    which one a bare reference lands on.
    """
    if depth > 2:
        return []
    if isinstance(node, str):
        return [_ident(node, "id")] if node.strip() else []
    if not isinstance(node, dict):
        return []
    out: "list[tuple]" = []
    nid = node.get("@id")
    if isinstance(nid, str) and nid.strip():
        if nid.startswith("#"):
            target = by_path.get(nid)
            if target is not None and target is not node:
                return _entity_identities(target, by_path, depth + 1)
            out.append(("frag", nid))
        else:
            out.append(_ident(nid, "id"))
    url = node.get("url")
    if isinstance(url, str) and url.strip():
        out.append(_ident(url, "url"))
    if out:
        return out
    for key in ("name", "legalName", "alternateName"):
        value = node.get(key)
        if isinstance(value, str) and value.strip():
            return [("name", primary_type(node) or "", value.strip().lower())]
    return []


def identity_index(nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> "dict[tuple, tuple]":
    """Alias table: an identity tuple -> the canonical key it resolves to.

    A node that declares both an `@id` and a `url` says those two identifiers
    name one entity, and JSON-LD resolves a reference by either.  Without the
    alias, a Review referencing a Product by `url` while the Product declares an
    `@id` would look like two entities, and rule 16 would report a false
    "carries zero Review nodes" (measured: `self-serving-rating-product-control`).

    The alias is applied ONLY when the node's identity is unambiguous, i.e. when
    exactly ONE node claims that identifier as its primary.  Two nodes that
    merely share a `url` therefore stay two entities: a `url` is a location, not
    an identifier, and collapsing on a shared url would merge two legitimately
    different rated entities and make rule 16 accuse a correct page.  That is
    measured -- it is the reason the rule ships with a must-not-fire control.
    """
    claims: "dict[tuple, set[tuple]]" = {}
    for node, _path, _anc in nodes:
        if not isinstance(node, dict):
            continue
        ids = _entity_identities(node, {})
        if not ids:
            continue
        primary = ids[0]
        for other in ids[1:]:
            claims.setdefault(other, set()).add(primary)
    alias: "dict[tuple, tuple]" = {}
    for ident, owners in claims.items():
        if len(owners) == 1:
            owner = next(iter(owners))
            if owner != ident:
                alias[ident] = owner
    return alias


def rating_entity_key(node: dict, path: str, ancestors: "tuple[str, ...]",
                      by_path: "dict[str, dict]",
                      index: "dict[tuple, tuple] | None" = None) -> tuple:
    """Which rated entity does this rating-bearing node describe? (rules 8/16)

    Returns a hashable key.  A route-local fallback -- ("path", <path>) or
    ("page",) -- is returned when the markup states no identity, so anonymous
    nodes never collide with each other by accident.
    """
    if isinstance(node, dict) and "itemReviewed" in node:
        target = node.get("itemReviewed")
        if isinstance(target, str):
            target = by_path.get(target)
        elif isinstance(target, dict) and not types_of(target):
            # {"@id": ...} pointer, not an inline entity
            rid = target.get("@id")
            target = by_path.get(rid) if isinstance(rid, str) else None
        ident = _entity_identities(target, by_path)[:1] if target is not None else []
        if ident:
            key = ident[0]
            return (index or {}).get(key, key)
        # An itemReviewed that does not resolve still NAMES what it is about.
        # Two ratings naming the same business are about the same business.
        raw = node.get("itemReviewed")
        if isinstance(raw, dict):
            name = raw.get("name")
            if isinstance(name, str) and name.strip():
                return ("itemReviewed", primary_type(raw) or "",
                        name.strip().lower())
    if ancestors:
        parent = by_path.get(ancestors[-1])
        ids = _entity_identities(parent, by_path) if parent is not None else []
        if ids:
            return (index or {}).get(ids[0], ids[0])
        # Anonymous container: group by the container's own position, which is
        # the pre-1.5.0 behaviour for this case and is the narrowest thing the
        # document actually supports.
        return ("path", ancestors[-1])
    return ("page",)


def is_anonymous_entity_key(key: tuple) -> bool:
    """True when a `rating_entity_key` states NO entity identity.

    These are the route-local fallbacks: a rating or review that belongs to no
    named entity.  Rule 16 uses this to tell "the page carries no reviews for
    this entity" (fire) from "the page carries reviews it cannot attribute to
    this entity" (inconclusive, stay silent).
    """
    return not isinstance(key, tuple) or not key or key[0] in ("page", "path")


def entity_key_label(key: tuple) -> str:
    """Readable rendering of a `rating_entity_key` for messages/evidence."""
    if not isinstance(key, tuple) or not key:
        return str(key)
    if key[0] == "page":
        return "the page itself"
    if key[0] == "path":
        return "%s (anonymous entity)" % (key[1],)
    if key[0] == "name":
        return "%s named %r" % (key[1] or "entity", key[2])
    if key[0] == "itemReviewed":
        return "itemReviewed %s named %r" % (key[1] or "entity", key[2])
    if key[0] == "frag":
        return "the node at %s" % (key[1],)
    return "%s" % (key[1],)


def is_reference_stub(node: dict) -> bool:
    """Is this node a JSON-LD *reference*, not an entity? (1.4.0, P0-B)

    A node whose only keys are `@id` / `@type` (or `@id` alone) is a pointer to
    a node defined elsewhere in the page graph -- `{"@type": "WebPage", "@id":
    "https://host/page"}` as the value of `mainEntityOfPage` is the canonical
    example.  JSON-LD semantics make it a reference; the graph walker had no
    concept of one, so `check_required_props` asserted `url`/`name` against the
    pointer and produced 17 unfixable `missing-required` errors on the mp
    surface (the properties exist on the node the `@id` resolves to).

    Required properties are properties OF AN ENTITY.  A pointer is not an
    entity, so no required-property finding is ever raised against one.
    Resolution is a different question, owned by rule 6 (`ref-unresolved`).
    """
    keys = set(node.keys()) - {"@context"}
    return "@id" in keys and keys <= {"@id", "@type"}


def position_of(path: str, ancestors: "tuple[str, ...]",
                by_path: "dict[str, dict]") -> "tuple[str | None, str | None]":
    """Return (parent @type, property) for a walked node.

    `ancestors` is the tuple of ancestor NODE paths produced by `walk_nodes`, so
    `ancestors[-1]` is the nearest enclosing @typed node; the segment(s) between
    that node and this one name the property the node hangs off.
    """
    parent_path = ancestors[-1] if ancestors else "$"
    parent = by_path.get(parent_path)
    parent_type = primary_type(parent) if isinstance(parent, dict) else None
    rest = path[len(parent_path):].lstrip(".") if path.startswith(parent_path) else ""
    segs = [re.sub(r"\[\d+\]$", "", s) for s in rest.split(".") if s]
    return parent_type, (segs[-1] if segs else None)


def positional_required(parent_type: "str | None", prop: "str | None",
                        child_type: str, global_required: "tuple[str, ...]") -> "tuple[str, ...]":
    """The required-property set for `child_type` in (parent_type, prop).

    Falls back to the global REQUIRED_PROPS tuple when the position declares no
    regime.  See POSITION_REQUIRED and `--list-positions`.
    """
    if not prop:
        return global_required
    for key in ((parent_type or "", prop), ("*", prop)):
        regime = POSITION_REQUIRED.get(key)
        if regime is not None and child_type in regime:
            return regime[child_type]
    return global_required


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
# Keys whose ABSENCE silently changes how strict the gate is (1.4.0, P1-C).
# A missing `report_only` used to default to False, which flips a committed
# report-only gate into `exit 1` as an INVISIBLE default: deleting one line
# from a config turns a reporting gate into a blocking one (measured on the mp
# gate: report_only removed -> exit 1 with 189 error-band findings), and
# nothing in the diff says so.  The same argument applies to `strict` (a missing
# `strict` means warn-band findings do not fail) and to `mode` (a missing `mode`
# silently means `dir`, i.e. every live-only rule is off).
#
# These are therefore REQUIRED in any `--config` file.  The CLI-without-config
# path (`sd-check.py --dir ...`) has no file to be explicit in, so it records
# the defaults it is running with as an explicit note in the report instead.
REQUIRED_GATE_KEYS = ("mode", "report_only", "strict")

# The full audit of `[gate]` keys whose absence changes what the gate does.
# Only the three above are hard errors; the rest are documented as deliberate
# defaults in the config reference (§A5.2).  This table exists so the list is
# data, not prose, and `--list-config-contract` prints it.
GATE_KEY_CONTRACT: "tuple[tuple[str, str, str], ...]" = (
    ("mode", "required", "absence silently selects `dir`, i.e. every live-only rule is off"),
    ("report_only", "required", "absence silently selects report_only=false, i.e. exit 1 on findings"),
    ("strict", "required", "absence silently selects strict=false, i.e. warn-band findings never fail"),
    ("surface", "checked", "absence is already exit 2 (`no surface configured`); PRESENCE yielding zero HTML artifacts is also exit 2 (1.5.0)"),
    ("policy", "default", "absence falls back to the sd-policy.toml next to the validator"),
    ("baseline", "default", "absence makes coverage / shape-digest / content-snapshot unable to fire; PRESENCE with no <path>/_index.json is exit 2 (1.5.0)"),
    ("coverage_manifest", "default", "absence makes coverage direction 2 (manifest -> baseline) inert"),
    ("allowed_hosts", "default", "absence makes rule 11 (url-host) inert unless the page has a <link rel=canonical>; recorded as an explicit skip note"),
    ("reference_allowlist", "default", "absence means off-host image/logo URLs are errors (E44)"),
    ("rules", "default", "absence means every rule for the mode runs"),
    ("bands", "default", "absence means each rule keeps its declared band"),
    ("markup_optional", "default", "absence means every walked route must carry JSON-LD"),
    ("zero_trace", "default", "absence makes brand-zerotrace inert"),
    ("foreign_brands", "default", "absence makes foreign-brand inert"),
    ("self_owned_entities", "default", "absence makes self-serving-rating inert"),
    ("site", "cosmetic", "label recorded in the report"),
)


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
        # The REVERSE zero-trace direction (rule 13r / foreign-brand): brand
        # strings and hostnames that belong to a DIFFERENT property and must
        # never appear in THIS repo's JSON-LD.  Config-driven and empty by
        # default, so it is inert for any repo that configures nothing.
        self.foreign_brands: "list[str]" = []
        # Rule 13s: names / @type values / hosts that identify THIS site's own
        # entity (Organization, LocalBusiness, ProfessionalService, Person,
        # WebSite).  Config-driven and empty by default, so a repo that names
        # nothing is never flagged -- the same inert-by-default convention as
        # `foreign_brands` above.
        self.self_owned_entities: "list[str]" = []
        # Routes that may legitimately carry NO JSON-LD (1.4.0).  Empty by
        # default, so every walked route is required to carry markup unless a
        # repo says otherwise; error-style routes are excluded structurally.
        self.markup_optional: "list[str]" = []
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
        # 1.4.0 (P1-C): the strictness keys must be PRESENT, so that strictness
        # can never be an invisible default.  See REQUIRED_GATE_KEYS.
        for key in REQUIRED_GATE_KEYS:
            if key not in gate:
                die("--config [gate] is missing the required key %r.  A missing "
                    "strictness key would silently change the exit-code contract, so "
                    "every --config must state it explicitly (set %s = %s)."
                    % (key, key,
                       "true" if key == "report_only" else
                       "false" if key == "strict" else '"dir"'))
        for key in ("report_only", "strict"):
            if not isinstance(gate[key], bool):
                die("--config [gate].%s = %r must be a TOML boolean (true/false), "
                    "not a string" % (key, gate[key]))
        g.mode = str(gate["mode"])
        g.site = str(gate.get("site", "unnamed-site"))
        g.surface = [str(s) for s in as_list(gate.get("surface"))]
        g.policy = gate.get("policy")
        g.baseline = gate.get("baseline")
        g.coverage_manifest = gate.get("coverage_manifest")
        g.report_only = bool(gate["report_only"])
        g.strict = bool(gate["strict"])
        g.allowed_hosts = [str(h).lower() for h in as_list(gate.get("allowed_hosts"))]
        g.zero_trace = [str(s) for s in as_list(gate.get("zero_trace"))]
        g.foreign_brands = [str(s) for s in as_list(gate.get("foreign_brands"))]
        g.self_owned_entities = [str(s) for s in as_list(gate.get("self_owned_entities"))]
        g.markup_optional = [str(s) for s in as_list(gate.get("markup_optional"))]
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
    def __init__(self, path: "str | None", updating: bool = False) -> None:
        self.path = path
        self.routes: "dict[str, dict]" = {}
        self.findings: "set[tuple[str, str, str]]" = set()
        self.first_seen: "dict[tuple[str, str, str], str]" = {}
        self.loaded = False
        if not path:
            return
        index = os.path.join(path, "_index.json")
        if not os.path.exists(index):
            # 1.5.0: CONFIGURED-BUT-MISSING is a config error, not a silent
            # no-op.  `[gate].baseline` is a STATED INTENT: "this surface is
            # compared against a recorded baseline".  A path that holds no
            # index makes that intent unmeetable, and the old behaviour was the
            # worst kind of quiet -- `loaded` stayed False, so rules
            # shape-digest / content-snapshot / coverage could not fire, AND the
            # skip note dropped its "(no [gate].baseline configured)" suffix
            # exactly BECAUSE the key was present.  A dead path therefore read
            # as "no baseline loaded" with no hint that one had been asked for.
            # Same class as the no-markup fix: a silent path where a stated
            # intent goes unmet.
            #
            # `--update-baseline` is the one exemption, and it is not a hole in
            # the rule: that invocation's stated intent is to WRITE the
            # baseline, so an absent index is its normal input, not a failure.
            if not updating:
                die("baseline is configured ([gate].baseline / --baseline = %r) but no "
                    "baseline index exists at %s. A configured baseline that cannot "
                    "load leaves shape-digest, content-snapshot and coverage unable to "
                    "fire. Fix the path, remove the key, or create it with "
                    "--update-baseline." % (path, index))
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
        # Rule 30 `no-markup` (1.4.0): non-empty JSON-LD blocks extracted per
        # route.  A route walked with zero of them is the failure mode this
        # whole gate exists to prevent, and it used to be a silent pass.
        self.route_blocks: "dict[str, int]" = {}
        # Routes where rule 11 had no host to bind to (no allowed_hosts and no
        # <link rel=canonical>).  Reported as one explicit skip note.
        self.host_binding_inert_routes: "list[str]" = []
        # 1.5.0: routes carrying ld+json inside an inert container
        # (<noscript> / <template>).  Not extracted -- reported as one explicit
        # skip note so "zero markup found" is never confused with "markup was
        # there but inert".
        self.inert_ld_routes: "dict[str, int]" = {}

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
            # 1.5.0: a CONFIGURED surface that yields zero HTML artifacts is a
            # config error, not a clean run.  Before this, an empty directory or
            # a glob matching nothing walked zero routes, reported
            # routes_checked=0, and printed "sd-check: OK" with exit 0 -- the
            # gate's greenest possible output for having read NOTHING.  The
            # consumer workflow's shell guard also exits 2 on this, which is why
            # an earlier report could claim the hole was closed; a direct
            # invocation, or any future caller, was still green.  The guard is
            # not the gate.
            #
            # "The surface key is ABSENT" stays its own, separate config error
            # (`no surface configured`, raised in main for dir mode) and live
            # mode legitimately has no surface list, so both are excluded here.
            if self.gate.surface:
                die("the configured surface(s) %s yielded ZERO HTML artifacts "
                    "(routes_checked would be 0). An empty directory or a glob that "
                    "matches no file is a configuration error, not a clean run: a gate "
                    "that read nothing must never report OK."
                    % ", ".join(repr(s) for s in self.gate.surface))
            self.rep.skip("no HTML artifacts found on the configured surface(s)")
        checked = 0
        for _entry, path in surfaces:
            rel = self.rel_for(path)
            if is_excluded_route(rel):
                continue
            route = derive_route_key(rel)
            self.routes_checked += 1
            checked += 1
            self.routes_seen.add(route)
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as fh:
                    html = fh.read()
            except OSError as exc:
                die("cannot read artifact %s: %s" % (path, exc))
            self.check_page(route, html, source=rel)
        if surfaces and not checked:
            # Artifacts existed, every one of them was an error-style route
            # (`/500`, `/404`).  Not a config error -- the surface is real -- but
            # it is a zero-coverage RUN, and that must be visible rather than
            # reading as a clean pass.
            self.rep.skip(
                "all %d HTML artifact(s) on the configured surface(s) were excluded "
                "as error-style routes, so 0 routes were actually checked"
                % len(surfaces))
        self.check_coverage()
        self.check_no_markup()
        if self.host_binding_inert_routes:
            # E-5, decided explicitly (1.4.0): an empty `allowed_hosts` does NOT
            # make rule 11 inert as long as the page carries a
            # `<link rel=canonical>` -- the canonical host is used as the binding
            # host.  Only a page with NEITHER is unchecked, and that state is
            # reported here rather than left silent.  It is a documented no-op,
            # not a config error, because a host-agnostic surface (a fixture, a
            # surface whose canonical host is not decided yet) is a legitimate
            # invocation; the point is that the inert state is now visible.
            self.rep.skip(
                "rule url-host: host binding was UNAVAILABLE on %d route(s) "
                "(no [gate].allowed_hosts and no <link rel=canonical>): %s%s -- "
                "identity URLs on those routes were not host-checked"
                % (len(self.host_binding_inert_routes),
                   ", ".join(sorted(self.host_binding_inert_routes)[:8]),
                   " ..." if len(self.host_binding_inert_routes) > 8 else ""))
        if not self.baseline.loaded:
            # Not an error (a first run has no baseline) but it silently
            # disables three rules; say so.  Since 1.5.0 the ONLY way to reach
            # this branch is "no baseline configured" -- a configured path that
            # holds no index is now a config error (exit 2) in `Baseline`, so a
            # reader can never again see this note while a baseline was asked
            # for.  The refusal above is what makes this note trustworthy.
            self.rep.skip(
                "no baseline loaded: rules shape-digest, content-snapshot and "
                "coverage cannot fire in this invocation"
                + ("" if self.gate.baseline else " (no [gate].baseline configured)"))
        if self.inert_ld_routes:
            # 1.5.0: inert ld+json is counted, never silently dropped.
            total = sum(self.inert_ld_routes.values())
            self.rep.skip(
                "rule block-parse/no-markup: %d ld+json block(s) inside <noscript> "
                "or <template> on %d route(s) were NOT extracted (a JS-enabled "
                "crawler does not render those containers, so the blocks are not "
                "live markup): %s%s"
                % (total, len(self.inert_ld_routes),
                   ", ".join("%s (%d)" % (r, n) for r, n in
                             sorted(self.inert_ld_routes.items())[:8]),
                   " ..." if len(self.inert_ld_routes) > 8 else ""))
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
        raw_blocks = [b for b in page.blocks if b.strip()]
        self.route_blocks[route] = len(raw_blocks)
        if page.ld_inert:
            # 1.5.0: say it out loud.  These blocks exist in the bytes and are
            # deliberately not counted as markup, so a route whose ONLY ld+json
            # is inert now reports both the skip and (via rule 30) no-markup.
            self.inert_ld_routes[route] = page.ld_inert
        if (self.gate.rule_enabled("url-host", self.mode)
                and not self.gate.binding_hosts() and not canonical):
            self.host_binding_inert_routes.append(route)

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
                # 1.5.0: a "recover the inner JSON" branch lived here and was
                # UNREACHABLE.  It could only run once `json.loads(raw)` had
                # raised, and its first statement called `json.loads(raw)` again
                # on the same immutable string, so it raised identically and
                # fell through to `ok = False`.  The case it was written for --
                # a block holding a JSON *string* that itself contains JSON --
                # never reaches this handler at all: `json.loads(raw)` SUCCEEDS
                # on a JSON string and the "payload is a JSON string, not an
                # object or array of objects" branch below reports it.  That
                # reachable half is the whole detection and is pinned by the
                # `payload-shape` and `payload-shape-double-encoded` fixtures.
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
        # 1.4.0: the ancestor PATHS are rewritten into the same `block[N]...`
        # namespace as `path`.  They used to keep their raw `$...` form, so
        # `by_path` lookups and `owner_path.startswith()` comparisons could
        # never match a node path (position_of depends on this).
        nodes: "list[tuple[dict, str, tuple[str, ...]]]" = []
        for idx, payload in parsed:
            for node, path, anc in walk_nodes(payload, "$"):
                pref = "block[%d]%s" % (idx, path[1:])
                nodes.append((node, pref,
                              tuple("block[%d]%s" % (idx, a[1:]) for a in anc)))

        self.check_type_casing(route, nodes)
        self.check_id_unique(route, nodes)
        self.check_references(route, nodes)
        self.check_duplicate_types(route, nodes)
        self.check_aggregate_rating(route, nodes)
        self.check_faqpage(route, nodes)
        self.check_urls(route, nodes, canonical)
        self.check_canonical_align(route, nodes, canonical)
        self.check_zero_trace(route, nodes)
        self.check_foreign_brand(route, nodes)
        self.check_self_serving_rating(route, nodes)
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
        """At most one AggregateRating per ENTITY per page (1.5.0).

        The count used to be keyed on the WALK PATH of the parent node, which
        is a property of the document, not of the rated entity: the same entity
        written into two `<script>` blocks, or once inside `@graph`, produced
        two different owner paths and the rule stayed silent.  Measured on the
        captured www.maxpetrusenko.com/ homepage -- three AggregateRating nodes
        for one business (17 / 6 / 26 reviews), rule silent.

        The key is now the rated entity's identity (see `rating_entity_key`).
        Nodes whose identity the markup does not state keep the old
        path-scoped behaviour: an anonymous container is still "one entity" for
        this rule, so nothing that fired before stops firing.
        """
        by_path = {p: n for n, p, _a in nodes}
        index = identity_index(nodes)
        by_owner: "dict[tuple, list[str]]" = {}
        for node, path, ancestors in nodes:
            if "AggregateRating" not in types_of(node):
                continue
            by_owner.setdefault(
                rating_entity_key(node, path, ancestors, by_path, index), []).append(path)
        for key, paths in sorted(by_owner.items(), key=lambda kv: str(kv[0])):
            if len(paths) > 1:
                self.rep.add(
                    "multi-aggregaterating", route, paths[0],
                    "%s carries %d AggregateRating nodes (at most one per entity "
                    "per page)" % (entity_key_label(key), len(paths)),
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

    # ------------------------------------------------------------- rule 13r
    def check_foreign_brand(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        """The REVERSE zero-trace direction: a foreign brand must not appear here.

        Rule 13 (``brand-zerotrace``) asserts that ONE property's declared
        tokens never leak into another property's markup.  This rule is the
        inverse and is the direction that was previously uncovered: it asserts
        that a hostname / brand string belonging to a DIFFERENT property never
        appears in THIS repo's JSON-LD -- e.g. a ``maxpetrusenko.com`` surface
        must not carry ``tantrastudio.app`` markup.

        Static string scan over the parsed JSON-LD graph only.  Two honest
        limits, both stated here on purpose:

          * it cannot see that a hostname RESOLVES into another property --
            that is a live-host check, a separate job;
          * it cannot see a brand string that appears only in VISIBLE HTML and
            not in the JSON-LD.  That is deliberate (the E43 lesson): a
            finding must be backed by live markup, so the scan reads parsed
            payloads, never raw page text.

        Config-driven via ``[gate].foreign_brands``; empty by default and
        therefore inert for any repo that configures no foreign brands.
        """
        if not self.gate.foreign_brands:
            return
        for node, path, _a in nodes:
            for value, vpath in walk_values(node, path):
                if not isinstance(value, str):
                    continue
                for token in self.gate.foreign_brands:
                    if token and token.lower() in value.lower():
                        self.rep.add(
                            "foreign-brand", route, vpath,
                            "foreign-brand token %r (belongs to another property) "
                            "appears in this page's JSON-LD" % token,
                            evidence=trunc(value))

    # ------------------------------------------------------------ rule 13s
    def _self_owned(self, node: dict) -> bool:
        """Is ``node`` an entity THIS site declares as its own?

        Config-driven by ``[gate].self_owned_entities``.  A token matches,
        case-insensitively and EXACTLY (never as a substring -- a substring
        match on a brand name would fire on every page that merely mentions it),
        against one of:

          * the node's ``@type`` values ....... ``"LocalBusiness"``
          * ``name`` / ``legalName`` / ``alternateName`` .. ``"Max Petrusenko"``
          * the host of ``url`` or ``@id`` .... ``"maxpetrusenko.com"``

        A bare @type token is the blunt instrument: ``["Organization"]`` asserts
        that EVERY Organization on the surface is the site's own.  A surface
        that also reviews third-party organizations must therefore name its own
        entity (name or host) instead of listing the type.  An empty list is
        never a match, which is what makes the rule inert by default.
        """
        tokens = {t.strip().lower() for t in self.gate.self_owned_entities if t and t.strip()}
        if not tokens:
            return False
        if any(t.lower() in tokens for t in types_of(node)):
            return True
        for key in ("name", "legalName", "alternateName"):
            for value in as_list(node.get(key)):
                if isinstance(value, str) and value.strip().lower() in tokens:
                    return True
        for key in ("url", "@id"):
            value = node.get(key)
            if isinstance(value, str):
                host = urlparse(value).netloc.lower()
                if host and host in tokens:
                    return True
        return False

    def check_self_serving_rating(self, route: str,
                                  nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        """Rule 13s: a page's own entity must not carry its own rating (band E).

        The durable half of the maxpetrusenko.com cleanup: site-level edits
        remove today's self-serving rating markup, this rule stops the next one.

        Google's review-snippet documentation (fetched 2026-09-12; page dated
        "Last updated 2026-09-08 UTC", https://developers.google.com/search/
        docs/appearance/structured-data/review-snippet) says, verbatim:

          "If the entity that's being reviewed controls the reviews about
          itself, their pages that use LocalBusiness or any other type of
          Organization structured data are ineligible for star review feature."

          "Ratings must be sourced directly from users. Don't rely on human
          editors to create, curate, or compile ratings information for local
          businesses."

        and lists `Organization` / `Local business` as reviewed-item types only
        "for sites that capture reviews about other organizations" / "other
        local businesses" respectively.  See `SELF_SERVING_INELIGIBLE_TYPES` for
        the type table and for why the supported-product types are excluded.

        Two forms are covered:

          * form 1 -- the entity node itself carries ``aggregateRating`` or
            ``review``.  Google's own wording is why a nested rating counts as a
            self-review: "if the aggregate rating is nested into another
            schema.org type using the aggregateRating property, omit the
            itemReviewed property (we assume the parent item is the reviewed
            item)".
          * form 2 -- an explicit ``Review`` / ``AggregateRating`` node whose
            ``itemReviewed`` RESOLVES (inline object, or ``@id`` reference into
            this page graph) to an ineligible, self-owned entity.

        A node only fires when it is BOTH ineligible by type AND self-owned per
        ``[gate].self_owned_entities``.  Empty config -> no findings at all.

        Honest limits, stated on purpose:

          * AMBIGUOUS itemReviewed IS SILENT.  A bare-string ``itemReviewed``
            (``"itemReviewed": "Fixture Co"``) that does not resolve to a node
            in this page graph is not fireable, because eligibility depends on
            the reviewed item's TYPE and a bare string carries none.  This is a
            deliberate under-fire, not an oversight: under-firing costs a missed
            warning, over-firing costs a false accusation on a page that is
            doing exactly what Google licenses.
          * TYPE-BLIND FORMS ARE OUT OF SCOPE.  A self-review injected purely by
            an embedded third-party widget (Google Business reviews, a Facebook
            reviews iframe) leaves no JSON-LD trace on the page, so this static
            scan cannot see it.  Google's guideline covers the widget case; this
            rule covers the markup case.
          * "CONTROLS THE REVIEWS" IS APPROXIMATED BY CONFIG.  The rule trusts
            ``self_owned_entities`` to say which entity is the site's own; it
            cannot infer ownership from the graph, and it does not try to judge
            whether the ratings were genuinely user-sourced (that is Google's
            call, and the 2026-07-24 manual-action language is the reason the
            policy row is cited rather than re-derived here).
          * SUBTYPES ARE NOT EXPANDED.  Only the five types in
            ``SELF_SERVING_INELIGIBLE_TYPES`` fire; ``Service``, ``Place`` and
            other Organization-adjacent types are left silent because the
            documentation does not name them.

        This rule overlaps rule 17 (``self-serving-review``, band W) but is not
        a duplicate: rule 17 fires on ANY ``review`` under a
        LocalBusiness/Organization without asking whether the entity is the
        site's own, at warn band, and never covers ``aggregateRating``.  This
        rule is the band-E, type-aware, self-ownership-keyed version.
        """
        if not self.gate.self_owned_entities:
            return  # inert by default: no config, no findings

        by_id: "dict[str, dict]" = {}
        for node, _p, _a in nodes:
            nid = node.get("@id")
            if isinstance(nid, str) and nid not in by_id:
                by_id[nid] = node

        def resolve(value: Any) -> "dict | None":
            if isinstance(value, dict):
                if types_of(value):
                    return value
                rid = value.get("@id")
                return by_id.get(rid) if isinstance(rid, str) else None
            if isinstance(value, str):
                # A bare string is an @id lookup only; when it matches no node
                # the reviewed TYPE is unknown, so the rule stays silent.
                return by_id.get(value)
            return None

        for node, path, _a in nodes:
            tset = set(types_of(node))
            nid = node.get("@id") if isinstance(node.get("@id"), str) else None

            # -- form 1: the entity node carries its own evaluation ----------
            ineligible = tset & SELF_SERVING_INELIGIBLE_TYPES
            if ineligible and self._self_owned(node):
                label = ",".join(sorted(ineligible))
                for prop in RATING_PROPS:
                    if prop in node:
                        self.rep.add(
                            "self-serving-rating", route, "%s.%s" % (path, prop),
                            "%s is this site's own entity and carries its own %s; a page "
                            "whose reviewed entity it controls is ineligible for the star "
                            "review feature (rule 13s form 1)" % (label, prop),
                            evidence=trunc(node.get(prop)), node_id=nid)

            # -- form 2: an explicit Review/AggregateRating about an entity --
            if "itemReviewed" not in node:
                continue
            target = resolve(node.get("itemReviewed"))
            if target is None:
                continue  # ambiguous or unresolvable -> silent (see docstring)
            ttypes = set(types_of(target))
            hit = ttypes & SELF_SERVING_INELIGIBLE_TYPES
            if not hit:
                continue  # Product/Course/SoftwareApplication/etc: licensed
            if not self._self_owned(target):
                continue  # a review OF someone else is the licensed case
            self.rep.add(
                "self-serving-rating", route, "%s.itemReviewed" % path,
                "Review/AggregateRating is about %s, which this site declares as its own "
                "entity; a self-serving review is ineligible for the star review feature "
                "(rule 13s form 2)" % ",".join(sorted(hit)),
                evidence=trunc(target),
                node_id=target.get("@id") if isinstance(target.get("@id"), str) else nid)

    # ---------------------------------------------------- required/recommended
    def check_required_props(self, route: str, nodes: "list[tuple[dict, str, tuple[str, ...]]]") -> None:
        """Rules 20/21: required (E) and recommended (W) properties per node.

        1.4.0 (P0-B).  Two corrections, both measured against the real mp
        surface, together removing ~109 of 112 error-band false positives:

          * REFERENCE STUBS ARE NOT ENTITIES.  ``mainEntityOfPage: {"@type":
            "WebPage", "@id": <canonical url>}`` is a JSON-LD reference; the
            walker treated it as a WebPage and demanded ``url``/``name`` on the
            pointer.  See `is_reference_stub`.
          * REQUIRED SETS ARE POSITION-AWARE.  A `Place` used as `areaServed`,
            an `Organization` used as `publisher`, an `Offer` used inside an
            `OfferCatalog` and a `Service` used as `itemOffered` get the
            properties their POSITION requires, not the full top-level set.
            See POSITION_REQUIRED / `positional_required` and
            `--list-positions`.

        The recommended list is deliberately still the global one: this change
        is scoped to the error band.
        """
        by_path = {p: n for n, p, _a in nodes}
        for node, path, ancestors in nodes:
            if is_reference_stub(node):
                # A pointer is not an entity.  Required properties belong to the
                # node the @id resolves to; resolution itself is rule 6's job.
                continue
            parent_type, prop = position_of(path, ancestors, by_path)
            for t in types_of(node):
                spec = REQUIRED_PROPS.get(t)
                if not spec:
                    continue
                required, recommended = spec
                required = positional_required(parent_type, prop, t, required)
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
        """Rule 14: placeholder tokens, matched as WHOLE SEGMENTS (1.4.0, P1-E).

        The old matcher was a case-insensitive SUBSTRING scan, so any SKU,
        price, timestamp or hash containing `0000000` was a hard error and
        anything ending in `example.com` matched.  Two mechanisms now:

          * `PLACEHOLDER_RES` -- every token, delimited on both sides by a
            non-alphanumeric.  `example.com` still fires in a URL;
            `notexample.com` and `10000000` do not.
          * `PLACEHOLDER_ZERO_ID_RE` -- the structural `/users/0{4,}` form,
            which is what the bare `0000000` token was standing in for.
        """
        for idx, payload in parsed:
            for value, vpath in walk_values(payload, "block[%d]$" % idx):
                if not isinstance(value, str):
                    continue
                hit = None
                for token, rx in PLACEHOLDER_RES:
                    if rx.search(value):
                        hit = token
                        break
                if hit is None and PLACEHOLDER_XXX_RE.search(value):
                    hit = "XXX"
                if hit:
                    self.rep.add("placeholder-text", route, vpath,
                                 "placeholder string %r in a JSON-LD value (whole-segment "
                                 "match)" % hit,
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
        """Rating / review-count consistency, evaluated PER ENTITY (1.5.0).

        The 1.4.x version of this rule had two defects that together made it
        silent exactly where it mattered:

          * it compared every AggregateRating's `reviewCount` against the
            PAGE-WIDE Review-node count, so it emitted the same finding for two
            ratings of ONE entity (a real inconsistency) and for two ratings of
            TWO unrelated entities (which the star review feature licenses);
            measured: a fixture with two entities rating themselves 17 and 6
            reviews produced byte-identical findings to the same counts on one
            entity.  A finding that does not distinguish the violation from the
            licensed case carries no information.
          * it never compared the ratings to EACH OTHER.  On the captured
            www.maxpetrusenko.com/ homepage one business is rated three times --
            `ratingValue` 4.9 in all three, reviewCount 17 / 6 / 26 -- and the
            only reason the rule reported anything was that the page happened to
            carry zero Review nodes.

        Both are now entity-scoped.  A rating-bearing node is keyed by the
        identity of the entity it describes (`rating_entity_key`), and:

          * `reviewCount` / `ratingCount` is checked against the Review nodes of
            THAT entity, not of the page;
          * `ratingValue` is checked against the mean of THAT entity's Review
            ratings;
          * two or more AggregateRatings for the SAME entity on one route must
            AGREE.  A divergent `reviewCount` or `ratingValue` between them is
            its own finding, named as such.

        Two different entities with different counts stay silent -- that is the
        licensed case, and it is pinned by a must-not-fire fixture.
        """
        by_path = {p: n for n, p, _a in nodes}
        index = identity_index(nodes)

        aggregates: "dict[tuple, list[tuple[dict, str, Any, Any, Any, Any, Any]]]" = {}
        reviews: "dict[tuple, list[tuple[str, Any]]]" = {}

        for node, path, ancestors in nodes:
            tset = set(types_of(node))
            if "AggregateRating" in tset:
                key = rating_entity_key(node, path, ancestors, by_path, index)
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
                count = node.get("reviewCount", node.get("ratingCount"))
                try:
                    count_i = int(count) if count is not None else None
                except (TypeError, ValueError):
                    count_i = None
                aggregates.setdefault(key, []).append(
                    (node, path, rating, rating_f, best, best_f, count_i))
            if "Review" in tset:
                key = rating_entity_key(node, path, ancestors, by_path, index)
                rr = node.get("reviewRating")
                value = None
                if isinstance(rr, dict):
                    value = rr.get("ratingValue")
                elif rr is not None:
                    value = rr
                reviews.setdefault(key, []).append((path, value))

        for key in sorted(aggregates, key=str):
            items = aggregates[key]
            mine = reviews.get(key, [])
            vals = []
            for _p, v in mine:
                try:
                    vals.append(float(v))
                except (TypeError, ValueError):
                    pass
            # Reviews the page emits as free-standing nodes (no container, no
            # `itemReviewed`) cannot be attributed to a named entity from the
            # bytes.  When such a review exists, an entity's review-count check
            # is INCONCLUSIVE and stays silent: the markup for those reviews
            # does exist on the page, so "carries zero Review nodes" would be a
            # false accusation.  Only when the page carries NO reviews at all
            # (nothing here and nothing floating) is the count unusable.
            # Measured: this is what keeps the self-serving-review controls --
            # a page with one free-standing Review and one rated entity --
            # silent, as they were before 1.5.0.
            floating = [r for k, bucket in reviews.items()
                        if is_anonymous_entity_key(k) for r in bucket]

            for node, path, rating, rating_f, best, best_f, count_i in items:
                if rating_f is not None and not (0.0 <= rating_f <= best_f):
                    self.rep.add("rating-consistency", route, "%s.ratingValue" % path,
                                 "ratingValue %s is outside [0, bestRating=%s]" % (rating, best),
                                 evidence=trunc(node))
                if mine or not floating:
                    if count_i is not None and count_i > 0 and not mine:
                        self.rep.add(
                            "rating-consistency", route, "%s.reviewCount" % path,
                            "AggregateRating claims %d reviews but %s carries zero Review nodes"
                            % (count_i, entity_key_label(key)), evidence=trunc(node))
                    elif count_i is not None and mine and count_i != len(mine):
                        self.rep.add(
                            "rating-consistency", route, "%s.reviewCount" % path,
                            "AggregateRating reviewCount=%d but %s carries %d Review node(s)"
                            % (count_i, entity_key_label(key), len(mine)), evidence=trunc(node))
                if rating_f is not None and vals:
                    mean = sum(vals) / len(vals)
                    if abs(mean - rating_f) > RATING_EPS:
                        self.rep.add(
                            "rating-consistency", route, "%s.ratingValue" % path,
                            "AggregateRating ratingValue=%s but the mean of %d Review node(s) "
                            "on %s is %.2f"
                            % (rating, len(vals), entity_key_label(key), mean),
                            evidence=trunc(node))

            # ---- NEW (1.5.0): consistency ACROSS the route's blocks --------
            if len(items) > 1:
                counts = sorted({c for _n, _p, _r, _rf, _b, _bf, c in items
                                 if c is not None})
                if len(counts) > 1:
                    self.rep.add(
                        "rating-consistency", route, "%s.reviewCount" % items[0][1],
                        "%s carries %d AggregateRating nodes on this route with "
                        "conflicting reviewCount values (%s); one entity cannot have "
                        "different review totals on one page"
                        % (entity_key_label(key), len(items),
                           ", ".join(str(c) for c in counts)),
                        evidence=", ".join(
                            "%s: reviewCount=%s" % (p, c if c is not None else "-")
                            for _n, p, _r, _rf, _b, _bf, c in items))
                ratings = sorted({round(rf, 6) for _n, _p, _r, rf, _b, _bf, _c in items
                                  if rf is not None})
                if len(ratings) > 1:
                    self.rep.add(
                        "rating-consistency", route, "%s.ratingValue" % items[0][1],
                        "%s carries %d AggregateRating nodes on this route with "
                        "conflicting ratingValue values (%s); one entity cannot have "
                        "different aggregate ratings on one page"
                        % (entity_key_label(key), len(items),
                           ", ".join(str(r) for r in ratings)),
                        evidence=", ".join(
                            "%s: ratingValue=%s" % (p, r if r is not None else "-")
                            for _n, p, r, _rf, _b, _bf, _c in items))

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
        """Rule 19: date sanity (1.4.0).

        P0-B mechanism 3.  The rule used to apply `today + 1 day` to EVERY
        property in DATE_PROPS, which made a FUTURE SCHEDULED EVENT an error
        (both of mp's `date-sanity` findings were `/mindfold/events`
        `startDate`/`endDate` in the future).  A scheduled event in the future
        is the normal case, not a defect.

        Semantics now, split by what the date MEANS:

          * any DATE_PROPS value must be ISO 8601 / parseable and not a
            placeholder -> E;
          * the year must be plausible (>= 1990, <= today + 10y) -> E.  This is
            what catches a garbage/typo'd year instead of the future horizon;
          * `datePublished` / `dateModified` / `dateCreated` / `uploadDate` may
            not be more than a day in the future -> E (unchanged);
          * `startDate` / `endDate` / `validFrom` / `expires` have NO future
            horizon.  Instead the same node's interval pair must be ordered:
            `startDate` after `endDate`, or `expires` before `validFrom` -> E;
          * `datePublished` after `dateModified` -> E (unchanged);
          * `dateModified` older than 24 months -> W (unchanged).
        """
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
                    if not (MIN_PLAUSIBLE_YEAR <= d.year <= MAX_PLAUSIBLE_YEAR):
                        self.rep.add(
                            "date-sanity", route, vpath,
                            "%s=%s has an implausible year (outside %d..%d); a date "
                            "outside that range is a typo or a placeholder"
                            % (prop, value, MIN_PLAUSIBLE_YEAR, MAX_PLAUSIBLE_YEAR),
                            evidence=value)
                    if prop in FUTURE_HORIZON_PROPS and d > horizon:
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
            # interval ordering: a future start is correct, an INVERTED pair is not
            for start_prop, end_prop in INTERVAL_PAIRS:
                start, end = parsed_dates.get(start_prop), parsed_dates.get(end_prop)
                if start and end and start > end:
                    self.rep.add(
                        "date-sanity", route, "%s.%s" % (path, start_prop),
                        "%s %s is after %s %s on the same node: the interval is "
                        "inverted (this is the error; a future date is not)"
                        % (start_prop, start.isoformat(), end_prop, end.isoformat()),
                        evidence="%s=%s %s=%s" % (start_prop, start, end_prop, end))

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
        """The per-route baseline record.

        1.4.1 SPLIT -- and why it matters.

        `required_present` is derived from REQUIRED_PROPS, i.e. from the BAND
        TABLE, not from the markup.  It was part of the shape-digest hash
        material, which made a POLICY edit indistinguishable from a MARKUP
        regression: recalibrating a single band (1.4.1) changed the stored
        `required_present` map for every Organization / Article / WebPage /
        PostalAddress node, so every baselined route re-fired at E.  Measured on
        the tantrastudio surface: 0 -> 104 error-band `shape-digest` findings
        from a change that touched no page on that site.  That is the
        gate-gets-muted failure mode this whole round exists to remove.

        So: `required_present` is still RECORDED (the baseline files keep it,
        and consumer analysis greps `shape.required_present` to answer "does
        this route carry property X?"), but it is no longer HASHED.  The hash
        covers what the markup is: `types`, `ids`, `values`, `canonical`.

        Nothing is lost.  A required property disappearing from the markup is
        already an error-band finding in its own right -- rule 20
        (`missing-required`) reports it, per property, with a better message
        than "the digest moved".  The digest's job is to catch a change to the
        SHAPE of the graph, and it still does: adding/removing a node or a type,
        changing an @id, a rating value or the canonical URL all still fire.
        """
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
        # HASHED: the markup's shape.  NOT hashed: `required_present`, which is
        # the policy table's opinion about that markup (see the docstring).
        shape_material = {
            "types": sorted(types),
            "ids": sorted(ids),
            "values": {k: values[k] for k in sorted(values)},
            "canonical": canonical,
        }
        return {
            "route": route,
            "shape": {
                "types": shape_material["types"],
                "ids": shape_material["ids"],
                "required_present": {k: sorted(v) for k, v in sorted(required_present.items())},
                "values": shape_material["values"],
                "canonical": canonical,
            },
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

    # -------------------------------------------------------------- rule 30
    def check_no_markup(self) -> None:
        """Rule 30 / `no-markup` (band E, 1.4.0): a walked route with no JSON-LD.

        THE defect this gate exists for.  Before 1.4.0 the extractor returned
        before any rule ran when a page carried no ``application/ld+json``, and
        ``coverage`` only tracked whether a route was WALKED -- never whether it
        carried markup.  Proven against the real mp gate: ``/tech`` with its 7
        blocks produced 61 findings; the same route with the blocks deleted
        produced 0 findings and exit 0.  Deleting a page's structured data made
        the gate *cleaner*.

        Fires for every route that was walked and yielded zero non-empty
        JSON-LD blocks, EXCEPT:

          * routes excluded structurally by ``is_excluded_route`` (they are
            never walked) and error-style routes (``is_error_style_route``) --
            a 404/500 page has no structured data and is not content;
          * routes matched by ``[gate].markup_optional`` (empty by default),
            the declared allowlist for a route that is deliberately
            markup-free.

        Deliberate scope decision: the test is "this route was walked and
        carries no markup", NOT "this route is in the coverage manifest".  A
        manifest-only test would let a manifest omission hide a markup-less
        route, which is the same silent-pass class this rule removes.  The
        manifest state is recorded in the finding's evidence instead.  A route
        whose block exists but does not PARSE is not this rule's business --
        `block-parse` (band E) owns it.
        """
        if not self.gate.rule_enabled("no-markup", self.mode):
            return
        for route in sorted(self.route_blocks):
            if self.route_blocks[route] != 0:
                continue
            if is_error_style_route(route):
                continue
            pat = route_matches_any(route, self.gate.markup_optional)
            if pat:
                self.rep.note("no-markup: route %s carries no markup and is declared "
                              "markup_optional (pattern %r); not a finding"
                              % (route, pat))
                continue
            expected = route in self.routes_expected
            self.rep.add(
                "no-markup", route, "$",
                "route carries NO JSON-LD: the page was walked and yielded zero "
                "application/ld+json blocks, so no structured-data rule could run "
                "against it (%s)"
                % ("route IS in the expected-route set" if expected
                   else "route is NOT in the expected-route set"),
                evidence="blocks=0 expected=%s" % expected)

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
        # 1.4.0 (P1-F): `--report-only` may NOT change a finding's BAND.  It is
        # an exit-code switch ("report but do not fail"), and downgrading the
        # E-band `coverage` rule to W in exactly the configuration both consumer
        # gates run made the summary understate severity and hid the structural
        # safety net.  The band is now the declared band in every mode, so
        # `summary.error` is a truthful "what would have been E".
        band_override = self.gate.band_for("coverage")
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
        # 1.4.0: the report states its own strictness, so a reader can tell a
        # report-only run from a blocking one without reading the config, and
        # `summary.error` is the band-resolved "what would have been E".
        "report_only": gate.report_only,
        "strict": gate.strict,
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
    w("sd-check: site=%s mode=%s surface=%s policy=%s vocab=%s report_only=%s strict=%s\n"
      % (report["site"], report["mode"], report["surface"],
         report["policy_version"], report["vocab_version"],
         report.get("report_only"), report.get("strict")))
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
    p.add_argument("--list-positions", action="store_true",
                   help="print the position-aware required-property table and exit")
    p.add_argument("--list-config-contract", action="store_true",
                   help="print which [gate] keys are required vs defaulted and exit")
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

    if args.list_config_contract:
        print("[gate] key contract (sd-check %s)" % VALIDATOR_VERSION)
        for key, kind, why in GATE_KEY_CONTRACT:
            print("%-22s %-9s %s" % (key, kind, why))
        return 0

    if args.list_positions:
        print("position-aware required properties (sd-check %s)" % VALIDATOR_VERSION)
        print("lookup: (parent @type, property) then ('*', property), else the")
        print("global REQUIRED_PROPS row.  () means 'this position requires nothing'.")
        print("")
        print("%-20s %-18s %-24s %s" % ("PARENT @type", "PROPERTY", "CHILD @type", "REQUIRED"))
        for (parent, prop) in sorted(POSITION_REQUIRED):
            regime = POSITION_REQUIRED[(parent, prop)]
            for child in sorted(regime):
                req = regime[child]
                print("%-20s %-18s %-24s %s"
                      % (parent, prop, child, ", ".join(req) if req else "(none)"))
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
            # 1.4.0 (P1-D): this used to `return 0` unconditionally, so a CI
            # step of `sd-check.py --validate-policy` printed FAIL and PASSED.
            # The exit codes now mirror what the blocking run does with the same
            # defects:
            #   unresolvable type / uncited entry -> exit 2 (on a normal run
            #     these are `die()` -> "the gate broke");
            #   stale citation -> exit 1 (on a normal run this is a W finding,
            #     i.e. "the site/policy needs work", never "the gate broke").
            if bad or missing:
                print("")
                print("validate-policy: FAIL -> exit 2 "
                      "(unresolvable types: %d; uncited entries: %d)"
                      % (len(bad), len(missing)))
                return 2
            if stale:
                print("")
                print("validate-policy: FAIL (stale citations: %d) -> exit 1" % len(stale))
                return 1
            print("")
            print("validate-policy: PASS -> exit 0")
            return 0

        if not gate.surface and mode == "dir":
            die("no surface configured: pass --dir or set [gate].surface in --config")

        # ---- baseline ----------------------------------------------------
        baseline_path = args.baseline or gate.resolve(gate.baseline)
        baseline = Baseline(baseline_path, updating=args.update_baseline)

        # ---- run ---------------------------------------------------------
        root = gate.resolve(gate.surface[0]) if gate.surface else os.getcwd()
        if root and os.path.isfile(root):
            root = os.path.dirname(root)
        root = root or os.getcwd()
        validator = Validator(gate, policy, baseline, mode, root)
        if not args.config:
            # 1.4.0 (P1-C): the REQUIRED_GATE_KEYS rule has no file to be
            # explicit in on the CLI-only path, so state the effective
            # strictness in the report instead of leaving it implicit.
            validator.rep.skip(
                "no --config: CLI defaults in force (mode=%s report_only=%s strict=%s "
                "allowed_hosts=%s rules=%s) -- no config file pins this run's strictness"
                % (mode, gate.report_only, gate.strict,
                   gate.allowed_hosts or "[]", gate.rules or "all"))

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
