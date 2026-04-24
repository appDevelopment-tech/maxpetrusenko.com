import { getRequestContext } from "@cloudflare/next-on-pages";
import type { ConciergeThread, ConciergeUser } from "@/lib/concierge/types";

interface KvStore {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
}

const THREAD_PREFIX = "concierge:thread:";
const THREAD_INDEX_KEY = "concierge:index";
const USER_PREFIX = "concierge:user:";
const MAX_THREAD_INDEX_SIZE = 1000;
const memoryThreads = new Map<string, ConciergeThread>();
const memoryUsers = new Map<string, ConciergeUser>();
let memoryIndex: string[] = [];

function getCloudflareEnv(): CloudflareEnv | null {
  try {
    return getRequestContext().env as CloudflareEnv;
  } catch {
    return null;
  }
}

function getThreadStore(): KvStore | null {
  const env = getCloudflareEnv();
  return (env?.CONCIERGE_THREADS ?? null) as KvStore | null;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function readIndex(store: KvStore | null): Promise<string[]> {
  if (!store) return memoryIndex;
  return parseJson<string[]>(await store.get(THREAD_INDEX_KEY), []);
}

async function writeIndex(store: KvStore | null, ids: string[]): Promise<void> {
  if (!store) {
    memoryIndex = ids;
    return;
  }

  await store.put(THREAD_INDEX_KEY, JSON.stringify(ids.slice(0, MAX_THREAD_INDEX_SIZE)));
}

export async function saveConciergeThread(thread: ConciergeThread): Promise<void> {
  const store = getThreadStore();

  if (!store) {
    memoryThreads.set(thread.id, thread);
    const next = [thread.id, ...memoryIndex.filter((id) => id !== thread.id)];
    memoryIndex = next.slice(0, MAX_THREAD_INDEX_SIZE);
    return;
  }

  await store.put(`${THREAD_PREFIX}${thread.id}`, JSON.stringify(thread));
  const existing = await readIndex(store);
  const next = [thread.id, ...existing.filter((id) => id !== thread.id)];
  await writeIndex(store, next);
}

export async function getConciergeThread(id: string): Promise<ConciergeThread | null> {
  const store = getThreadStore();

  if (!store) {
    return memoryThreads.get(id) ?? null;
  }

  return parseJson<ConciergeThread | null>(
    await store.get(`${THREAD_PREFIX}${id}`),
    null
  );
}

export async function listConciergeThreads(limit = MAX_THREAD_INDEX_SIZE): Promise<ConciergeThread[]> {
  const store = getThreadStore();
  const ids = (await readIndex(store)).slice(0, limit);

  if (!store) {
    return ids
      .map((id) => memoryThreads.get(id))
      .filter((thread): thread is ConciergeThread => Boolean(thread));
  }

  const threads = await Promise.all(
    ids.map((id) => getConciergeThread(id))
  );

  return threads.filter((thread): thread is ConciergeThread => Boolean(thread));
}

export async function getConciergeUser(id: string): Promise<ConciergeUser | null> {
  const store = getThreadStore();

  if (!store) {
    return memoryUsers.get(id) ?? null;
  }

  return parseJson<ConciergeUser | null>(
    await store.get(`${USER_PREFIX}${id}`),
    null
  );
}

export async function saveConciergeUser(user: ConciergeUser): Promise<void> {
  const store = getThreadStore();

  if (!store) {
    memoryUsers.set(user.id, user);
    return;
  }

  await store.put(`${USER_PREFIX}${user.id}`, JSON.stringify(user));
}
