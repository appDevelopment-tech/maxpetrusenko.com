import { generateMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { ChinolaReviewClient } from "@/components/chinola/ChinolaReviewClient";

const REVIEW_TOKEN = "farm-michael-7d4e9c";

export const metadata = generateMetadata({
  title: "Chinola Farm Review",
  description: "Unlisted client page for reviewing passion fruit training boxes.",
  canonical: absoluteUrl(`/chinola/review/${REVIEW_TOKEN}`),
  noindex: true,
});

export default function ChinolaReviewPage() {
  return <ChinolaReviewClient token={REVIEW_TOKEN} />;
}
