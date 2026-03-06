import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveBlogArticleRedirect,
  resolveBlogTagRedirect,
  resolveLegacyBlogSlugRedirect,
  resolveMissingBlogTagRedirect,
  shouldIndexBlogTagPage,
} from "./legacy-blog-compat.ts";

test("redirects unknown legacy Medium ID slugs to the blog archive", () => {
  assert.equal(
    resolveLegacyBlogSlugRedirect("2fbbfd3d630c"),
    "/tech/articles/bitcoin-as-strong-money"
  );
  assert.equal(resolveLegacyBlogSlugRedirect("3749fc88b06d"), "/blog");
  assert.equal(resolveLegacyBlogSlugRedirect("05a1427581a3"), "/blog");
  assert.equal(resolveLegacyBlogSlugRedirect("1e454d39553b"), "/blog");
});

test("does not redirect canonical text slugs", () => {
  assert.equal(resolveLegacyBlogSlugRedirect("seo-is-dead"), null);
  assert.equal(resolveLegacyBlogSlugRedirect("generative-engine-optimization-geo"), null);
});

test("redirects non-canonical local blog slugs to their route-first page", () => {
  assert.equal(
    resolveBlogArticleRedirect("what-to-expect-first-tantra-session", "/spirituality/blog/what-to-expect-first-tantra-session"),
    "/spirituality/blog/what-to-expect-first-tantra-session"
  );
  assert.equal(
    resolveBlogArticleRedirect("openclaw-installation-playbook", "/tech/articles/openclaw-installation-playbook"),
    "/tech/articles/openclaw-installation-playbook"
  );
});

test("redirects external archive slugs to the canonical external URL", () => {
  assert.equal(
    resolveBlogArticleRedirect(
      "10432c398a50",
      "https://medium.com/@max.petrusenko/claude-code-tasks-and-the-missing-primitive-of-ai-autonomy-10432c398a50"
    ),
    "https://medium.com/@max.petrusenko/claude-code-tasks-and-the-missing-primitive-of-ai-autonomy-10432c398a50"
  );
});

test("keeps canonical /blog slugs on-site", () => {
  assert.equal(
    resolveBlogArticleRedirect("ai-infrastructure-security-baseline", "/blog/ai-infrastructure-security-baseline"),
    null
  );
});

test("redirects missing legacy tag archives to the blog topic index", () => {
  assert.equal(resolveMissingBlogTagRedirect("bitcoin"), "/blog/topics");
  assert.equal(resolveMissingBlogTagRedirect("kyo-tai"), "/blog/topics");
  assert.equal(resolveMissingBlogTagRedirect("data"), "/blog/topics");
});

test("keeps tag pages renderable instead of redirecting to a single article", () => {
  assert.equal(resolveBlogTagRedirect(["/tech/articles/openclaw-installation-playbook"]), null);
  assert.equal(resolveBlogTagRedirect(["/blog/one", "/blog/two"]), null);
  assert.equal(shouldIndexBlogTagPage(2), true);
  assert.equal(shouldIndexBlogTagPage(5), true);
  assert.equal(shouldIndexBlogTagPage(1), true);
});

test("ignores empty tag values", () => {
  assert.equal(resolveMissingBlogTagRedirect(""), null);
  assert.equal(resolveMissingBlogTagRedirect("   "), null);
});
