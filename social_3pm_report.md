# 3 PM Social Post Report — 2026-04-04

## Status: BLOCKED (tools unavailable in sandbox)

## Selected Story
- **Title:** Can I Run AI Locally?
- **URL:** https://www.canirun.ai/
- **HN:** 1,520 points, 355 comments (objectID: 47363754)
- **Why:** Practical tool, high recent engagement, strong visual hook

## Prepared Content

### X Post
```
"Can I run AI locally?" — finally a tool that answers this.

canirun.ai checks your exact hardware against model requirements. No guessing.

1,520+ upvotes on HN. The local AI movement keeps growing.

https://www.canirun.ai/
```

### LinkedIn Post
```
The local AI movement just got a useful benchmark tool.

canirun.ai lets you check whether your hardware can actually run specific AI models locally — no more guessing based on spec sheets.

It hit 1,520 points on Hacker News with 355+ comments, which tells you something about the demand for running models outside the cloud.

Worth bookmarking if you're evaluating on-prem or edge AI deployments.

https://www.canirun.ai/
```

## Generated Images
- X (1200x675): `social_x_3pm.png`
- LinkedIn (1200x627): `social_linkedin_3pm.png`

## Blockers
1. **Zernio API:** 401 Unauthorized — no API key found in env or config files. Could not deduplicate against 11 AM / 1 PM posts.
2. **bird CLI:** Not found at `~/Projects/bird/bird` or on PATH. `~/Projects` directory does not exist in this sandbox.
3. **Posting:** Both X and LinkedIn posts could not be executed.

## Ready Commands (for manual execution)
```bash
# X post
~/Projects/bird/bird tweet "\"Can I run AI locally?\" — finally a tool that answers this.\n\ncanirun.ai checks your exact hardware against model requirements. No guessing.\n\n1,520+ upvotes on HN. The local AI movement keeps growing.\n\nhttps://www.canirun.ai/" --media ~/path/to/social_x_3pm.png

# LinkedIn via Zernio
curl -X POST https://zernio.com/api/v1/posts \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "The local AI movement just got a useful benchmark tool...", "platform": ["linkedin"], "media": ["social_linkedin_3pm.png"]}'
```
