# MaxPetrusenko.com — Site & Repo Plan (11/10)

## Goals
- Serve three clear audiences with minimal cross-confusion: Tech/Portfolio, Spirituality/Atelier, Mindfold.
- Keep low friction from social → correct landing → conversion (book, contact, follow).
- Maintain a simple, fast static stack deployable to Cloudflare Pages.

## Information Architecture
- Home (`/`): Neutral hero, quick “What I do” split (Tech • Spirituality • Mindfold) with two CTAs per pillar.
- Links (`/links`): Comprehensive hub (all social + key CTAs), biased to current primary offer at top.
- Tech (`/tech`): Tech-only landing (projects, GitHub, LinkedIn, dev tools). CTA: contact/book a tech intro.
- Spirituality (`/spirituality`): Atelier/Mindfold focus. CTA: book session/WhatsApp, link to atelier site.
- About (`/about`): Short bio, credibility, cross-link back to Tech/Spirituality.
- Mindfold (`/mindfold` optional): If you want a dedicated page instead of redirect.

## Navigation (consistent header)
- Home | Links | Tech | Spirituality | About
- Small tertiary link or badge for Mindfold if needed.
- Footer: contact options (WhatsApp, email), social icons, cross-link nudges.

## Page Content Notes
- `/links`: Stack of tiles (social, booking, portfolio). Top 2 tiles = primary current offer + booking.
- `/tech`: Hero + 3–5 projects/case highlights + social proof (GitHub/LinkedIn) + “Work with me” CTA.
- `/spirituality`: Hero + offerings + availability note + WhatsApp CTA + link to full atelier site.
- `/mindfold` (if built): Hero + what/why + CTA to book/learn more on mindfoldsanctuary.com.

## Repo Structure (lean static, no build required)
- `/public` (static assets)
  - `/images` (hero-home.jpg, hero-tech.jpg, hero-spirituality.jpg, optional mindfold.jpg)
  - `/icons` (SVG social icons)
  - `/styles`:
    - `base.css` (tokens: colors, typography, spacing)
    - `components.css` (buttons, cards, nav, tiles)
    - `pages.css` (page-specific layout tweaks)
  - `/scripts`:
    - `main.js` (optional; only for nav interactions/analytics)
- `/pages`
  - `index.html` (Home)
  - `links.html`
  - `tech.html`
  - `spirituality.html`
  - `about.html`
  - `mindfold.html` (optional)
- `/partials`
  - `header.html`, `footer.html`, `social.html` (for includes if using a simple templating pass; otherwise copy/paste for pure static)
- `.gitignore`, `README.md` (deploy instructions, routes, how to update)

## Styling Direction
- Typography: one geometric sans (e.g., Space Grotesk) + one serif for headings (e.g., Playfair Display).
- Color: shared base neutrals; accent split: Tech (teal/blue), Spirituality (deep jade/sand), Mindfold (charcoal/gold).
- Components: card-style tiles, rounded buttons, consistent spacing rhythm (4/8/16/24).

## Deployment
- Target: Cloudflare Pages (single project).
- Custom domains: keep `atelier.maxpetrusenko.com` for atelier site; `maxpetrusenko.com` for this hub; `blindfold.maxpetrusenko.com` can stay a redirect or get its own page.
- No build step needed; static deploy of `/pages` + `/public`.

## Next Build Steps
1) Set up the repo structure above (move current root HTML into `/pages/index.html`; add new pages).
2) Add header/footer partials (or repeat blocks) with the nav specified.
3) Implement `/links`, `/tech`, `/spirituality` pages with the component library (tiles/buttons).
4) Wire CSS tokens and components; keep JS minimal or none.
5) Deploy to Cloudflare Pages; bind `maxpetrusenko.com` and (if desired) `www`.
6) Keep `atelier.maxpetrusenko.com` separate; optionally add `mindfold` page or keep redirect.

##URLS
Subscribe to Shoutouts Here
http://patreon.com/maxpetrusenko

Make Your Content Visible on X
https://maxpetrusenko.gumroad.com/l/zrsxj

FileMaker
https://maxpetrusenko.notion.site/Portfolio-e521a73ef4bf41ccaf2e0098edd72c25

Github
https://github.com/maxpetrusenko

Medium
https://medium.com/@max.petrusenko

Gumroad
https://maxpetrusenko.gumroad.com/

Cryptobase Newsletter
https://substack.com/@cryptobase

https://www.linkedin.com/in/max-petrusenko-40574b4a/



## blindfold links

12 Reasons To Try Blindfold
https://medium.com/dare-to-be-better/12-reasons-to-try-blindfold-contact-jam-a-dance-with-your-inner-self-3f94242d801a

Code of Conduct
https://blindfold.maxpetrusenko.com/code-of-conduct

Instagram
https://www.instagram.com/blindfold.miami

Memberships
https://patreon.com/mindfold

Leave Feedback
https://mindfold.canny.io/feedback

Fill out waver here ( for mindfold events )
https://form.jotform.com/242798411650965

1 - Minute Guided Meditation
https://www.youtube.com/watch?v=LClUFbijH4c


5 - Minute Guided Meditation
https://www.youtube.com/watch?v=rStafj2SCn0

10 - Minute Guided Medtitation
https://www.youtube.com/watch?v=bIOwHvunqTo

##blindfold code of conduct:
Refrain from unnecessary talking during workshop.
Take care of yourself and others. This includes no lifts.
When blindfolded, avoid taking large steps.
Keep feet low to ground if walking.
Crawling or rolling across the floor is another great alternative.
Always strive for attunement with your partner(s)
If you touch a private area inadvertently, don’t linger.
Respect verbal and nonverbal cues of consent. This is a non-sexual space.
No intoxicants, scents, or jewelry/watches.
Turn off mobile devices.
Do not smoke before the event.
No alcohol.


