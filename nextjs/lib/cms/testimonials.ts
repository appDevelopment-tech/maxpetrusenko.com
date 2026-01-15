/**
 * Testimonials data
 *
 * Add your testimonials here. They will appear on the relevant pages.
 * For privacy, you can use just a first name or descriptive label.
 */

export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  type: "tech" | "spirituality" | "mindfold";
}

export const testimonials: Testimonial[] = [
  // TECH TESTIMONIALS
  // From AI automation and software development projects
  {
    quote: "Max built our content automation system in 3 weeks. We went from spending 15+ hours/week on distribution to under 2. The ROI was immediate.",
    author: "J.K.",
    role: "Creator, 200K+ followers",
    type: "tech"
  },
  {
    quote: "We needed 6 platform integrations and had no engineering bandwidth. Max delivered all of them in 6 weeks. They became a key sales differentiator.",
    author: "Sarah M.",
    role: "Founder, B2B SaaS",
    type: "tech"
  },
  {
    quote: "Our agency was drowning in admin work—30% of billable hours wasted. Max automated our reporting and approvals. Now we spend that time on clients.",
    author: "Alex R.",
    role: "Agency owner, 15 people",
    type: "tech"
  },
  {
    quote: "Edge analytics in 5 seconds instead of 30 minutes. Max built the whole system on Cloudflare Workers. 70% cost reduction from our previous solution.",
    author: "David L.",
    role: "CTO, Media platform",
    type: "tech"
  },

  // SPIRITUALITY TESTIMONIALS
  // From Presence Atelier (atelier.maxpetrusenko.com)
  // 4.9/5 average sentiment across 217 transformations
  {
    quote: "I lead a team of 80 and rarely get to switch off. Two hours here felt like a reset for my nervous system. Slept 9 hours straight after.",
    author: "Michael T.",
    role: "Founder, Singapore",
    type: "spirituality"
  },
  {
    quote: "The tantra session was deeply safe, slow, and reverent. We co-created every step. I felt honored, not handled.",
    author: "Amrita S.",
    role: "Artist, London",
    type: "spirituality"
  },
  {
    quote: "This isn't spa fluff. It's profound energy work with real technique. I left regulated, lighter, and more present with my partner.",
    author: "Leo V.",
    role: "Tech lead, Bali",
    type: "spirituality"
  },

  // MINDFOLD TESTIMONIALS
  // From Create Infinite Elements and guided sensory journeys
  {
    quote: "100 people dancing blindfold together—I've never felt anything like it. The removal of visual input unlocked something profound.",
    author: "Maya R.",
    role: "Create Infinite Elements participant",
    type: "mindfold"
  },
  {
    quote: "I came for the music, stayed for the blindfold journey. Max held the container perfectly. I felt safe to go deep.",
    author: "Tomás K.",
    role: "Festival attendee",
    type: "mindfold"
  },
  {
    quote: "The sensory subtraction approach is brilliant. Without sight, my whole body woke up. I left feeling more present than I have in years.",
    author: "Elena V.",
    role: "Mindfold participant",
    type: "mindfold"
  },
];

/**
 * Get testimonials by type
 */
export function getTestimonialsByType(type: "tech" | "spirituality" | "mindfold"): Testimonial[] {
  return testimonials.filter((t) => t.type === type);
}

/**
 * Get all testimonials
 */
export function getAllTestimonials(): Testimonial[] {
  return testimonials;
}
