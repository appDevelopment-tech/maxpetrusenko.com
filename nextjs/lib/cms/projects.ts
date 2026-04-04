import type { Project } from "@/types";

/**
 * Project data
 *
 * This is a static data source. In the future, this could be migrated
 * to a headless CMS or content management system.
 */
export const projects: Project[] = [
  {
    id: "claude-subagents",
    slug: "claude-subagents",
    title: "Claude Code Sub-Agents",
    description:
      "Production deployment of autonomous AI agents with write access to production code. Achieved $253k annual savings, 3x faster feature delivery, and 73% fewer bugs.",
    image: "https://pbs.twimg.com/media/GxxJBKwW4AAUxYs?format=jpg&name=900x900",
    link: "https://x.com/petrusenko_max/status/1953516625161834824",
    status: "live",
    category: "tech",
    tags: ["AI", "Claude", "Automation", "DevOps"],
  },
  {
    id: "presence-atelier",
    slug: "presence-atelier",
    title: "Presence Atelier",
    description:
      "Private tantra and somatic energy work practice in Ubud, Bali. Deep rewiring and nervous system reset through embodied presence.",
    image: "/images/atelier.svg",
    link: "https://atelier.maxpetrusenko.com",
    status: "live",
    category: "product",
    tags: ["Somatic", "Tantra", "Coaching", "Ubud"],
  },
  {
    id: "mindfold",
    slug: "mindfold",
    title: "Mindfold",
    description:
      "Blindfolded presence journeys to deepen awareness and trust. Group or 1:1 formats for sensory subtraction and expanded perception.",
    image: "/images/mindfold.svg",
    link: "/mindfold/events",
    status: "live",
    category: "product",
    tags: ["Sensory", "Presence", "Workshop", "Embodiment"],
  },
];

/**
 * Get all projects
 */
export async function getProjects(): Promise<Project[]> {
  return projects;
}

/**
 * Get project by slug
 */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  return projects.find((p) => p.slug === slug) || null;
}

/**
 * Get projects by category
 */
export async function getProjectsByCategory(
  category: Project["category"]
): Promise<Project[]> {
  return projects.filter((p) => p.category === category);
}

/**
 * Get projects by status
 */
export async function getProjectsByStatus(status: Project["status"]): Promise<Project[]> {
  return projects.filter((p) => p.status === status);
}

/**
 * Get projects by tag
 */
export async function getProjectsByTag(tag: string): Promise<Project[]> {
  return projects.filter((p) =>
    p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Get all unique project tags
 */
export async function getProjectTags(): Promise<Array<{ name: string; count: number }>> {
  const tagMap = new Map<string, number>();

  for (const project of projects) {
    for (const tag of project.tags) {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
