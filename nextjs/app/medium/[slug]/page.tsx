import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { join } from "path";
import type { Metadata } from "next";

interface MediumPreviewPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Pre-generate known article slugs at build time
export async function generateStaticParams() {
  const { readdirSync, existsSync } = await import("fs");
  const mediumDir = join(process.cwd(), "public", "medium");

  if (!existsSync(mediumDir)) return [];

  try {
    const entries = readdirSync(mediumDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => ({ slug: e.name }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: MediumPreviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Medium Preview: ${slug}`,
    robots: "noindex, nofollow",
  };
}

export default async function MediumPreviewPage({
  params,
}: MediumPreviewPageProps) {
  const { slug } = await params;

  // Only allow known slugs from the public/medium directory
  const { existsSync } = await import("fs");
  const previewDir = join(process.cwd(), "public", "medium", slug);

  if (!slug || !existsSync(previewDir)) {
    notFound();
    return;
  }

  const indexPath = join(previewDir, "index.html");

  if (!existsSync(indexPath)) {
    notFound();
    return;
  }

  const html = await readFile(indexPath, "utf-8");

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ minHeight: "100vh", background: "#faf9f7" }}
    />
  );
}
