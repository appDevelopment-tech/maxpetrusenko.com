# Oneshot: UI Refresh — "Kinetic Precision" across all pages

You are applying the approved "Kinetic Precision" design direction to `maxpetrusenko.com`.

## Context

This is a Next.js app in `nextjs/`, deployed to Cloudflare Pages. Light mode only. The design was explored in `nextjs/app/explore/hero-3/page.tsx` — that file is the canonical visual reference. Read it first, extract the patterns, then apply them. Do NOT delete exploration files until user signs off (Phase 9).

**Gate command (run from `nextjs/`):**
```sh
npm run verify:predeploy
```
This runs: guard:dev-server → lint → build → test. Use this as the ONLY gate. Do not run lint or build separately.

## Skills to invoke

Run `/frontend-design` at session start.

---

## Approved Direction

**Hero 3 "Kinetic Precision":** Portrait photo as full-viewport hero background with horizontal gradient overlay (sand fades to transparent). Split layout on homepage: text left, StarBorder testimonial card right. Clip-path line reveal on hero headlines (not blur-in). Lighter blue-tinted dark zone (`#0e1520`, not `#070b12`) for contrast sections. Border-left stripes on cards for category encoding.

**StarBorder + ShinyText rule:** Homepage only. These effects are NOT part of the shared hero pattern. Other pages get the portrait-as-bg hero + clip-path reveal + dark-zone but never StarBorder or ShinyText.

**User feedback to honor:**
- Dark zone must be lighter and blue-tinted — `#0e1520` base, NOT midnight black
- Images must never repeat on the same page — each photo appears exactly once
- Hero 3 pattern (portrait as bg) is preferred over Hero 2 (portrait as separate block)
- No purple/neon hues anywhere — the mindfold purple gradient card must go

---

## Current Design DNA (do not re-discover)

**Palette (CSS vars, `styles/globals.css`):**
- `--ink: #0c1115`, `--ink-soft: #1c242c`, `--sand: #f7f1e6`, `--paper: #ffffff`
- `--accent-tech: #0f7ea9`, `--accent-spirit: #0e615d`, `--accent-mindfold: #d2a35d`
- `--muted: #4b535c`, `--line: #e6e0d8`
- Body bg: two radial gradients (amber 20%/20%, teal 80%/0%) over `--sand`

**Fonts:** Cormorant Garamond (serif, headings via `--font-serif`), DM Sans (sans, body via `--font-sans`). Loaded in `lib/utils/fonts.ts`.

**Spacing:** Container 1080px, grid gap 27px, section mt-10, page py-11/md:py-16.

**Motion:** `ScrollReveal` (IntersectionObserver, `useScrollReveal.ts`), `AmbientFloat` (rAF sine), `MagneticButton`, `MouseTrackingGradient`, `BreathingText`. Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Motion killed on touch/reduced-motion via media queries in `globals.css:1872-1915`.

**Cards:** Frosted white (`bg-white/0.92`), shadow ladder 8px→25px. Hover: lift + border-color shift.

**Palette is locked.** Stay within teal/amber/sand. No new hue families. No purple, no neon.

**File sizes to be aware of (may need extraction):**
- `styles/globals.css` — 2076 lines. New classes add ~160 lines. Acceptable but monitor.
- `app/tech/page.tsx` — 751 lines. Already over 500 LOC. If changes push past 800, extract a section into a component.
- `app/spirituality/page.tsx` — 578 lines. Close to limit. Extract FAQ or offerings section if needed.
- `app/mindfold/events/page.tsx` — 524 lines. Close to limit.
- `app/tantra-massage-ubud/page.tsx` — 433 lines. Close to limit.
- `app/page.tsx` — 315 lines. Plenty of room.

---

## Known Bugs in hero-3 Prototype (fix during extraction)

These exist in `app/explore/hero-3/page.tsx` and must NOT be carried into production:

1. **Dark zone uses `#070b12`** (3 occurrences: bg, gradient start, gradient stops). Must be `#0e1520` with gradient range `#0e1520 → #121d2e → #152438`.
2. **Hover kills border-left stripe.** `.exp3-path-card:hover` uses `border-color` shorthand which overrides all four sides including the stripe. Fix: use `border-top-color`, `border-right-color`, `border-bottom-color` separately, or use `border-inline-color` + `border-block-color`.
3. **ShinyText reduced-motion incomplete.** `animation: none` is set but `-webkit-text-fill-color` stays transparent. Must add `-webkit-text-fill-color: var(--accent-spirit)` in the `prefers-reduced-motion` block.
4. **Decorative dark-zone bg image** has `alt="Abstract AI atmosphere"`. Should be `alt=""` (purely decorative).
5. **Scroll-reveal blur** uses 3px in prototype. Standardize to 4px across ScrollReveal component and CSS utility classes.

