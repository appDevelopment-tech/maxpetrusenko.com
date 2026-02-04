# AI-First SEO & GEO Implementation Checklist

For: maxpetrusenko.com (Next.js app in /nextjs)
Last Updated: 2026-02-04

---

## PHASE 0 — IDENTITY & POSITIONING

- [x] Canonical name and focus appear in page titles and descriptions
- [x] Add a compact "entity card" block on the homepage (who/what/where/offer)
- [ ] Align external bios (LinkedIn, GitHub, X) with the same positioning

---

## PHASE 1 — DISCOVERY & CRAWLABILITY

- [x] `robots.txt` at site root
- [x] `sitemap.xml` at site root
- [x] `llms.txt` at site root
- [x] Noindex duplicate `links/index.html` (N/A for Next.js routes)
- [x] Mindfold canonical set to https://www.mindfoldsanctuary.com/ (subdomain will 301 later)
- [x] Atelier canonical set to https://atelier.maxpetrusenko.com/
- [x] Subdomain/site `robots.txt`, `sitemap.xml`, and `llms.txt` added for Mindfold + Atelier
- [x] Blog now uses local authored routes as primary (`/tech/articles/*`, `/spirituality/blog/*`) with Medium archive fallback
- [x] `/tech/articles` hub route added (resolves breadcrumb target and strengthens internal links)
- [x] Sitemap mismatch fixed for missing `/tech/articles/seo-is-dead` and `/tech/articles/generative-engine-optimization-geo`
- [x] `/spirituality/articles` hub added with linked long-form pages
- [ ] Main `robots.txt` blocks `/atelier/` and `/mindfold/` path duplicates

---

## PHASE 2 — ON-PAGE METADATA & CANONICALS

- [x] Canonical tags across all primary pages
- [x] OG + Twitter metadata on all primary pages
- [x] Favicon set across primary pages
- [x] Replace favicon-only OG image with existing share images
- [ ] Add a lightweight logo/brand image for structured data `image` fields

---

## PHASE 3 — STRUCTURED DATA (AI + SEARCH)

- [x] `Person` + `WebSite` on core pages
- [x] `ProfessionalService` for tech services
- [x] `ProfessionalService` for somatic services
- [x] `LocalBusiness` for Presence Atelier (Ubud)
- [x] `Organization` for Mindfold Sanctuary
- [ ] `FAQPage` schema for spirituality + mindfold FAQ sections (spirituality done; mindfold pending)
- [x] `Event` schema for Mindfold (rolling quarterly dates; update when fixed dates are published)

---

## PHASE 4 — CONTENT DEPTH & EXTRACTABILITY

- [x] Add 3-5 tech case studies with explicit outcomes (metrics)
- [x] Add 2-3 tech testimonials with names/roles (or anonymized)
- [x] Add high-intent tech content pages (OpenClaw installs, GEO framework, SEO vs AEO)
- [ ] Add a concise "services overview" section with bullet facts on `tech.html` and `spirituality.html`
- [ ] Add an explicit GEO block for current location + service area

---

## PHASE 5 — GEO SIGNALS

- [x] Ubud location referenced on somatic/atelier pages
- [ ] Add a consistent location banner or footer line on all pages
- [ ] Add `areaServed` and `address` to a dedicated GEO section on the homepage

---

## PHASE 6 — AI FEEDBACK LOOP

Monthly (1-2 hours):
- [ ] Query: "Who is Max Petrusenko?"
- [ ] Query: "Somatic practitioner in Ubud" and "Product builder for creators"
- [ ] Capture citations and update the fact blocks accordingly
- [x] Add pre-deploy verification command (`npm run verify:predeploy`)
- [x] Remove hidden keyword stuffing blocks from service pages (keep visible, evidence-based content only)
- [x] Align AI trust-signal claims with published testimonial counts

---

## Progress Summary

| Area | Status |
| --- | --- |
| Crawlability | ✅ Complete (main + subdomains; blog + spirituality hubs linked) |
| Metadata | ✅ Complete |
| Structured Data | ✅ Core schemas in place |
| Content Depth | ✅ Outcomes/testimonials + high-intent guides |
| GEO | ✅ Strong baseline; no hidden keyword stuffing |

**Overall: ~86% complete**

---

## Website Review & Rating (Current)

Overall Rating: **8.4/10**

Breakdown:
- Technical discovery (robots/sitemap/llms): 9/10
- Metadata & canonicalization: 8/10
- Structured data: 8/10
- Content depth & evidence: 8/10
- GEO clarity: 7/10

---

## Next Quick Wins

1. Add `FAQPage` schema for Mindfold sections
2. Replace sitemap-wide `lastModified: new Date()` with per-page timestamps
3. Add a dedicated 1200x630 OG image asset per site (optional hardening)
