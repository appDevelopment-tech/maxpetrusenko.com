import { BrandedReferencePage } from "@/components/brand/BrandedReferencePage";
import { brandedReferencePageMap } from "@/lib/brand/reference-pages";
import { absoluteUrl, generateMetadata } from "@/lib/seo/metadata";

const config = brandedReferencePageMap["who-is-max-petrusenko"];

export const metadata = generateMetadata({
  title: config.title,
  description: config.description,
  ogType: "website",
  canonical: absoluteUrl(`/${config.slug}`),
  keywords: config.keywords,
});

export default function WhoIsMaxPetrusenkoPage() {
  return <BrandedReferencePage config={config} />;
}