---

## Phase 1: Global Design System Updates

### 1A. New CSS tokens (`styles/globals.css` `:root`)

Add after existing vars:
```css
--dark-zone: #0e1520;
--dark-zone-text: #c8d4e0;
--dark-zone-muted: #7a8da0;
```

### 1B. New keyframes (`styles/globals.css`)

Add these keyframes (place near existing keyframe block ~line 1621):

```css
/* Clip-path line reveal (premium entrance, GPU-composited) */
@keyframes clip-reveal {
  0%   { clip-path: inset(0 0 100% 0); opacity: 0; }
  30%  { opacity: 1; }
  100% { clip-path: inset(0 0 0% 0); opacity: 1; }
}

/* Blur-in entrance (for non-headline elements: badges, CTAs, cards) */
@keyframes blur-text-in {
  0%   { opacity: 0; filter: blur(10px); transform: translateY(16px); }
  60%  { opacity: 0.7; filter: blur(3px); transform: translateY(3px); }
  100% { opacity: 1; filter: blur(0); transform: translateY(0); }
}

/* StarBorder spin — requires @property declaration above */
@keyframes star-border-spin {
  0%   { --star-angle: 0deg; }
  100% { --star-angle: 360deg; }
}

/* ShinyText shimmer sweep */
@keyframes shiny-text-sweep {
  0%   { background-position: 150% center; }
  100% { background-position: -50% center; }
}

/* Scroll-driven fade-up (CSS-only, no JS) */
@keyframes scroll-fade-up {
  from { opacity: 0; transform: translateY(2rem); filter: blur(4px); }
  to   { opacity: 1; transform: none; filter: blur(0); }
}
```

Add `@property` declaration at the top of globals.css (before `:root`):
```css
@property --star-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
```

### 1C. New utility classes (`styles/globals.css`)