blindfoldhoma page has this integration:
<!-- ORIGINAL VERSION (NON-COMPLIANT) -->
<!-- Issues: "SMS updates" too vague, missing business name, no message types -->
<!--
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 18px; border-radius: 15px; color: white; text-align: center; margin: 20px auto; max-width: 600px; width: 100%; box-shadow: 0 8px 25px rgba(0,0,0,0.3); box-sizing: border-box;">

  <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 300;">Get mindful reminders & event updates</h3>

  <form action="https://docs.google.com/forms/d/e/1FAIpQLSca1rppS7ebqX8_po5aIVJS8IuQWwKv51x2ZatRDKKyFQ9g7A/formResponse" method="POST" target="_blank">

    <input type="tel" name="entry.292183109" placeholder="Phone number" required
           style="width: 100%; padding: 12px; margin: 8px 0; border: none; border-radius: 25px; text-align: center; font-size: 16px; box-sizing: border-box;">

    <label style="display: flex; align-items: flex-start; font-size: 11px; line-height: 1.3; cursor: pointer; margin-top: 12px; text-align: left;">
      <input type="checkbox" name="entry.901918916" value="Yes, I consent to receive SMS updates" required style="margin: 2px 6px 0 0; transform: scale(1.0);">
      <span style="opacity: 0.9;">I consent to SMS updates. Reply STOP anytime.</span>
    </label>

    <button type="submit" style="width: 100%; background: #ff6b6b; color: white; padding: 12px; border: none; border-radius: 25px; cursor: pointer; font-weight: bold; font-size: 16px; margin: 15px 0 8px 0; transition: all 0.3s; box-shadow: 0 4px 15px rgba(255,107,107,0.3);">
       Join the Journey
    </button>

  </form>

</div>
-->

<!-- 2025 COMPLIANT VERSION - MINIMAL CHANGES -->
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 18px; border-radius: 15px; color: white; text-align: center; margin: 20px auto; max-width: 600px; width: 100%; box-shadow: 0 8px 25px rgba(0,0,0,0.3); box-sizing: border-box;">

  <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 300;">Mindfold Sanctuary Text Updates</h3>

  <form action="https://docs.google.com/forms/d/e/1FAIpQLSca1rppS7ebqX8_po5aIVJS8IuQWwKv51x2ZatRDKKyFQ9g7A/formResponse" method="POST" target="_blank">

    <input type="tel" name="entry.292183109" placeholder="Phone number" required
           style="width: 100%; padding: 12px; margin: 8px 0; border: none; border-radius: 25px; text-align: center; font-size: 16px; box-sizing: border-box;">

    <label style="display: flex; align-items: flex-start; font-size: 11px; line-height: 1.4; cursor: pointer; margin-top: 12px; text-align: left;">
      <input type="checkbox" name="entry.901918916" value="Yes, I consent to receive SMS updates" required style="margin: 2px 6px 0 0; transform: scale(1.0);">
      <span style="opacity: 0.95;">I agree to receive text messages from Mindfold Sanctuary about events & workshops. Msg & data rates may apply. Reply STOP to opt-out.</span>
    </label>

    <button type="submit" style="width: 100%; background: #ff6b6b; color: white; padding: 12px; border: none; border-radius: 25px; cursor: pointer; font-weight: bold; font-size: 16px; margin: 15px 0 8px 0; transition: all 0.3s; box-shadow: 0 4px 15px rgba(255,107,107,0.3);">
       Join the Journey
    </button>

  </form>

</div>

<!--
KEY CHANGES FOR 2025 COMPLIANCE:
1. ✅ Changed "SMS updates" → "text messages from Mindfold Sanctuary"
2. ✅ Added business name "Mindfold Sanctuary" to header
3. ✅ Specified message types: "events & workshops"
4. ✅ Added "Msg & data rates may apply" disclosure
5. ✅ Updated checkbox value to match consent text
6. ✅ Made "Reply STOP to opt-out" more prominent

MINIMAL CHANGES SUMMARY:
- Header: Added "Mindfold Sanctuary"
- Checkbox text: 31 → 42 chars (still compact)
- Added required disclosures
- Total size increase: ~15 characters
-->



## some of my bio:

Max Petrusenko

Living proof you can be both a meditation master and social butterfly. Creating extraordinary life through ancient wisdom & modern tech.

Here to show you what's possible. 🌟

Tantra & Dao master of sacred sexuality
Digital shaman exploring consciousness
Filemaker Pro expert in the past
Creator of Sacred Spaces & Mindfold Sanctuary (IG: @blindfold.miami)

What I create:

Cryptobase Newsletter: Web3 insights
Gumroad on dreams, spirituality & tech
Sacred movement & contact improv spaces
Transformative ceremonies & gatherings
AI automation systems for freedom

I connect deep thinkers, visionaries, and creators. Think of me as a spiritual producer - finding brilliant minds and bringing them together to build something extraordinary.

Full-stack developer by trade, consciousness explorer by calling. Building tools at the intersection of pleasure, purpose, and innovation.

Resources:

Website: maxpetrusenko.com

Movement: @blindfold.miami ( IG )
GumRoad: https://maxpetrusenko.gumroad.com/
Newsletter: https://substack.com/@cryptobase
Church: https://mindfoldsanctuary.com/
LinkedIn: https://www.linkedin.com/in/max-petrusenko-40574b4a/
Github: https://github.com/maxpetrusenko

I am living proof you can be both a meditation master and a social butterfly while nurturing deep family bonds and friendships.

I am here to show you how technology and ancient practices can create an extraordinary life.