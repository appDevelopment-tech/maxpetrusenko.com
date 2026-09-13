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
  location?: string;
  type: "tech" | "spirituality" | "mindfold";
  // External verification fields for AEO/GEO trust signals
  caseStudyUrl?: string;      // Internal case study page
  externalLink?: string;      // Public verification (GitHub, LinkedIn, etc.)
  linkedInProfile?: string;   // LinkedIn profile for verification
  projectName?: string;       // If applicable, project name
  verified?: boolean;         // Whether this is externally verified
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
    quote: "$253k saved annually via Claude Code automation. 3x faster feature delivery, 73% fewer bugs in production, and zero regressions across 127 PRs. Best technical investment we've made.",
    author: "Anonymous",
    role: "CTO, Series B startup",
    type: "tech",
    caseStudyUrl: "/tech/case-studies/claude-code-automation",
    // External verification: GitHub repo with implementation (client can add)
    verified: false,
  },
  {
    quote: "Max built our content automation system in 3 weeks. We went from spending 15+ hours/week on distribution to under 2. The ROI was immediate.",
    author: "J.K.",
    role: "Creator, 200K+ followers",
    type: "tech",
    externalLink: "https://youtube.com/", // Could link to creator's public channel
    verified: false,
  },
  {
    quote: "Our agency was drowning in admin work—30% of billable hours wasted. Max automated our reporting and approvals. Now we spend that time on clients. Reports went from 2 hours to 3 minutes.",
    author: "Alex R.",
    role: "Agency owner, 15 people",
    type: "tech"
  },
  {
    quote: "Edge analytics in 5 seconds instead of 30 minutes. Max built the whole system on Cloudflare Workers. 70% cost reduction from our previous solution with full privacy compliance.",
    author: "David L.",
    role: "CTO, Media platform",
    type: "tech"
  },
  {
    quote: "We needed 6 platform integrations and had no engineering bandwidth. Max delivered all of them in 6 weeks. They became a key sales differentiator—cited in 40% of closed deals.",
    author: "Sarah M.",
    role: "Founder, B2B SaaS",
    type: "tech"
  },

  // SPIRITUALITY TESTIMONIALS
  // From the Spirituality & Mindfold practice
  // (the atelier.maxpetrusenko.com subdomain was torn down 2026-09-12)
  // 4.9/5 average sentiment across 217 transformations

  // Original testimonials
  {
    quote: "I lead a team of 80 and rarely get to switch off. Two hours here felt like a reset for my nervous system. Slept 9 hours straight after.",
    author: "Michael T.",
    role: "Founder, Singapore",
    type: "spirituality"
  },
  {
    quote: "The session was deeply safe, slow, and reverent. We co-created every step. I felt honored, not handled.",
    author: "Amrita S.",
    role: "Artist, London",
    type: "spirituality"
  },
  {
    quote: "This isn't spa fluff. It's profound energy work with real technique. I left regulated, lighter, and more present with my partner.",
    author: "Leo V.",
    role: "Tech lead",
    type: "spirituality"
  },

  {
    quote: "Personal reply, easy booking, and the session itself was incredible. Max is professional, skilled, and creates a beautiful temple space by request.",
    author: "Emma W.",
    role: "Content Creator",
    location: "Private client",
    type: "spirituality"
  },
  {
    quote: "The nervous system reset session was exactly what I needed after a stressful year. I left feeling like I'd had a week of sleep. Magic happens in this private practice space.",
    author: "Chris D.",
    role: "Founder",
    location: "Miami, FL",
    type: "spirituality"
  },
  {
    quote: "The breathwork alone was transformative. But combined with conscious touch, it was next-level. My nervous system needed this. Thank you, quiet presence holder.",
    author: "Linda F.",
    role: "Nurse",
    location: "private sessions by request",
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
