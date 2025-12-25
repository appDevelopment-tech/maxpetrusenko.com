# Max Petrusenko - Next.js Website

This is a Next.js 14 website with programmatic SEO, built with TypeScript, Tailwind CSS, and the App Router.

## Features

- **Programmatic SEO**: Dynamic blog articles from Medium RSS, project pages, and tag pages
- **Dynamic Metadata**: Open Graph, Twitter Cards, and JSON-LD structured data
- **Performance Optimized**: Next.js Image optimization, font optimization, caching headers
- **TypeScript**: Full type safety across the codebase
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **API Routes**: Cloudflare Workers-compatible edge functions
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

#### Setup Steps:

1. **Create KV Namespace**:
   - Go to Cloudflare Dashboard > Workers & Pages > KV
   - Create a new namespace called `EMAIL_SUBS`
   - Copy the namespace ID

2. **Configure Environment Variables**:
   - In Cloudflare Pages > Settings > Environment Variables
   - Add KV binding: `EMAIL_SUBS` → your namespace ID

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

## License

MIT
