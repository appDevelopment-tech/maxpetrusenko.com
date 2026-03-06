# Kyo-tai And Bitcoin Content Design

## Goal

Create real canonical content for the legacy `kyo-tai`, `bitcoin`, and old Bitcoin hash URL examples so Google reaches indexable pages instead of empty redirects.

## Approved Shape

- Publish a canonical spirituality article that defines `Kyo-tai` as Max's own modality.
- Publish a follow-up spirituality article that explains what happens in a Kyo-tai session.
- Publish a canonical tech article about Bitcoin as strong money.
- Keep the old Medium-style Bitcoin hash URL, but redirect it to the readable Bitcoin article.
- Make tag archive pages render even when they only contain one article so `/blog/tag/kyo-tai` and `/blog/tag/bitcoin` become real pages.

## Content Direction

### Kyo-tai

- Frame it as a branded modality, not a claim about a standard established public term.
- Explain that `tai` points to body/form and that `Kyo-tai` is Max's name for a two-body listening system that combines contact, pressure, rhythm, and energetic transmission.
- Keep the tone boundaries-first, explicit, and non-mystifying.

### Bitcoin

- Use the "strong money" angle as the canonical piece.
- Cover scarcity, self-custody, neutrality, settlement, volatility, and tradeoffs.
- Keep it distinct from generic "crypto" framing.

## Integration

- Add the new articles to local CMS data in `nextjs/lib/cms/articles.ts`.
- Add canonical route pages under `nextjs/app/spirituality/blog/*` and `nextjs/app/tech/articles/*`.
- Add the new entries to hub pages and sitemap coverage.
- Update legacy redirect compatibility helpers and tests.
