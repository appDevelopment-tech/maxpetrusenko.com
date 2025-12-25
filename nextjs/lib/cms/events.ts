import type { Event } from "@/types";

/**
 * Event data
 *
 * This is a static data source. In the future, this could be migrated
 * to a headless CMS or content management system.
 */
export const events: Event[] = [
  {
    id: "mindfold-create-infinite-elements",
    slug: "create-infinite-elements",
    title: "Mindfold at Create Infinite Elements",
    description:
      "100 people at a music festival learning how to feel through blindfolded presence journey.",
    date: "2024-11-15T14:00:00Z",
    location: "Create Infinite Elements Festival, Bali",
    capacity: 100,
    waiverUrl: "https://wa.me/17865436688",
  },
];

/**
 * Get all events
 */
export async function getEvents(): Promise<Event[]> {
  return events;
}

/**
 * Get event by slug
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  return events.find((e) => e.slug === slug) || null;
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(): Promise<Event[]> {
  const now = new Date().toISOString();
  return events.filter((e) => e.date > now);
}

/**
 * Get past events
 */
export async function getPastEvents(): Promise<Event[]> {
  const now = new Date().toISOString();
  return events.filter((e) => e.date <= now);
}
