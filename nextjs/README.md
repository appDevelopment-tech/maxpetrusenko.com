# Max Petrusenko - Next.js Website

This is a Next.js 14 website with programmatic SEO, built with TypeScript, Tailwind CSS, and the App Router.

## Features

- **Programmatic SEO**: Dynamic blog articles from Medium RSS, project pages, and tag pages
- **Dynamic Metadata**: Open Graph, Twitter Cards, and JSON-LD structured data
- **Performance Optimized**: Next.js Image optimization, font optimization, caching headers
- **TypeScript**: Full type safety across the codebase
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **API Routes**: Cloudflare Workers-compatible edge functions
- **Private Workspace**: Google sign-in via Supabase for people/team dashboard access
- **Sitemap & Robots**: Auto-generated based on content

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Update Google Analytics ID in .env.local
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
# NEXT_PUBLIC_GA_ENABLED=true
```

### Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Project Structure

```
nextjs/
├── app/                    # Next.js App Router
│   ├── (main)/            # Main site route group
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Home page
│   │   ├── links/         # Links hub
│   │   ├── tech/          # Tech portfolio
│   │   │   ├── [slug]/    # Dynamic project pages
│   │   ├── spirituality/   # Spirituality page
│   │   ├── about/         # About page
│   │   └── mindfold/
│   │       └── events/    # Mindfold events
│   ├── blog/              # Blog section
│   │   ├── page.tsx       # Blog index
│   │   ├── [slug]/        # Article pages
│   │   └── tag/[tag]/     # Tag pages
│   ├── api/               # API routes
│   │   ├── subscribe/     # Email subscription
│   │   └── articles/      # Medium RSS proxy
│   ├── sitemap.ts         # Dynamic sitemap
│   └── robots.ts          # Robots.txt
├── components/            # React components
│   ├── seo/              # SEO components
│   ├── layout/           # Header, Footer
│   ├── ui/               # Reusable UI
│   ├── forms/            # Form components
│   └── analytics/        # Analytics
├── lib/                  # Utilities
│   ├── seo/             # Metadata, sitemap helpers
│   ├── cms/             # Content management
│   ├── api/             # Medium RSS, KV
│   └── utils/           # Validators, helpers
├── data/                # Static data
├── types/               # TypeScript types
├── config/              # Site configuration
└── styles/              # Global styles
```

## Deployment

### Cloudflare Pages (Recommended)

```bash
# Build for Cloudflare Pages
npm run pages:build

# Preview locally
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

GitHub also has a manual fallback workflow named `Cloudflare Pages Fallback Deploy`.
Use it from the Actions tab when Cloudflare's Git-triggered production deploy misses a commit.
It is intentionally `workflow_dispatch` only so it does not create duplicate production deploys while Git integration remains enabled.

#### Setup Steps:

1. **Create KV Namespaces**:
   - Go to Cloudflare Dashboard > Workers & Pages > KV
   - Create a new namespace called `EMAIL_SUBS`
   - Create a new namespace called `CONCIERGE_THREADS`
   - Copy the namespace ID

2. **Configure Environment Variables**:
   - In Cloudflare Pages > Settings > Environment Variables
   - Add KV binding: `EMAIL_SUBS` → your namespace ID
   - Add KV binding: `CONCIERGE_THREADS` → your namespace ID
   - Add secrets: `CONCIERGE_ADMIN_PASSWORD`, `CONCIERGE_SESSION_SECRET`
   - Add social dashboard secret: `SOCIAL_POSTS_PRIMARY_API_KEY`
     - fallback alias also supported in code: `GETLATE_DEV_API_KEY_FREE`
   - Optional external social service URL: `SOCIAL_AGENT_BASE_URL`
     - when set, `/api/social-posts` will read from the Coolify/VPS service first
   - Optional Cloudflare edge DNS override: `SOCIAL_AGENT_RESOLVE_OVERRIDE`
     - use this if the Pages runtime needs a stable origin hostname while keeping the public agent URL on `SOCIAL_AGENT_BASE_URL`
   - Add KV binding: `CONCIERGE_THREADS` → a namespace for Message Max threads
   - Add optional KV binding: `AI_RATE_LIMITS` → a namespace for public endpoint throttling
   - Add environment variables: `CONCIERGE_ADMIN_PASSWORD`, `CONCIERGE_SESSION_SECRET`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
  - Add workspace auth variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `WORKSPACE_ALLOWED_EMAILS`, `WORKSPACE_ALLOWED_DOMAINS`

   Concierge threads persist more than transcripts. The same KV store now keeps:
   - volunteered contact details
   - inferred intent, stage, score, urgency, and next step
   - manual CRM controls from the inbox: stage override, owner, notes, and follow-up timestamps
   - route and visit context for follow-up inside `/inbox` and `/workspace`

