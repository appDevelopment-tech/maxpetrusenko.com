import http from "node:http";
import cron from "node-cron";
import { loadConfig } from "./config";
import { SocialAgentDb } from "./db";
import { runJob } from "./jobs";
import { fetchMergedPosts } from "./zernio";

const config = loadConfig();
const db = new SocialAgentDb(config.dataDir);
const startedAt = Date.now();
const runningJobs = new Set<string>();

function json(
  res: http.ServerResponse,
  statusCode: number,
  body: unknown,
  headers?: Record<string, string>,
) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function getBearerToken(req: http.IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function canReadStatus(req: http.IncomingMessage): boolean {
  if (!config.statusToken) return true;
  return getBearerToken(req) === config.statusToken;
}

async function executeJob(jobId: string, trigger: string) {
  if (runningJobs.has(jobId)) {
    throw new Error(`Job already running: ${jobId}`);
  }

  runningJobs.add(jobId);
  const runId = db.createRun(jobId, trigger);

  try {
    const results = await runJob(jobId, config, db);
    db.finishRun(runId, results.some((result) => result.status === "failed") ? "failed" : "completed", results);
    return results;
  } catch (error) {
    db.finishRun(runId, "failed", [], String(error));
    throw error;
  } finally {
    runningJobs.delete(jobId);
  }
}

function startScheduler() {
  for (const job of config.schedule.jobs) {
    cron.schedule(
      job.cron,
      () => {
        void executeJob(job.id, "cron").catch((error) => {
          console.error(`[social-agent] cron job failed: ${job.id}`, error);
        });
      },
      { timezone: "UTC" },
    );
  }
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `127.0.0.1:${config.port}`}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, {
      ok: true,
      db: db.healthcheck(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
  }

  if (req.method === "GET" && url.pathname === "/posts") {
    if (config.apiKeys.length === 0) {
      return json(res, 503, { error: "Social API keys are not configured" });
    }

    const limit = Number(url.searchParams.get("limit") ?? 50);
    const posts = await fetchMergedPosts(config.apiKeys, limit);
    return json(res, 200, posts, {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    });
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/status")) {
    if (!canReadStatus(req)) {
      return json(res, 401, { error: "Unauthorized" });
    }

    return json(res, 200, {
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      schedule: config.schedule.jobs,
      queueCounts: db.getQueueCounts(),
      recentRuns: db.getRecentRuns(20),
      tools: config.schedule._tools,
      platforms: config.schedule._platforms,
      imageFormats: config.schedule._imageFormats,
    });
  }

  if (req.method === "POST" && url.pathname.startsWith("/run/")) {
    const token = getBearerToken(req);
    if (!config.runToken || token !== config.runToken) {
      return json(res, 401, { error: "Unauthorized" });
    }

    const jobId = url.pathname.replace("/run/", "");
    if (!config.schedule.jobs.some((job) => job.id === jobId)) {
      return json(res, 404, { error: "Unknown job" });
    }

    try {
      const results = await executeJob(jobId, "manual");
      return json(res, 200, { ok: true, jobId, results });
    } catch (error) {
      return json(res, 409, { ok: false, jobId, error: String(error) });
    }
  }

  return json(res, 404, { error: "Not found" });
}

async function main() {
  startScheduler();

  const server = http.createServer((req, res) => {
    void handleRequest(req, res).catch((error) => {
      console.error("[social-agent] request failed", error);
      json(res, 500, { error: "Internal server error" });
    });
  });

  server.listen(config.port, () => {
    console.log(`[social-agent] listening on :${config.port}`);
  });
}

void main();
