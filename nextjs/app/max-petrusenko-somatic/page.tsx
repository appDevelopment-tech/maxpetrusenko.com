import { BrandedReferencePage } from "@/components/brand/BrandedReferencePage";
import { brandedReferencePageMap } from "@/lib/brand/reference-pages";
import { absoluteUrl, generateMetadata } from "@/lib/seo/metadata";

const config = brandedReferencePageMap["max-petrusenko-somatic"];

export const metadata = generateMetadata({
  title: config.title,
  description: config.description,
  ogType: "website",
  canonical: absoluteUrl(`/${config.slug}`),
  keywords: config.keywords,
});

export default function MaxPetrusenkoSomaticPage() {
  return <BrandedReferencePage config={config} />;
}
