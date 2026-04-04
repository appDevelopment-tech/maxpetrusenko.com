"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

/* ─── Types ─── */
interface Platform {
  platform: string;
  status: string;
  url: string | null;
  error: string | null;
}

interface Post {
  id: string;
  content: string;
  publishedAt: string;
  status: string;
  media: { url: string; type: string }[];
  platforms: Platform[];
}

interface ApiResponse {
  posts: Post[];
  count: number;
  fetchedAt: string;
  dailyCounts: Record<string, number>;
  platformCounts: Record<string, { published: number; failed: number; pending: number }>;
}

/* ─── Constants ─── */
const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
  tiktok:    { label: "TikTok",    color: "#ff0050", icon: "♪" },
  twitter:   { label: "X",         color: "#1DA1F2", icon: "𝕏" },
  linkedin:  { label: "LinkedIn",  color: "#0A66C2", icon: "in" },
  facebook:  { label: "Facebook",  color: "#1877F2", icon: "f" },
  instagram: { label: "Instagram", color: "#E4405F", icon: "◎" },
  reddit:    { label: "Reddit",    color: "#FF4500", icon: "r/" },
  pinterest: { label: "Pinterest", color: "#E60023", icon: "P" },
  youtube:   { label: "YouTube",   color: "#FF0000", icon: "▶" },
};

function isPublishedStatus(status: string): boolean {
  return status === "published";
}

function isFailedStatus(status: string): boolean {
  return ["failed", "error", "cancelled"].includes(status.toLowerCase());
}

function getPlatformStatusTone(platform: Platform) {
  const meta = PLATFORM_META[platform.platform] ?? { label: platform.platform, color: "#888", icon: "?" };

  if (isPublishedStatus(platform.status)) {
    return {
      label: meta.label,
      color: meta.color,
      background: `${meta.color}14`,
      border: `${meta.color}30`,
      dot: meta.color,
    };
  }

  if (isFailedStatus(platform.status)) {
    return {
      label: `${meta.label} failed`,
      color: "#ef4444",
      background: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.2)",
      dot: "#ef4444",
    };
  }

  return {
    label: `${meta.label} pending`,
    color: "#b45309",
    background: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.24)",
    dot: "#d97706",
  };
}

/* ─── Stat Card ─── */
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-5"
      style={{ backdropFilter: "blur(6px)" }}
    >
      {accent && (
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
          style={{ background: accent }}
        />
      )}
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-[var(--ink)]">{value}</p>
      {sub && (
        <p className="mt-0.5 text-xs text-[var(--muted)]">{sub}</p>
      )}
    </div>
  );
}