```css
/* --- Clip-path headline reveal --- */
.clip-reveal {
  clip-path: inset(0 0 100% 0);
  opacity: 0;
  animation: clip-reveal 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
.clip-reveal-d1 { animation-delay: 0.1s; }
.clip-reveal-d2 { animation-delay: 0.2s; }
.clip-reveal-d3 { animation-delay: 0.3s; }

/* --- Blur-in entrance (non-headlines) --- */
.blur-in {
  opacity: 0;
  filter: blur(10px);
  transform: translateY(16px);
  animation: blur-text-in 0.75s ease-out forwards;
}
.blur-in-d1 { animation-delay: 0.12s; }
.blur-in-d2 { animation-delay: 0.24s; }
.blur-in-d3 { animation-delay: 0.36s; }
.blur-in-d4 { animation-delay: 0.50s; }

/* --- Section eyebrow (standardized) --- */
.section-eyebrow {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* --- Dark zone --- */
.dark-zone {
  position: relative;
  background: var(--dark-zone);
  background-image:
    radial-gradient(circle at 20% 30%, rgba(15,126,169,0.1), transparent 35%),
    radial-gradient(circle at 80% 70%, rgba(210,163,93,0.06), transparent 30%);
  color: var(--dark-zone-text);
  overflow: hidden;
}
.dark-zone-inner {
  position: relative;
  z-index: 2;
  max-width: 1080px;
  margin: 0 auto;
}

/* --- StarBorder (HOMEPAGE ONLY, max 1 element) --- */
.star-border {
  position: relative;
  border-radius: 24px;
  overflow: visible;
}
.star-border::before {
  content: '';
  position: absolute;
  inset: -1.5px;
  border-radius: 25.5px;
  background: conic-gradient(
    from var(--star-angle, 0deg),
    transparent 0%, var(--accent-tech) 8%, transparent 16%,
    transparent 42%, var(--accent-mindfold) 50%, transparent 58%,
    transparent 84%, var(--accent-spirit) 92%, transparent 100%
  );
  z-index: 0;
  animation: star-border-spin 6s linear infinite;
}
.star-border::after {
  content: '';
  position: absolute;
  inset: 1.5px;
  border-radius: 22.5px;
  background: var(--paper);
  z-index: 0;
}
.star-border > * {
  position: relative;
  z-index: 1;
}

/* --- ShinyText (HOMEPAGE ONLY, max 1 element) --- */
.shiny-text {
  background-image: linear-gradient(120deg,
    var(--accent-spirit) 0%, var(--accent-spirit) 35%,
    var(--sand) 50%,
    var(--accent-spirit) 65%, var(--accent-spirit) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shiny-text-sweep 3.5s linear infinite;
}

/* --- Dark zone glass card --- */
.dark-zone-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 2rem;
  backdrop-filter: blur(8px);
  transition: border-top-color 0.3s, border-right-color 0.3s,
              border-bottom-color 0.3s, transform 0.3s;
}
.dark-zone-card:hover {
  border-top-color: rgba(255,255,255,0.15);
  border-right-color: rgba(255,255,255,0.15);
  border-bottom-color: rgba(255,255,255,0.15);
  transform: translateY(-3px);
}

/* --- Border-left category stripe --- */
.card-stripe-tech  { border-left: 3px solid var(--accent-tech); }
.card-stripe-spirit { border-left: 3px solid var(--accent-spirit); }
.card-stripe-mindfold { border-left: 3px solid var(--accent-mindfold); }

/* --- Hero portrait-as-background pattern --- */
.hero-portrait-wrap {
  position: relative;
  z-index: 1;
  min-height: 90vh;
  display: flex;
  align-items: center;
}
.hero-portrait-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.hero-portrait-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(90deg,
    var(--sand) 0%,
    rgba(247,241,230,0.92) 35%,
    rgba(247,241,230,0.6) 55%,
    rgba(247,241,230,0.2) 75%,
    transparent 100%);
}
.hero-portrait-bottom {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 120px;
  z-index: 2;
  background: linear-gradient(180deg, transparent, var(--sand));
}

/* --- Native scroll-driven reveal (CSS-only, no JS) --- */
@supports (animation-timeline: view()) {
  .scroll-reveal-native {
    animation: scroll-fade-up linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 30%;
    animation-duration: 1ms; /* Firefox compat */
  }
}
```

### 1D. Kill switches for new animations

Add to the existing `prefers-reduced-motion` media query block:
```css
.clip-reveal { animation: none; clip-path: none; opacity: 1; }
.blur-in { animation: none; opacity: 1; filter: none; transform: none; }
.star-border::before { animation: none; }
.shiny-text { animation: none; -webkit-text-fill-color: var(--accent-spirit); }
.scroll-reveal-native { animation: none; opacity: 1; filter: none; transform: none; }
```

Add to the existing touch/coarse pointer media query block:
```css
.clip-reveal { animation: none; clip-path: none; opacity: 1; }
.blur-in { animation: none; opacity: 1; filter: none; transform: none; }
.star-border::before { animation: none; }
.shiny-text { animation: none; -webkit-text-fill-color: var(--accent-spirit); }
```

### 1E. ScrollReveal blur enhancement (`components/motion/ScrollReveal.tsx`)

Add `filter: blur(4px)` to initial state and `filter: blur(0)` to revealed state. Update the transition to include filter:

