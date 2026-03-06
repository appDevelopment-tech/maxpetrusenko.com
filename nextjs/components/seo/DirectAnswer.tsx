import { JsonLd } from "./JsonLd";

interface DirectAnswerProps {
  /** The main question this content answers */
  question: string;
  /** 40-60 word direct answer optimized for AI extraction */
  answer: string;
  /** Optional schema type for enhanced markup */
  schemaType?: "FAQPage" | "WebPage" | "TechArticle";
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
export function DirectAnswer({ question, answer, schemaType = "FAQPage" }: DirectAnswerProps) {
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
      <div className="direct-answer" data-direct-answer="true">
        <p className="direct-answer-text">{answer}</p>
      </div>
    </>
  );
}
