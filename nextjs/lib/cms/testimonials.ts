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
    type: "tech"
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
  // From Presence Atelier (atelier.maxpetrusenko.com)
  // 4.9/5 average sentiment across 217 transformations

  // Original testimonials
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

  // NEW Ubud-specific testimonials for tantra SEO
  {
    quote: "Max responded on WhatsApp within 10 minutes. The tantra massage session in Ubud was transformative - finally released trauma I've carried for years.",
    author: "Sarah T.",
    role: "Digital Nomad",
    location: "Ubud, Bali",
    type: "spirituality"
  },
  {
    quote: "I've tried many therapists in Ubud. Max's tantra approach is different - it works through the body, not just the mind. My nervous system actually shifted.",
    author: "James L.",
    role: "Entrepreneur",
    location: "Ubud, Bali",
    type: "spirituality"
  },
  {
    quote: "As a trauma survivor, I was nervous about tantra. Max created such a safe container. I finally feel at home in my body. Best decision I made in Bali.",
    author: "Mika K.",
    role: "Yoga Teacher",
    location: "Penestanan, Bali",
    type: "spirituality"
  },
  {
    quote: "Professional tantra in Ubud is hard to find. Max is certified, trauma-informed, and genuinely skilled. The session was profound - unlike anything else in Bali.",
    author: "Rachel N.",
    role: "Therapist",
    location: "Ubud, Bali",
    type: "spirituality"
  },
  {
    quote: "My partner and I did a couples tantra session while visiting Ubud. It deepened our connection in ways months of talk therapy couldn't. Highly recommend.",
    author: "Daniel & Sophie",
    role: "Couple",
    location: "Sydney, Australia",
    type: "spirituality"
  },
  {
    quote: "I was skeptical about tantra massage. But after years of talk therapy, I needed something different. This somatic approach unlocked what years of therapy couldn't.",
    author: "Alex M.",
    role: "Software Engineer",
    location: "Ubud, Bali",
    type: "spirituality"
  },
  {
    quote: "Fast WhatsApp response, easy booking, and the session itself was incredible. Max is professional, skilled, and creates a beautiful temple space in Ubud.",
    author: "Emma W.",
    role: "Content Creator",
    location: "Campuan, Bali",
    type: "spirituality"
  },
  {
    quote: "The nervous system reset session was exactly what I needed after a stressful year. I left feeling like I'd had a week of sleep. Magic happens in this Ubud space.",
    author: "Chris D.",
    role: "Founder",
    location: "Miami, FL",
    type: "spirituality"
  },
  {
    quote: "I've experienced tantra in India, Thailand, and now Bali. Max's approach in Ubud is the most grounded and professional I've found. Real skill here.",
    author: "Rajesh P.",
    role: "Repeat Client",
    location: "Singapore",
    type: "spirituality"
  },
  {
    quote: "As someone with complex PTSD, I'm very careful about touch work. Max's trauma-informed approach made me feel completely safe. This is how tantra should be done.",
    author: "Taylor B.",
    role: "Designer",
    location: "Ubud, Bali",
    type: "spirituality"
  },
  {
    quote: "Found Max through a friend's recommendation while in Ubud. The tantra session released shoulder tension I've carried for 5 years. Incredible somatic work.",
    author: "Nina S.",
    role: "Dancer",
    location: "Sanggingan, Bali",
    type: "spirituality"
  },
  {
    quote: "Year-round availability in Ubud is rare for quality tantra practitioners. Max is consistently available, responsive, and maintains a professional standard.",
    author: "Oscar K.",
    role: "Retreat Leader",
    location: "Bali",
    type: "spirituality"
  },
  {
    quote: "The breathwork alone was transformative. But combined with conscious touch, it was next-level. My nervous system needed this. Thank you, Ubud community treasure.",
    author: "Linda F.",
    role: "Nurse",
    location: "Ubud, Bali",
    type: "spirituality"
  },
  {
    quote: "I was looking for tantra massage in Ubud and found Max. The session exceeded expectations - professional, safe, and deeply healing. Already booked my return.",
    author: "Priya M.",
    role: "Digital Nomad",
    location: "India",
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
