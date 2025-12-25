export async function onRequest(context) {
  const RSS_URL = "https://medium.com/feed/@max.petrusenko";
  // Preferred top article IDs; fall back to latest if missing.
  const TOP_IDS = [
    "99c594d458b5", // GrapheneOS
    "52e70e459cc2", // Global wealth
    "65b991356c25", // Claude Skills
  ];

  try {
    const cache = caches.default;
    const cacheKey = new Request("https://cache.maxpetrusenko.com/api/articles");
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const res = await fetch(RSS_URL, { headers: { Accept: "application/rss+xml" } });
    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
    const xml = await res.text();

    const items = parseItems(xml);
    const mapped = selectTop(items, TOP_IDS, 3);

    const response = new Response(JSON.stringify({ articles: mapped }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function parseItems(xml) {
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const contentRegex = /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/;
  const items = [];
  let match;
  while ((match = itemRegex.exec(xml))) {
    const block = match[1];
    const title = (titleRegex.exec(block) || [])[1] || "";
    const link = (linkRegex.exec(block) || [])[1] || "";
    const content = (contentRegex.exec(block) || [])[1] || "";
    const id = extractId(link);
    const image = extractImage(content);
    items.push({ id, title, link, image });
  }
  return items;
}

function extractId(link) {
  const m = /\/p\/([a-f0-9]+)/.exec(link);
  return m ? m[1] : "";
}

function extractImage(html) {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m ? m[1] : "";
}

function selectTop(items, topIds, count) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const selected = [];
  for (const id of topIds) {
    if (byId.has(id)) selected.push(byId.get(id));
  }
  if (selected.length < count) {
    for (const i of items) {
      if (selected.length >= count) break;
      if (!selected.find((s) => s.id === i.id)) selected.push(i);
    }
  }
  return selected.slice(0, count);
}
