"use client";

import Image from "next/image";
import { useState } from "react";

interface InstagramEmbedProps {
  url: string;
  caption?: string;
  className?: string;
}

export function InstagramEmbed({
  url,
  caption,
  className = "",
}: InstagramEmbedProps) {
  const [imageError, setImageError] = useState(false);

  // Extract reel ID from URL
  const reelId = url.match(/\/reel\/([A-Za-z0-9_-]+)/)?.[1] || "";
  const cleanUrl = `https://www.instagram.com/reel/${reelId}/`;

  // Instagram thumbnail URL (works for most public posts)
  const thumbnailUrl = `https://instagram.com/p/${reelId}/media/?size=l`;

  return (
    <div className={`instagram-embed-container ${className}`}>
      <a
        href={cleanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="relative rounded-3xl overflow-hidden border border-[rgba(12,17,21,0.1)] bg-white/90 shadow-[0_20px_50px_rgba(12,17,21,0.12)] transition-all duration-300 group-hover:shadow-[0_30px_70px_rgba(12,17,21,0.2)] group-hover:scale-[1.02]">
          {/* Video preview container */}
          <div className="relative aspect-[9/16] bg-gradient-to-br from-[rgba(14,97,93,0.15)] to-[rgba(210,163,93,0.12)] overflow-hidden">
            {!imageError ? (
              <Image
                src={thumbnailUrl}
                alt="Instagram reel preview"
                fill
                sizes="(max-width: 768px) 100vw, 420px"
                className="object-cover"
                onError={() => setImageError(true)}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-[var(--accent-spirit)] opacity-60"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <p className="text-sm text-[var(--muted)]">Watch on Instagram</p>
                </div>
              </div>
            )}

            {/* Instagram-style gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                <svg
                  className="w-8 h-8 text-[var(--accent-spirit)] ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Instagram badge */}
            <div className="absolute top-4 left-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <span className="text-xs font-medium text-[var(--ink)]">
                  @maxpetrusenko
                </span>
              </div>
            </div>
          </div>
        </div>
      </a>
      {caption && (
        <div className="mt-4 p-4 rounded-2xl bg-white/60 border border-[rgba(12,17,21,0.06)]">
          <p className="text-sm text-[var(--ink-soft)] italic leading-relaxed">
            "{caption}"
          </p>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-[var(--accent-spirit)] hover:underline"
          >
            <span>Watch on Instagram</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
