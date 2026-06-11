import { notFound, redirect } from "next/navigation";
import { generateMetadata as buildMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { ChinolaReviewClient } from "@/components/chinola/ChinolaReviewClient";

const REVIEW_TOKENS = new Set([
  "kaggle-health-open-v1",
  "maxim-fruit-v2",
  "maxim-flower-v1",
  "maxim-leaf-disease-v1",
]);
const REVIEW_TOKEN_REDIRECTS = new Map([
  ["maxim-fruit-v1", "maxim-fruit-v2"],
  ["maxim-wa-fruit-v1", "maxim-fruit-v2"],
]);

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
  const redirectToken = REVIEW_TOKEN_REDIRECTS.get(token);
  if (redirectToken) {
    return generateMetadataForToken(redirectToken);
  }

  return generateMetadataForToken(token);
}

export default async function ChinolaReviewPage({ params }: PageProps) {
  const { token } = await params;
  const redirectToken = REVIEW_TOKEN_REDIRECTS.get(token);

  if (redirectToken) {
    redirect(`/chinola/review/${redirectToken}`);
  }

  if (!REVIEW_TOKENS.has(token)) {
    notFound();
  }

  return <ChinolaReviewClient token={token} />;
}