```tsx
// In ScrollReveal component, update the style object:
const style: React.CSSProperties = {
  opacity: isVisible ? 1 : 0,
  filter: isVisible ? "blur(0)" : "blur(4px)",
  transform: isVisible ? "none" : transform,
  transition: `opacity ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1), transform ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1), filter ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
  transitionDelay: `${delay}ms`,
};
```

### 1F. Update existing `fade-up` keyframe

In the existing `@keyframes fade-up` in globals.css, add blur to the from state:
```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(22px) scale(0.985); filter: blur(4px); }
  to   { opacity: 1; transform: none; filter: blur(0); }
}
```

### 1G. Tailwind config (`tailwind.config.ts`)

Add dark-zone colors to the theme extend:
```ts
colors: {
  // existing colors...
  'dark-zone': '#0e1520',
  'dark-zone-text': '#c8d4e0',
  'dark-zone-muted': '#7a8da0',
}
```

### 1H. Tablet breakpoint (`styles/globals.css`)

Add a 1024px breakpoint for hero portrait layout:
```css
@media (min-width: 769px) and (max-width: 1024px) {
  .hero-portrait-wrap {
    min-height: 70vh;
  }
  .hero-portrait-overlay {
    background: linear-gradient(90deg,
      var(--sand) 0%,
      rgba(247,241,230,0.92) 40%,
      rgba(247,241,230,0.7) 60%,
      rgba(247,241,230,0.35) 80%,
      transparent 100%);
  }
}
```

Add mobile override at existing 768px breakpoint:
```css
@media (max-width: 768px) {
  .hero-portrait-wrap {
    min-height: auto;
  }
  .hero-portrait-overlay {
    background: linear-gradient(180deg,
      rgba(247,241,230,0.5) 0%,
      rgba(247,241,230,0.85) 40%,
      var(--sand) 80%);
  }
}
```

**Gate after Phase 1:** `npm run verify:predeploy`. Fix any issues before proceeding.

---

## Phase 2: Homepage (`app/page.tsx`)

Read current `app/page.tsx` fully before making changes.

### Changes:

1. **Hero image section (`.hero-image-section`):** Convert to `.hero-portrait-wrap` pattern:
   - `DSC05871.jpg` as position-absolute fill image (keep current Image component)
   - Add `.hero-portrait-overlay` (horizontal gradient: sand left → transparent right)
   - Add `.hero-portrait-bottom` (vertical fadeout at bottom)
   - Remove the old `.hero-image-overlay` and `.hero-image-content` ("Presence + Product" text) — this text moves to the dark bento card badge

2. **Dark bento card:** Change `bg-[#070b12]` to `bg-[var(--dark-zone)]` (which is `#0e1520`). Update all hardcoded `#070b12` references in the gradient to use the new range: `#0e1520 → #121d2e → #152438`.

3. **Clip-path reveal on hero headlines:** Add `.clip-reveal` class to h1. Add `.clip-reveal clip-reveal-d1` to subtitle. Use `.blur-in blur-in-d2` on badge, `.blur-in blur-in-d3` on CTA row, `.blur-in blur-in-d4` on metric chips (non-headlines get blur-in, headlines get clip-reveal).

4. **ShinyText:** Add `.shiny-text` class to the "Presence + Product" badge text (the `<p>` with `animate-pulse-glow`). Remove `animate-pulse-glow`. HOMEPAGE ONLY.

5. **StarBorder:** Add `.star-border` class to exactly 1 floating card (the Tech Path card). HOMEPAGE ONLY.

6. **Border-left stripes:** Add `.card-stripe-tech` to Tech Path card, `.card-stripe-spirit` to Somatic Path card, `.card-stripe-mindfold` to the third card.

7. **No image duplication:** `DSC05871.jpg` appears ONLY in the hero-portrait-bg. `home-hero-generated.jpg` appears ONLY in the dark bento bg (set `alt=""`). `home-ambient-somatic.jpg` appears ONLY in the area-served ambient band.

**Files:** `app/page.tsx`

**Gate:** `npm run verify:predeploy`

---

## Phase 3: Primary Service Pages

### Tech Page (`app/tech/page.tsx`) — 751 LOC

Read fully first. Currently uses `tech-portrait.jpg` in `.hero-image-section`.

1. Convert `.hero-image-section` to `.hero-portrait-wrap` pattern with `tech-portrait.jpg` as bg
2. Add `.clip-reveal` on hero headline, `.blur-in` stagger on subtitle + CTAs
3. Wrap the AI services overview section in `.dark-zone` with `.dark-zone-inner`
4. Service cards inside dark zone: `.dark-zone-card` + `.card-stripe-tech`
5. Standardize all eyebrows to `.section-eyebrow`
6. **No StarBorder. No ShinyText.** These are homepage-only effects.
7. `tech-portrait.jpg` appears only in the hero bg — nowhere else
8. **If changes push file past 800 LOC:** Extract the testimonials or article-list section into `components/tech/TechTestimonials.tsx` or similar.

### Somatic Page (`app/somatic/page.tsx`)

**Bug fix:** Add missing `ui-immersive-hero` and `ui-fade-up delay-1` classes that all other pages have (somatic is the only page missing them). Also normalize h-tag: use `<h2>` in photo hero (currently uses `<h1>`, inconsistent with all other pages). Move `<h1>` to the content section below.

1. Convert hero to `.hero-portrait-wrap` with `bali/DSC04769.jpg`. Keep `FloatingOrbs`.
2. `.clip-reveal` on hero headline, `.blur-in` stagger on subtitle
3. Session types cards: add `.card-stripe-spirit`
4. Standardize eyebrows to `.section-eyebrow`
5. No dark zone on this page (keep it warm/light throughout)
6. **No StarBorder. No ShinyText.**

### Spirituality Page (`app/spirituality/page.tsx`) — 578 LOC

1. Convert hero to `.hero-portrait-wrap` with `DSC05764.jpg`
2. `.clip-reveal` on hero headline, `.blur-in` stagger on subtitle
3. Wrap offerings section in `.dark-zone`. Cards: `.dark-zone-card` + `.card-stripe-spirit`
4. `DSC04778.jpg` atmospheric band stays where it is (appears once)
5. Standardize eyebrows to `.section-eyebrow`
6. **No StarBorder. No ShinyText.**
7. **If changes push past 650 LOC:** Extract FAQ accordion into `components/spirituality/SpiritualityFaq.tsx`.

**Files:** `app/tech/page.tsx`, `app/somatic/page.tsx`, `app/spirituality/page.tsx`

**Gate:** `npm run verify:predeploy`

---

## Phase 4: RouteHero Update (`components/layout/RouteHero.tsx`)

Currently shows `DSC05871.jpg` with "Explore" title on all sub-pages not in the blocklist. This component applies to sub-pages like `/blog/some-slug`, `/tech/some-slug`, etc. that are NOT in the explicit blocklist.

1. Add `.hero-portrait-overlay` gradient over the image
2. Reduce `min-height` slightly (sub-pages don't need 90vh — use 50vh max)
3. Standardize title/subtitle typography
4. Remove static "Presence + Product" subtitle
5. Add `.clip-reveal` on the h1
6. **No StarBorder. No ShinyText.**

**Files:** `components/layout/RouteHero.tsx`

---

## Phase 5: Secondary Pages

### About Page (`app/about/page.tsx`)
1. Convert hero to `.hero-portrait-wrap` with `DSC04778.jpg`
2. `.clip-reveal` on headline, `.blur-in` on fast facts
3. "Working together" cards: deeper shadow + standardized radius

### Proof Page (`app/proof/page.tsx`)
1. Convert hero to `.hero-portrait-wrap` with `tech-portrait.jpg`
2. Case study cards: spotlight hover
3. Wrap validation section in `.dark-zone`

### Mindfold Events (`app/mindfold/events/page.tsx`) — 524 LOC
1. Convert hero to `.hero-portrait-wrap` with `bali/DSC05052.jpg`
2. `.clip-reveal` on headline, `.blur-in` stagger on subtitle
3. Upcoming sessions section: `.dark-zone` wrapper
4. **Remove the purple gradient card** (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`) at ~line 435. Replace with `.dark-zone-card` + `.card-stripe-mindfold` (amber left stripe on dark glass). No purple allowed.
5. **If changes push past 600 LOC:** Extract the Google Forms section into a component.

### Blog Page (`app/blog/page.tsx`)
1. Convert hero to `.hero-portrait-wrap` with `DSC05764.jpg`
2. Article cards: consistent radius + shadow

### Identity Page (`app/identity/page.tsx`) — 279 LOC
1. Has its own `hero-image-section`. Convert to `.hero-portrait-wrap` pattern.
2. `.clip-reveal` on headline.
3. Inherit global card/shadow updates.

### Tantra Massage Ubud Page (`app/tantra-massage-ubud/page.tsx`) — 433 LOC
1. Has its own `hero-image-section` with `bali/DSC04978.jpg`. Convert to `.hero-portrait-wrap` pattern.
2. `.clip-reveal` on headline.
3. Standardize eyebrows to `.section-eyebrow`.
4. Inherit global card/shadow updates.

**Files:** 6 page files

**Gate:** `npm run verify:predeploy`

---

## Phase 6: FAQ Standardization

Currently three different FAQ patterns exist:
- `HomeFaqSection` component (homepage)
- Flat `<div class="card">` with `<h4>` (somatic, tech)
- Native `<details>/<summary>` (spirituality)

### Standardize to:

Create `components/shared/FaqSection.tsx`:
- Accepts `items: { question: string; answer: string }[]` and optional `columns?: 2 | 3`
- Uses native `<details>/<summary>` (best accessibility, no JS)
- Styled with frosted card pattern (`bg-white/0.92`, rounded, shadow)
- Summary styled with `font-weight: 600`, custom marker (chevron via CSS `::marker` or `::after`)
- Answer styled with `color: var(--muted)`, `padding-top: 0.75rem`
- Grid: `grid-cols-1 md:grid-cols-2` (default) or `md:grid-cols-3`

### Apply to:
1. **Homepage:** Replace `HomeFaqSection` with `FaqSection`
2. **Tech page:** Replace flat FAQ cards with `FaqSection`
3. **Somatic page:** Replace flat FAQ cards with `FaqSection`
4. **Spirituality page:** Keep `<details>/<summary>` but swap to `FaqSection` component
5. **Mindfold events:** Replace FAQ section with `FaqSection`

After migration, delete `HomeFaqSection` component if it becomes unused.

**Files:** New `components/shared/FaqSection.tsx`, 5 page files

**Gate:** `npm run verify:predeploy`

---

## Phase 7: Remaining Pages (Light Touch)

### Links Page (`app/links/page.tsx`)
- Convert hero to `.hero-portrait-wrap` with `DSC05868.jpg`
- Tiles: consistent radius + shadow

### SEO Landing Pages — Normalize Heroes
These currently use bare `<section>` with inline `padding: 80px 20px` styles. Normalize to use `.container` wrapper + `.section-eyebrow` + standard spacing (no hero image needed):
- `app/ai-workflow-automation/page.tsx`
- `app/n8n-automation/page.tsx`
- `app/claude-code-consultant/page.tsx`

Changes per page:
1. Replace inline `style={{ padding: "80px 20px" }}` with Tailwind `py-16 md:py-20 px-4`
2. Wrap content in `.container` (`max-width: 1080px, margin: 0 auto`)
3. Add `.clip-reveal` on page h1
4. Standardize eyebrows to `.section-eyebrow`

### Article Pages (all `/tech/articles/*`, `/spirituality/blog/*`, `/spirituality/articles/*`)
- Add `.clip-reveal` to article-header h1
- No other changes (prose styling is already good)
- Includes listing pages: `spirituality/articles/page.tsx`, `blog/topics/page.tsx`

### Dynamic Detail Pages
These pages render content from data/params and have no hero-image-section. They inherit global updates automatically:
- `app/blog/[slug]/page.tsx` — article detail, inline cover image
- `app/blog/tag/[tag]/page.tsx` — tag listing, no hero
- `app/tech/[slug]/page.tsx` — project detail, conditional inline image
- `app/tech/case-studies/[id]/page.tsx` — case study detail, no hero
- Changes: `.clip-reveal` on page title where applicable. Inherit card/shadow globals.

### Case Studies listing (`app/tech/case-studies/page.tsx`)
- `.clip-reveal` on page title
- Card polish: consistent radius + shadow

### Somatic Sub-pages (no hero-image-section, no RouteHero)
These are SEO landing pages within the somatic section:
- `app/somatic/approach/page.tsx` — 190 LOC
- `app/somatic/modalities/page.tsx` — 217 LOC
- `app/somatic/training/page.tsx` — 210 LOC
- Changes: Inherit global card/shadow/eyebrow updates. `.clip-reveal` on page title. No layout restructuring.

### Tech Sub-pages
- `app/tech/ai-automation/page.tsx` — 390 LOC, SEO landing page, no hero image
- Changes: Inherit global updates. `.clip-reveal` on title. Section eyebrow standardization.

### Performance Page
- `app/performance/page.tsx` — 291 LOC, no hero image
- Changes: Inherit global updates. `.clip-reveal` on title.

**Files:** ~20 files, minimal changes each (mostly adding `.clip-reveal` to titles and inheriting globals)

**Gate:** `npm run verify:predeploy`

---

## Phase 8: Visual Verification

Do NOT delete exploration files yet.

1. Run full gate: `npm run verify:predeploy` — must pass
2. Start dev server: `npm run dev`
3. Visual checks (use browser or playwright):
   - `localhost:3000` at 375px width — no layout shift, text readable over portrait
   - `localhost:3000` at 768px width (tablet) — verify intermediate layout works
   - `localhost:3000` at 1024px width (tablet landscape) — verify 1024px breakpoint
   - `localhost:3000` at 1440px width — portrait visible right side, text readable left
   - `/tech`, `/somatic`, `/spirituality` — hero pattern consistent, no image duplication
   - `/blog`, `/about`, `/proof`, `/links`, `/mindfold/events`, `/identity`, `/tantra-massage-ubud` — hero pattern applied
   - `/ai-workflow-automation`, `/n8n-automation`, `/claude-code-consultant` — normalized hero layout
   - Verify dark zone is visibly lighter/bluer than the old `#070b12`
   - Verify `prefers-reduced-motion` kills all new animations (check in Chrome DevTools → Rendering → Emulate prefers-reduced-motion)
   - Verify clip-path reveal plays on hero headlines, blur-in on non-headlines
   - Verify StarBorder appears ONLY on homepage Tech Path card
   - Verify ShinyText appears ONLY on homepage badge
   - Verify no image appears twice on any single page
   - Verify no purple/neon colors anywhere (especially mindfold events booking card)
   - Verify FAQ sections use consistent `<details>/<summary>` pattern across all pages
   - Verify native scroll-driven animations work in Chrome/Safari, degrade gracefully in Firefox
4. Summarize:
   - List every file changed and why (1 line each)
   - Before/after comparison for homepage at 1440px

---

## Phase 9: Post-Signoff Cleanup

**Only after user approves the visual result:**

1. Delete exploration files:
   - `nextjs/app/explore/hero-2/page.tsx`
   - `nextjs/app/explore/hero-3/page.tsx`
   - `nextjs/app/explore/` directory
   - `docs/hero-1.html`, `docs/hero-2.html`, `docs/hero-3.html`

2. Delete unused components (if FAQ standardization made them redundant):
   - Check if `HomeFaqSection` is still imported anywhere; delete if not

3. Final gate: `npm run verify:predeploy`

---

## Guardrails

- **Images:** Each hero image appears exactly once per page. Never duplicate.
- **StarBorder:** HOMEPAGE ONLY. 1 element (Tech Path card). Never on other pages.
- **ShinyText:** HOMEPAGE ONLY. 1 element (badge). Never on other pages.
- **Dark zone:** Always `#0e1520` (`var(--dark-zone)`). Never `#070b12`.
- **Palette:** Locked to teal/amber/sand. No purple, neon, or new hue families.
- **Dependencies:** No new npm packages.
- **File size:** Target under 500 LOC. Tolerate up to 800 if extraction would be churn. If a file crosses 800 LOC after changes, extract a logical section into a component. Known large files: `tech/page.tsx` (751), `spirituality/page.tsx` (578), `mindfold/events/page.tsx` (524), `tantra-massage-ubud/page.tsx` (433), `globals.css` (2076 + ~160 new = ~2236, acceptable for a global stylesheet).
- **Motion:** Killed on `prefers-reduced-motion` + touch/coarse pointer.
- **Clip-path reveal:** Headlines only (h1, h2). Everything else uses blur-in.
- **Transitions:** Use specific properties (`transform, box-shadow, border-top-color, border-right-color, border-bottom-color`), not `transition: all`. Never use `border-color` shorthand on elements with border-left stripes.
- **Content:** Do not rewrite text content, SEO metadata, structured data, or analytics code.
- **Semantics:** Preserve all HTML semantics, aria attributes, and accessibility.
- **Decorative images:** Use `alt=""` for atmospheric/decorative background images.
- **h-tag consistency:** Photo hero sections use `<h2>`. The page's `<h1>` goes in the content section below.
- **Gate:** Always `npm run verify:predeploy`. Never lint or build separately.
- **Scroll-driven animations:** Use `@supports (animation-timeline: view())` guard. JS IntersectionObserver remains as fallback for unsupported browsers via existing ScrollReveal component.

---

## Reference: Hero 3 Exploration File

The approved visual direction is implemented in `nextjs/app/explore/hero-3/page.tsx`. This file contains:
- Exact CSS for all new patterns (blur-in, star-border, shiny-text, dark-zone, hero-portrait)
- Exact responsive breakpoints (768px mobile, gradient adjustments)
- Exact motion kill switches (prefers-reduced-motion)

Read this file and extract the CSS patterns into globals.css as reusable utility classes. Rename `exp3-` prefixed class names to production names (`.clip-reveal`, `.blur-in`, `.star-border`, `.dark-zone`, etc.). **Apply the bug fixes listed in "Known Bugs" section above during extraction — do NOT copy the bugs.** Keep the exploration file intact until Phase 9 (post-signoff cleanup).

---

## Complete Page Coverage

Every page in the app is accounted for below. Pages are either explicitly changed or marked as globals-only (inheriting updates from Phase 1).

| Page | Phase | Hero Conversion | Dark Zone | StarBorder | ShinyText | Clip-Reveal |
|------|-------|----------------|-----------|------------|-----------|-------------|
| `app/page.tsx` | 2 | Yes (DSC05871.jpg) | Yes (lighten existing) | Yes (1 card) | Yes (1 badge) | Yes (h1) |
| `app/tech/page.tsx` | 3 | Yes (tech-portrait.jpg) | Yes (services) | No | No | Yes (h1) |
| `app/somatic/page.tsx` | 3 | Yes (bali/DSC04769.jpg) | No | No | No | Yes (h1) |
| `app/spirituality/page.tsx` | 3 | Yes (DSC05764.jpg) | Yes (offerings) | No | No | Yes (h1) |
| `RouteHero.tsx` | 4 | Yes (overlay update) | No | No | No | Yes (h1) |
| `app/about/page.tsx` | 5 | Yes (DSC04778.jpg) | No | No | No | Yes (h1) |
| `app/proof/page.tsx` | 5 | Yes (tech-portrait.jpg) | Yes (validation) | No | No | Yes (h1) |
| `app/mindfold/events/page.tsx` | 5 | Yes (bali/DSC05052.jpg) | Yes (sessions) | No | No | Yes (h1) |
| `app/blog/page.tsx` | 5 | Yes (DSC05764.jpg) | No | No | No | Yes (h1) |
| `app/identity/page.tsx` | 5 | Yes (bali/DSC04934.jpg) | No | No | No | Yes (h1) |
| `app/tantra-massage-ubud/page.tsx` | 5 | Yes (bali/DSC04978.jpg) | No | No | No | Yes (h1) |
| `app/links/page.tsx` | 7 | Yes (DSC05868.jpg) | No | No | No | Yes (h1) |
| `app/ai-workflow-automation/page.tsx` | 7 | Normalize (no hero img) | No | No | No | Yes (h1) |
| `app/n8n-automation/page.tsx` | 7 | Normalize (no hero img) | No | No | No | Yes (h1) |
| `app/claude-code-consultant/page.tsx` | 7 | Normalize (no hero img) | No | No | No | Yes (h1) |
| `app/performance/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |
| `app/blog/topics/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |
| `app/blog/tag/[tag]/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |
| `app/blog/[slug]/page.tsx` | 7 | Globals only (inline img) | No | No | No | Yes (h1) |
| `app/somatic/approach/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |
| `app/somatic/modalities/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |
| `app/somatic/training/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |
| `app/spirituality/articles/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |
| `app/spirituality/blog/*` | 7 | Globals only (articles) | No | No | No | Yes (h1) |
| `app/spirituality/articles/*` | 7 | Globals only (articles) | No | No | No | Yes (h1) |
| `app/tech/articles/*` | 7 | Globals only (articles) | No | No | No | Yes (h1) |
| `app/tech/ai-automation/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |
| `app/tech/[slug]/page.tsx` | 7 | Globals only (inline img) | No | No | No | Yes (h1) |
| `app/tech/case-studies/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |
| `app/tech/case-studies/[id]/page.tsx` | 7 | Globals only (no hero) | No | No | No | Yes (h1) |

---

## Image inventory (for deduplication checks)

| Page | Hero Image | Other Images (max 1 each) |
|------|-----------|--------------------------|
| Homepage | `DSC05871.jpg` | `home-hero-generated.jpg` (dark zone bg, `alt=""`), `home-ambient-somatic.jpg` (ambient band) |
| Tech | `tech-portrait.jpg` | none |
| Somatic | `bali/DSC04769.jpg` | none |
| Spirituality | `DSC05764.jpg` | `DSC04778.jpg` (atmospheric band) |
| About | `DSC04778.jpg` | none |
| Proof | `tech-portrait.jpg` | `home-automation-portrait.png` (ambient band) |
| Mindfold | `bali/DSC05052.jpg` | none |
| Blog | `DSC05764.jpg` | none |
| Links | `DSC05868.jpg` | none |
| Identity | `bali/DSC04934.jpg` | none |
| Tantra Massage Ubud | `bali/DSC04978.jpg` | none |
| RouteHero (sub-pages) | `DSC05871.jpg` | none |
