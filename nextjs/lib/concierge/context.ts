import type { ConciergeContext, ConciergeVisit } from "./types";

export type ConciergeLane = "somatic" | "tech" | "bridge" | "general";

export interface ConciergeContextPayload {
  currentPath: string;
  recentPaths: string[];
  suggestedQuestion?: string | null;
  dwellMs?: number | null;
}

export interface RouteContext {
  lane: ConciergeLane;
  label: string;
  summary: string;
  proactiveQuestion: string;
  suggestedCta: string;
}

interface RouteContextRule {
  prefixes: string[];
  lane: ConciergeLane;
  label: string;
  question: string;
}

const ROUTE_RULES: RouteContextRule[] = [
  {
    prefixes: ["/spirituality", "/somatic", "/tantra-massage-ubud"],
    lane: "somatic",
    label: "somatic work",
    question:
      "Want help understanding boundaries, pacing, or what a first session could feel like?",
  },
  {
    prefixes: [
      "/tech",
      "/ai-workflow-automation",
      "/n8n-automation",
      "/claude-code-consultant",
      "/socialmedia",
    ],
    lane: "tech",
    label: "tech consulting",
    question:
      "Want help figuring out the right first AI workflow, stack, or project scope?",
  },
  {
    prefixes: [
      "/blog/consciousness-tech",
      "/performance",
      "/mindfold",
      "/identity",
      "/consciousness-assistant",
    ],
    lane: "bridge",
    label: "consciousness and performance",
    question:
      "Curious how this connects to your own practice, work, or a project you are building?",
  },
  {
    prefixes: ["/blog"],
    lane: "general",
    label: "writing and ideas",
    question:
      "Something here caught your attention. Want a gentle summary or the best next page for your situation?",
  },
];

function getRuleForPath(pathname: string): RouteContextRule | null {
  return (
    ROUTE_RULES.find((rule) =>
      rule.prefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )
    ) ?? null
  );
}

export function sanitizeRecentPaths(paths: string[]): string[] {
  const clean = paths
    .map((path) => path.trim())
    .filter((path) => path.startsWith("/") && !path.startsWith("/api/"));

  const deduped: string[] = [];
  for (const path of clean) {
    if (deduped[deduped.length - 1] !== path) {
      deduped.push(path);
    }
  }

  return deduped.slice(-8);
}

export function sanitizeVisitHistory(history?: ConciergeVisit[]): ConciergeVisit[] {
  if (!Array.isArray(history)) return [];

  return history
    .map((visit) => ({
      pathname:
        typeof visit.pathname === "string" && visit.pathname.startsWith("/")
          ? visit.pathname
          : "/",
      title:
        typeof visit.title === "string" ? visit.title.slice(0, 180) : undefined,
      enteredAt:
        typeof visit.enteredAt === "string" && visit.enteredAt
          ? visit.enteredAt
          : new Date().toISOString(),
    }))
    .filter((visit) => !visit.pathname.startsWith("/api/"))
    .slice(-12);
}

export function inferConciergeLane(paths: string[]): ConciergeLane {
  const counts: Record<ConciergeLane, number> = {
    somatic: 0,
    tech: 0,
    bridge: 0,
    general: 0,
  };

  for (const path of sanitizeRecentPaths(paths)) {
    const rule = getRuleForPath(path);
    if (rule) {
      counts[rule.lane] += 1;
    }
  }

  const ranked = Object.entries(counts).sort(([, a], [, b]) => b - a);
  if (!ranked[0] || ranked[0][1] === 0) {
    return "general";
  }

  return ranked[0][0] as ConciergeLane;
}

export function inferLaneFromContext(context: ConciergeContext): ConciergeLane {
  const history = sanitizeVisitHistory(context.history);
  return inferConciergeLane([
    context.pathname,
    ...history.map((visit) => visit.pathname),
  ]);
}

export function getSuggestedConciergeQuestion(
  currentPath: string,
  recentPaths: string[]
): string {
  const paths = sanitizeRecentPaths([...recentPaths, currentPath]);
  const currentRule = getRuleForPath(currentPath);
  if (currentRule) {
    return currentRule.question;
  }

  const lane = inferConciergeLane(paths);
  switch (lane) {
    case "somatic":
      return "You have been exploring the somatic side. Want help finding the right entry point or asking a first question?";
    case "tech":
      return "You have been on the tech side for a while. Want help translating what you need into a first project scope?";
    case "bridge":
      return "You have been moving through the bridge pages. Want help relating these ideas to your own work or practice?";
    default:
      return "If you want, tell me what brought you here. Somatic work, tech, or the bridge between the two all make sense.";
  }
}

export function getConciergeContextLabel(pathname: string): string {
  return getRuleForPath(pathname)?.label ?? "general browsing";
}

export function buildConciergeVisitSummary(
  currentPath: string,
  recentPaths: string[]
): string {
  const paths = sanitizeRecentPaths([...recentPaths, currentPath]);
  const currentLabel = getConciergeContextLabel(currentPath);
  const lane = inferConciergeLane(paths);
  const history = paths.slice(-4).join(" -> ");

  return `Current page context: ${currentLabel}. Dominant lane: ${lane}. Recent paths: ${history || currentPath}.`;
}

export function buildContextSummary(context: ConciergeContext): string {
  const history = sanitizeVisitHistory(context.history);
  return [
    buildConciergeVisitSummary(
      context.pathname,
      history.map((visit) => visit.pathname)
    ),
    context.title ? `Current title: ${context.title}` : null,
    context.proactivePrompt ? `Prompt shown: ${context.proactivePrompt}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function getRouteContext(pathname: string): RouteContext {
  const safePath = pathname || "/";
  const rule = getRuleForPath(safePath);
  const lane = rule?.lane ?? "general";
  const label = rule?.label ?? "general browsing";

  return {
    lane,
    label,
    summary: `Visitor is browsing ${label}.`,
    proactiveQuestion:
      rule?.question ?? getSuggestedConciergeQuestion(safePath, []),
    suggestedCta:
      lane === "somatic"
        ? "Ask about sessions"
        : lane === "tech"
          ? "Ask about a project"
          : lane === "bridge"
            ? "Ask a bridge question"
            : "Ask anything",
  };
}
