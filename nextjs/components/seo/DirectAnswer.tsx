import { JsonLd } from "./JsonLd";

interface DirectAnswerProps {
  /** The main question this content answers */
  question: string;
  /** 40-60 word direct answer optimized for AI extraction */
  answer: string;
  /** Optional shorter UI copy when schema copy is too dense for page layout */
  displayAnswer?: string;
  /** Optional short label for the visible card */
  label?: string;
  /** Optional schema type for enhanced markup */
  schemaType?: "FAQPage" | "WebPage" | "TechArticle";
  /** Visual treatment for the visible card */
  variant?: "default" | "overlay" | "embedded" | "spotlight";
  /** Optional additional class name */
  className?: string;
  /** Render JSON-LD only, no visible UI */
  showUi?: boolean;
}

/**
 * Direct Answer block for AI citation optimization
 *
 * Placement: At the very top of page content, before H1
 * Purpose: Provide extractable, citation-ready answers for LLMs
 *
 * Guidelines:
 * - Keep answer to 40-60 words
 * - Structure: claim → evidence → outcome
 * - Use concrete facts, not marketing language
 * - Include specific metrics when possible
 *
 * @see https://www.getpassionfruit.com/blog/faq-schema-for-ai-answers
 * @see https://wellows.com/blog/schema-and-nlp-best-practices-for-ai-search/
 */
export function DirectAnswer({
  question,
  answer,
  displayAnswer,
  label = "Overview",
  schemaType = "FAQPage",
  variant = "default",
  className,
  showUi = true,
}: DirectAnswerProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": schemaType,
    ...(schemaType === "FAQPage" ? {
      mainEntity: [
        {
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        },
      ],
    } : {
      name: question,
      description: answer,
    }),
  };

  return (
    <>
      <JsonLd type={schemaType} data={schema} />
      {showUi ? (
        <div
          className={["direct-answer", className].filter(Boolean).join(" ")}
          data-direct-answer="true"
          data-variant={variant}
        >
          <p className="direct-answer-label">{label}</p>
          <p className="direct-answer-text">{displayAnswer ?? answer}</p>
        </div>
      ) : null}
    </>
  );
}
