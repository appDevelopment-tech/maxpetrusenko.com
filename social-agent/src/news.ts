import { Config, NewsItem } from "./types";

export async function fetchAiTechNews(config: Config): Promise<NewsItem[]> {
  const items: NewsItem[] = [];

  try {
    const hn = await fetch("https://hn.algolia.com/api/v1/search?query=AI&tags=story&hitsPerPage=20");
    if (hn.ok) {
      const data = (await hn.json()) as {
        hits?: Array<{ title: string; url: string; points: number; created_at: string }>;
      };
      for (const hit of data.hits ?? []) {
        if (!hit.url) continue;
        items.push({
          title: hit.title,
          url: hit.url,
          source: "hackernews",
          score: hit.points ?? 0,
          summary: hit.title,
          publishedAt: hit.created_at,
        });
      }
    }
  } catch (error) {
    console.error("[social-agent] hn fetch failed", error);
  }

  if (config.newsApiKey) {
    try {
      const url = new URL("https://newsapi.org/v2/everything");
      url.searchParams.set("q", "artificial intelligence OR AI technology");
      url.searchParams.set("sortBy", "popularity");
      url.searchParams.set("pageSize", "20");
      url.searchParams.set("apiKey", config.newsApiKey);

      const response = await fetch(url);
      if (response.ok) {
        const data = (await response.json()) as {
          articles?: Array<{
            title: string;
            url: string;
            description?: string;
            publishedAt: string;
            source?: { name?: string };
          }>;
        };

        for (const article of data.articles ?? []) {
          items.push({
            title: article.title,
            url: article.url,
            source: article.source?.name ?? "newsapi",
            score: 50,
            summary: article.description ?? article.title,
            publishedAt: article.publishedAt,
          });
        }
      }
    } catch (error) {
      console.error("[social-agent] news api fetch failed", error);
    }
  }

  items.sort((a, b) => b.score - a.score);
  return items;
}
