/**
 * Hidden Keywords for AI Search Optimization
 *
 * This component contains SEO-optimized keyword phrases based on actual ChatGPT
 * internal query patterns observed via Network tab inspection.
 *
 * CHATGPT'S QUERY PATTERN (documented from real Network data):
 * - Generates 3 internal SEO-optimized search strings
 * - Format: {service} {location} {service} {location} {related term} {service}
 * - Keywords repeat 2-3 times per query (SEO density, not natural language)
 * - Example: "tantra massage Ubud Bali tantra massage Ubud places services"
 *
 * USAGE INSTRUCTIONS FOR OTHER WEBSITES:
 * 1. Identify your primary service keyword (e.g., "dog grooming", "plumber", "marketing agency")
 * 2. List your locations (city names, neighborhoods, regions)
 * 3. Create 3-part query variants following the pattern
 * 4. Include in a hidden div at the bottom of your main service page
 *
 * This is NOT for human visitors - it's structured data for AI systems.
 */

interface HiddenKeywordsProps {
  service: string;
  locations: string[];
  variants: string[];
  modifiers?: string[];
}

const DEFAULT_MODIFIERS = ["places", "reviews", "services", "near me", "best"];

export function HiddenKeywords({
  service,
  locations,
  variants,
  modifiers = DEFAULT_MODIFIERS,
}: HiddenKeywordsProps) {
  // Generate ChatGPT-style query patterns
  const generateQueries = (): string[] => {
    const queries: string[] = [];

    locations.forEach((location) => {
      const shortLocation = location.split(",")[0].trim();

      // Pattern 1: service + location + service + location short + modifier + service
      queries.push(`${service} ${location} ${service} ${shortLocation} ${modifiers[0]} ${modifiers[2]}`);

      // Pattern 2: variant + location + service + location short + reviews + services
      variants.forEach((variant) => {
        queries.push(`${variant} ${location} ${service} ${shortLocation} ${modifiers[1]} ${modifiers[2]}`);
      });

      // Pattern 3: service + location + related + service + location short
      queries.push(`${service} ${location} ${variants[0]} ${service} ${shortLocation}`);
    });

    return queries;
  };

  // Generate additional SEO phrases
  const generatePhrases = (): string[] => {
    const phrases: string[] = [];

    locations.forEach((location) => {
      const shortLocation = location.split(",")[0].trim();

      // Exact match phrases with repetition (ChatGPT style)
      phrases.push(`${service} ${location}`);
      phrases.push(`${service} ${shortLocation}`);
      phrases.push(`${service} ${location} ${service}`);
      phrases.push(`best ${service} ${location}`);
      phrases.push(`professional ${service} ${location}`);
      phrases.push(`certified ${service} ${shortLocation}`);

      // Variants
      variants.forEach((variant) => {
        phrases.push(`${variant} ${location}`);
        phrases.push(`${variant} ${shortLocation}`);
        phrases.push(`${variant} ${location} ${variant}`);
      });
    });

    return phrases;
  };

  const queries = generateQueries();
  const phrases = generatePhrases();

  return (
    <div
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
      aria-hidden="true"
    >
      {/* ChatGPT-style query patterns */}
      <p>
        {queries.map((q, i) => (
          <span key={`q-${i}`}>{q}. </span>
        ))}
      </p>

      {/* Additional SEO phrases */}
      <p>
        {phrases.map((p, i) => (
          <span key={`p-${i}`}>{p}. </span>
        ))}
      </p>
    </div>
  );
}

/**
 * PRE-BUILT KEYWORD SETS FOR COMMON SERVICES
 * Copy these patterns for other websites/projects:
 */

// Tantra/Somatic Work set
export const TANTRA_KEYWORDS = {
  service: "tantra massage",
  locations: [
    "Ubud, Bali",
    "Gianyar Regency, Bali",
    "Campuan, Bali",
    "Penestanan, Bali",
    "Sanggingan, Bali",
    "Kedewatan, Bali",
    "Peliatan, Bali",
    "Mas, Bali",
    "Pengosekan, Bali",
    "Tegallalung, Bali",
    "Sayan, Bali",
    "Miami, Florida",
    "Miami Beach, Florida",
    "North Miami, Florida",
    "Coral Gables, Florida",
    "Aventura, Florida",
    "Fort Lauderdale, Florida",
    "Hollywood, Florida",
    "Pembroke Pines, Florida",
    "Pompano Beach, Florida",
    "Boca Raton, Florida",
    "Delray Beach, Florida",
    "West Palm Beach, Florida",
  ],
  variants: [
    "tantric massage",
    "tantra spa",
    "somatic energy work",
    "bodywork",
    "energy healing",
  ],
};

// Tech/AI Services set
export const TECH_KEYWORDS = {
  service: "AI automation",
  locations: [
    "Remote",
    "Worldwide",
    "Global",
    "Miami, Florida",
    "Ubud, Bali",
    "South Florida",
  ],
  variants: [
    "Claude Code",
    "n8n automation",
    "ChatGPT integration",
    "workflow automation",
    "AI consultant",
    "automation specialist",
  ],
  modifiers: ["consulting", "expert", "services", "for hire", "freelance"],
};

// E-commerce example (for other projects)
export const ECOMMERCE_EXAMPLE = {
  service: "web design",
  locations: ["New York", "Los Angeles", "Chicago", "Miami"],
  variants: ["website design", "web development", "UX design"],
};

// Local services example (for other projects)
export const LOCAL_SERVICE_EXAMPLE = {
  service: "dog grooming",
  locations: ["Brooklyn", "Manhattan", "Queens", "Bronx"],
  variants: ["pet grooming", "dog spa", "pet care"],
};