/* ─── Posts Per Day Bar Chart ─── */
function PostsPerDayChart({ dailyCounts }: { dailyCounts: Record<string, number> }) {
  const entries = Object.entries(dailyCounts).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return null;
  const maxCount = Math.max(...entries.map(([, c]) => c));

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-5" style={{ backdropFilter: "blur(6px)" }}>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Posts per day
      </p>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {entries.map(([date, count]) => {
          const pct = (count / maxCount) * 100;
          const day = new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <div key={date} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--ink)] px-2 py-1 text-[10px] font-medium text-white group-hover:block">
                {count} post{count !== 1 ? "s" : ""}
              </div>
              <div
                className="w-full rounded-t-md transition-all duration-300"
                style={{
                  height: `${Math.max(pct, 6)}%`,
                  background: "linear-gradient(180deg, var(--accent-tech) 0%, rgba(15,126,169,0.5) 100%)",
                  minHeight: 4,
                }}
              />
              <span className="mt-1.5 text-[9px] leading-none text-[var(--muted)]">
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Platform Breakdown ─── */
function PlatformBreakdown({ platformCounts }: { platformCounts: Record<string, { published: number; failed: number; pending: number }> }) {
  const entries = Object.entries(platformCounts).sort(
    ([, a], [, b]) => b.published + b.failed + b.pending - (a.published + a.failed + a.pending)
  );
  const total = entries.reduce((s, [, v]) => s + v.published + v.failed + v.pending, 0);
  if (total === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-5" style={{ backdropFilter: "blur(6px)" }}>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        Platform breakdown
      </p>
      <div className="space-y-3">
        {entries.map(([platform, counts]) => {
          const meta = PLATFORM_META[platform] ?? { label: platform, color: "#888", icon: "?" };
          const pct = Math.round(((counts.published + counts.failed + counts.pending) / total) * 100);
          return (
            <div key={platform}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
                    style={{ background: meta.color }}
                  >
                    {meta.icon}
                  </span>
                  <span className="font-medium text-[var(--ink)]">{meta.label}</span>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {counts.published} posted
                  {counts.pending > 0 ? ` · ${counts.pending} pending` : ""}
                  {counts.failed > 0 ? ` · ${counts.failed} failed` : ""}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: meta.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Growth Indicator ─── */
function GrowthIndicator({ posts }: { posts: Post[] }) {
  // Compare last 7 days vs previous 7 days
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = posts.filter((p) => now - new Date(p.publishedAt).getTime() < oneWeek);
  const lastWeek = posts.filter((p) => {
    const age = now - new Date(p.publishedAt).getTime();
    return age >= oneWeek && age < oneWeek * 2;
  });

  const thisCount = thisWeek.length;
  const lastCount = lastWeek.length;
  const growth = lastCount > 0 ? Math.round(((thisCount - lastCount) / lastCount) * 100) : thisCount > 0 ? 100 : 0;
  const isUp = growth >= 0;

  // Days since first post
  const firstPost = posts.length > 0 ? new Date(posts[posts.length - 1].publishedAt) : new Date();
  const daysSinceFirst = Math.max(1, Math.ceil((now - firstPost.getTime()) / (24 * 60 * 60 * 1000)));
  const avgPerDay = (posts.length / daysSinceFirst).toFixed(1);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="This week"
        value={thisCount}
        sub={`vs ${lastCount} last week`}
        accent="var(--accent-tech)"
      />
      <StatCard
        label="Growth"
        value={`${isUp ? "+" : ""}${growth}%`}
        sub="week over week"
        accent={isUp ? "var(--accent-spirit)" : "#ef4444"}
      />
      <StatCard
        label="Avg / day"
        value={avgPerDay}
        sub={`over ${daysSinceFirst} days`}
        accent="var(--accent-mindfold)"
      />
    </div>
  );
}

/* ─── Platform Link Badge ─── */
function PlatformBadge({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform.platform] ?? { label: platform.platform, color: "#888", icon: "?" };
  const tone = getPlatformStatusTone(platform);
  const hasUrl = !!platform.url;

  const inner = (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all"
      style={{
        background: tone.background,
        color: tone.color,
        border: `1px solid ${tone.border}`,
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: tone.dot }}
      />
      {tone.label}
      {hasUrl && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="ml-0.5 opacity-50">
          <path d="M3.5 2H10V8.5M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );

  if (hasUrl) {
    return (
      <a
        href={platform.url!}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </a>
    );
  }

  return inner;
}

/* ─── Post Card ─── */
function PostCard({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(post.publishedAt);
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const thumb = post.media?.[0]?.url;
  const isVideo = post.media?.[0]?.type === "video";
  const preview =
    post.content.length > 160
      ? post.content.slice(0, 160) + "…"
      : post.content;

  // Get the first available URL for quick link
  const firstUrl = post.platforms.find((p) => p.url)?.url;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/70 transition-all hover:border-[var(--accent-tech)] hover:shadow-md"
      style={{ backdropFilter: "blur(6px)" }}
    >
      <div
        className="flex cursor-pointer items-start gap-4 px-5 py-4"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
      >
        {thumb && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--line)]">
            {isVideo ? (
              <>
                <img
                  src={thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="text-white text-xs">▶</span>
                </div>
              </>
            ) : (
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-[var(--ink)]">{preview}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {post.platforms.map((p, i) => (
              <PlatformBadge key={`${p.platform}-${i}`} platform={p} />
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[11px] font-medium text-[var(--muted)]">{timeStr}</span>
          <span className="text-[10px] text-[var(--muted)]">{dateStr}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            className={`mt-1 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--line)] px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
            {post.content}
          </p>

          {/* Platform URLs */}
          {post.platforms.some((p) => p.url) && (
            <div className="mt-4 space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                View on platform
              </p>
              {post.platforms
                .filter((p) => p.url)
                .map((p, i) => {
                  const meta = PLATFORM_META[p.platform] ?? { label: p.platform, color: "#888" };
                  return (
                    <a
                      key={`url-${p.platform}-${i}`}
                      href={p.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[var(--line)]"
                      style={{ color: meta.color }}
                    >
                      <span className="font-semibold">{meta.label}</span>
                      <span className="truncate text-[var(--muted)]" style={{ maxWidth: 300 }}>
                        {p.url}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="shrink-0 opacity-40">
                        <path d="M3.5 2H10V8.5M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  );
                })}
            </div>
          )}

          {thumb && (
            <img
              src={thumb}
              alt=""
              className="mt-4 max-h-80 rounded-xl object-contain"
            />
          )}

          {post.platforms.some((p) => p.error) && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {post.platforms
                .filter((p) => p.error)
                .map((p) => (
                  <p key={p.platform}>
                    <strong>{PLATFORM_META[p.platform]?.label ?? p.platform}:</strong>{" "}
                    {p.error}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Group Posts by Date ─── */
function groupByDate(posts: Post[]): Record<string, Post[]> {
  const groups: Record<string, Post[]> = {};
  for (const post of posts) {
    const day = new Date(post.publishedAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(post);
  }
  return groups;
}

/* ─── Main Dashboard ─── */
export function SocialDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/social-posts")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => setData(d as ApiResponse))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-tech)] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700">
        Could not load posts. {error}
      </div>
    );
  }

  const grouped = groupByDate(data.posts);
  const days = Object.keys(grouped);

  // Summary stats
  const totalPosts = data.posts.length;
  const totalPublished = data.posts
    .flatMap((p) => p.platforms)
    .filter((p) => isPublishedStatus(p.status)).length;
  const totalFailed = data.posts
    .flatMap((p) => p.platforms)
    .filter((p) => isFailedStatus(p.status)).length;
  const totalPending = data.posts
    .flatMap((p) => p.platforms)
    .filter((p) => !isPublishedStatus(p.status) && !isFailedStatus(p.status)).length;
  const successRate = totalPublished + totalFailed > 0
    ? Math.round((totalPublished / (totalPublished + totalFailed)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        <StatCard label="Total posts" value={totalPosts} accent="var(--accent-tech)" />
        <StatCard label="Published" value={totalPublished} sub={`${successRate}% success`} accent="var(--accent-spirit)" />
        <StatCard label="Pending" value={totalPending} accent="#d97706" />
        <StatCard label="Failed" value={totalFailed} accent={totalFailed > 0 ? "#ef4444" : "var(--line)"} />
        <StatCard
          label="Platforms"
          value={Object.keys(data.platformCounts).length}
          sub={Object.keys(data.platformCounts).map((p) => PLATFORM_META[p]?.label ?? p).join(", ")}
        />
      </div>

      {/* Growth */}
      <GrowthIndicator posts={data.posts} />

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        <PostsPerDayChart dailyCounts={data.dailyCounts} />
        <PlatformBreakdown platformCounts={data.platformCounts} />
      </div>

      {/* Note about engagement metrics */}
      <div
        className="rounded-2xl border border-dashed border-[var(--accent-tech)]/30 bg-[var(--accent-tech)]/[0.04] px-5 py-4 text-sm text-[var(--muted)]"
      >
        <span className="font-semibold text-[var(--accent-tech)]">Views, likes &amp; followers</span>{" "}
        — engagement analytics require the late.dev analytics add-on. Once enabled, this dashboard will show per-post views, likes, comments, and follower growth over time.
      </div>

      {/* Posts grouped by day */}
      {days.map((day) => (
        <div key={day}>
          <div className="mb-3 flex items-center gap-3">
            <h3 className="font-serif text-lg font-semibold text-[var(--ink)]">
              {day}
            </h3>
            <span className="rounded-full bg-[var(--accent-tech)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--accent-tech)]">
              {grouped[day].length} post{grouped[day].length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {grouped[day].map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <p className="text-center text-xs text-[var(--muted)]">
        Data refreshes every 5 minutes · Powered by{" "}
        <a
          href="https://late.dev"
          target="_blank"
          rel="noopener"
          className="underline hover:text-[var(--accent-tech)]"
        >
          late.dev
        </a>
      </p>
    </div>
  );
}
