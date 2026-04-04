import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PostResult, QueuePayload, RunLog } from "./types";

const DEDUP_WINDOW_HOURS = 12;

export class SocialAgentDb {
  private readonly db: Database.Database;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, "social-agent.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dedup_entries (
        key TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS queue_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        queue_type TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS run_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        trigger_source TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        error_text TEXT,
        results_json TEXT NOT NULL DEFAULT '[]'
      );
    `);
  }

  healthcheck(): boolean {
    const row = this.db.prepare("SELECT 1 AS ok").get() as { ok: number };
    return row.ok === 1;
  }

  getRecentDedupKeys(): Set<string> {
    const cutoff = Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000;
    this.db.prepare("DELETE FROM dedup_entries WHERE created_at < ?").run(cutoff);
    const rows = this.db.prepare("SELECT key FROM dedup_entries").all() as Array<{ key: string }>;
    return new Set(rows.map((row) => row.key));
  }

  saveDedupKeys(keys: string[]) {
    const now = Date.now();
    const insert = this.db.prepare(`
      INSERT INTO dedup_entries (key, created_at)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET created_at = excluded.created_at
    `);
    const transaction = this.db.transaction((entries: string[]) => {
      for (const key of entries) insert.run(key, now);
    });
    transaction(keys);
  }

  createRun(jobId: string, trigger: string): number {
    const info = this.db.prepare(`
      INSERT INTO run_logs (job_id, trigger_source, status, started_at)
      VALUES (?, ?, 'running', ?)
    `).run(jobId, trigger, new Date().toISOString());
    return Number(info.lastInsertRowid);
  }

  finishRun(runId: number, status: string, results: PostResult[], error?: string) {
    this.db.prepare(`
      UPDATE run_logs
      SET status = ?, completed_at = ?, error_text = ?, results_json = ?
      WHERE id = ?
    `).run(status, new Date().toISOString(), error ?? null, JSON.stringify(results), runId);
  }

  enqueue(queueType: string, payload: QueuePayload) {
    this.db.prepare(`
      INSERT INTO queue_jobs (queue_type, status, payload_json, created_at)
      VALUES (?, 'pending', ?, ?)
    `).run(queueType, JSON.stringify(payload), new Date().toISOString());
  }

  getQueueCounts(): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT queue_type, COUNT(*) AS count
      FROM queue_jobs
      WHERE status = 'pending'
      GROUP BY queue_type
    `).all() as Array<{ queue_type: string; count: number }>;

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.queue_type] = row.count;
      return acc;
    }, {});
  }

  getRecentRuns(limit = 20): RunLog[] {
    const rows = this.db.prepare(`
      SELECT id, job_id, trigger_source, status, started_at, completed_at, error_text, results_json
      FROM run_logs
      ORDER BY id DESC
      LIMIT ?
    `).all(limit) as Array<{
      id: number;
      job_id: string;
      trigger_source: string;
      status: string;
      started_at: string;
      completed_at: string | null;
      error_text: string | null;
      results_json: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      trigger: row.trigger_source,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      error: row.error_text,
      results: JSON.parse(row.results_json) as PostResult[],
    }));
  }
}
