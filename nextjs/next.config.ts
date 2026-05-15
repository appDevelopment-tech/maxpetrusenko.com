import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "miro.medium.com",
      },
      {
        protocol: "https",
        hostname: "cdn-images-1.medium.com",
      },
      {
        protocol: "https",
        hostname: "medium.com",
      },
      {
        protocol: "https",
        hostname: "**.medium.com",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "instagram.com",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Redirects for old URLs (404 fixes for Google Search Console)
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true, // 301 redirect
      },
      {
        source: "/home/",
        destination: "/",
        permanent: true, // 301 redirect
      },
      {
        source: "/mindfold",
        destination: "/mindfold/events",
        permanent: true, // 301 redirect
      },
      {
        source: "/mindfold/",
        destination: "/mindfold/events",
        permanent: true, // 301 redirect
      },
      {
        source: "/blog/spiritual-practices",
        destination: "/spirituality",
        permanent: true, // 301 redirect
      },
      {
        source: "/blog/spiritual-practices/",
        destination: "/spirituality",
        permanent: true, // 301 redirect
      },
      {
        source: "/blog/spiritual-practices/:path*",
        destination: "/spirituality",
        permanent: true, // 301 redirect
      },
      {
        source: "/couples-tantra",
        destination: "/couples-tantra-massage",
        permanent: true,
      },
      {
        source: "/couples-tantra-ubud",
        destination: "/couples-tantra-massage",
        permanent: true,
      },
      {
        source: "/tantra-massage-ubud",
        destination: "/spirituality",
        permanent: true,
      },
      {
        source: "/couples-tantric-massage",
        destination: "/couples-tantra-massage",
        permanent: true,
      },
    ];
  },

  // Performance headers
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600",
          },
        ],
      },
    ];
  },

  // Experimental features for App Router
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
