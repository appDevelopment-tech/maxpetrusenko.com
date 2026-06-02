import { notFound } from "next/navigation";
import { generateMetadata as buildMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { ChinolaReviewClient } from "@/components/chinola/ChinolaReviewClient";

const REVIEW_TOKENS = new Set(["kaggle-health-open-v1"]);

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateStaticParams() {
  return Array.from(REVIEW_TOKENS).map((token) => ({ token }));
}

function generateMetadataForToken(token: string) {
  return buildMetadata({
    title: "Chinola Training Review",
    description: "Unlisted review page for checking passion fruit training boxes.",
    canonical: absoluteUrl(`/chinola/review/${token}`),
    noindex: true,
  });
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  return generateMetadataForToken(token);
}

export default async function ChinolaReviewPage({ params }: PageProps) {
  const { token } = await params;

  if (!REVIEW_TOKENS.has(token)) {
    notFound();
  }

  return <ChinolaReviewClient token={token} />;
}