3. **Workspace CRM Data**:
   - `/workspace` is the main CRM dashboard
   - concierge threads sync into Supabase `people` and `touchpoints`
   - import WhatsApp history into the same tables with `npm run crm:import:whatsapp`
   - set `SUPABASE_SERVICE_ROLE_KEY` for local imports and `WHATSAPP_DB_PATH` if the SQLite file is not in the default NanoClaw path

3. **Connect Repository**:
   - Connect your Git repository to Cloudflare Pages
   - Set build command: `npm run pages:build`
   - Set output directory: `.vercel/output/static`

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Content Management

### Projects

Edit `lib/cms/projects.ts` to add/modify projects:

```typescript
{
  id: "project-id",
  slug: "project-slug",
  title: "Project Title",
  description: "Description",
  image: "/images/project.jpg",
  link: "https://project-url.com",
  status: "live", // or "mvp", "in-progress"
  category: "tech", // or "product", "automation"
  tags: ["Tag1", "Tag2"],
}
```

### Events

Edit `lib/cms/events.ts` to add/modify events.

### Blog Articles

Articles are automatically fetched from your Medium RSS feed. To add new articles, simply publish on Medium and they will appear on the site after revalidation.

## SEO Features

### Dynamic Sitemap
- Automatically includes all static pages
- Includes blog articles from Medium
- Includes project pages
- Revalidates on each build

### Structured Data
- JSON-LD for WebPage, Article, Person, Organization, BreadcrumbList
- Auto-generated for each page type

### Metadata
- Open Graph tags for social sharing
- Twitter Card support
- Canonical URLs
- Robots meta tags

## Performance

- **Images**: Next.js Image optimization with AVIF/WebP
- **Fonts**: next/font for automatic font optimization
- **Caching**: Edge caching for API responses
- **Static Generation**: Pre-rendered pages where possible
- **ISR**: Incremental Static Regeneration for dynamic content

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics Measurement ID | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_GA_ENABLED` | Enable Google Analytics | `false` |
| `CONCIERGE_ADMIN_PASSWORD` | Password for the admin concierge inbox | `change-me` |
| `CONCIERGE_SESSION_SECRET` | Secret used to sign admin session cookies | unset |
| `CONCIERGE_ADMIN_PASSWORD` | Password for `/inbox/sign-in` | unset |
| `CONCIERGE_SESSION_SECRET` | Secret used to sign inbox admin cookies | unset |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public Turnstile site key | unset |
| `TURNSTILE_SECRET_KEY` | Private Turnstile secret | unset |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for Google auth | unset |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for browser/server auth client | unset |
| `WORKSPACE_ALLOWED_EMAILS` | Comma-separated Google accounts allowed into `/workspace` | unset |
| `WORKSPACE_ALLOWED_DOMAINS` | Optional comma-separated Google domains allowed into `/workspace` before DB membership check | unset |

## Private Workspace

The private workspace now lives at `/workspace` and is intentionally separate from the concierge widget.

Setup:

1. Create a Supabase project.
2. Enable Google as an Auth provider in Supabase.
3. Add your site callback URL: `/auth/callback`.
4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `WORKSPACE_ALLOWED_EMAILS`, and optionally `WORKSPACE_ALLOWED_DOMAINS`.
5. Run the starter SQL in [supabase/workspace-schema.sql](./supabase/workspace-schema.sql).

The dashboard reads:

- `maxpetrusenko_workspace_people`
- `maxpetrusenko_workspace_teams`
- recent concierge threads as signal cards

## License

MIT
