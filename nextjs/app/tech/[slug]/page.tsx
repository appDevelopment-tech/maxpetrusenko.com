import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProjectBySlug, getProjects } from "@/lib/cms/projects";
import { siteConfig } from "@/config/site";
import { generateMetadata as createMetadata, absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateWebPageSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import type { Metadata } from "next";

interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

/**
 * Generate metadata for each project dynamically
 */
export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Project Not Found",
    };
  }

  return createMetadata({
    title: project.title,
    description: project.description,
    ogImage: project.image,
    ogType: "website",
    canonical: absoluteUrl(`/tech/${slug}`),
    keywords: project.tags,
  });
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  // Get related projects by category
  const allProjects = await getProjects();
  const relatedProjects = allProjects
    .filter((p) => p.category === project.category && p.slug !== slug)
    .slice(0, 3);

  // Get status badge color
  const getStatusColor = () => {
    switch (project.status) {
      case "live":
        return "badge";
      case "mvp":
        return "badge mindfold";
      case "in-progress":
        return "badge spirit";
      default:
        return "badge";
    }
  };

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Tech", url: "/tech" },
    { name: project.title, url: `/tech/${slug}` },
  ]);

  return (
    <>
      <JsonLd
        type="WebPage"
        data={generateWebPageSchema({
          title: project.title,
          description: project.description,
          url: `/tech/${slug}`,
        })}
      />
      <JsonLd type="BreadcrumbList" data={breadcrumbSchema} />

      <div className="container">
        <article className="page">
          <section className="section ui-fade-up delay-2" style={{ marginTop: 0 }}>
            <Link
              href="/tech"
              className="btn sm secondary"
              style={{ marginBottom: 20, display: "inline-flex" }}
            >
              ← Back to Tech
            </Link>

            <header style={{ maxWidth: 900, margin: "0 auto" }}>
              <div className="pill-row" style={{ marginBottom: 16 }}>
                <span className={`pill ${getStatusColor()}`}>
                  {project.status.toUpperCase()}
                </span>
                <span className="pill">{project.category.toUpperCase()}</span>
                {project.tags.map((tag) => (
                  <span key={tag} className="pill">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-display" style={{ marginBottom: 16 }}>
                {project.title}
              </h1>

              <p
                className="text-xl text-muted"
                style={{ marginBottom: 32, lineHeight: 1.6 }}
              >
                {project.description}
              </p>
            </header>

            {project.image && (
              <div className="ui-fade-up delay-3" style={{ maxWidth: 900, margin: "40px auto" }}>
                <Image
                  src={project.image}
                  alt={project.title}
                  width={900}
                  height={500}
                  style={{ borderRadius: "var(--radius)" }}
                  priority
                />
              </div>
            )}

            <div
              className="card"
              style={{ maxWidth: 700, margin: "40px auto", textAlign: "center", padding: 40 }}
            >
              <h2 style={{ marginBottom: 16 }}>View Project</h2>
              <p className="text-muted" style={{ marginBottom: 24 }}>
                Check out the live project or explore the code.
              </p>
              <div className="hero-actions" style={{ justifyContent: "center" }}>
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener"
                  className="btn primary"
                >
                  Visit Project →
                </a>
                {siteConfig.social.github && (
                  <a
                    href={siteConfig.social.github}
                    target="_blank"
                    rel="noopener"
                    className="btn secondary"
                  >
                    View on GitHub
                  </a>
                )}
              </div>
            </div>

            {relatedProjects.length > 0 && (
              <section
                className="section"
                style={{ maxWidth: 900, margin: "60px auto 0" }}
              >
                <div className="section-head">
                  <h2>Related Projects</h2>
                  <span className="section-note">
                    More {project.category} projects
                  </span>
                </div>
                <div className="article-list">
                  {relatedProjects.map((related) => (
                    <Link
                      key={related.id}
                      className="article-card"
                      href={`/tech/${related.slug}`}
                    >
                      <Image
                        className="article-thumb"
                        src={related.image}
                        alt={related.title}
                        width={400}
                        height={225}
                      />
                      <div className="article-body">
                        <span className="article-title">{related.title}</span>
                        <span className="article-sub">{related.description}</span>
                        <div className="article-meta">
                          <span className="stat">{related.status}</span>
                          <span className="stat">{related.category}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </section>
        </article>
      </div>
    </>
  );
}
