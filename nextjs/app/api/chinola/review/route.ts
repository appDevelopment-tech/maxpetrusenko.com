import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

const VALID_TOKENS = new Set(["farm-michael-7d4e9c", "kaggle-health-open-v1"]);
const KEY_PREFIX = "chinola-review";

type ReviewBox = {
  id: string;
  label: "passion_fruit" | "not_fruit" | "unsure";
  x: number;
  y: number;
  width: number;
  height: number;
};

type ReviewImage = {
  imageId: string;
  boxes: ReviewBox[];
  reviewed: boolean;
  note?: string;
};

type ReviewPayload = {
  token: string;
  reviewer?: string;
  complete?: boolean;
  images: ReviewImage[];
};

function getKv() {
  try {
    const { env } = getRequestContext();
    return env?.CONCIERGE_THREADS as
      | { get: (key: string) => Promise<string | null>; put: (key: string, value: string) => Promise<void> }
      | undefined;
  } catch {
    return undefined;
  }
}

function isValidPayload(payload: ReviewPayload) {
  return (
    VALID_TOKENS.has(payload.token) &&
    Array.isArray(payload.images) &&
    payload.images.every((image) =>
      typeof image.imageId === "string" &&
      Array.isArray(image.boxes) &&
      typeof image.reviewed === "boolean"
    )
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!VALID_TOKENS.has(token)) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 404 });
  }

  const kv = getKv();
  const raw = kv ? await kv.get(`${KEY_PREFIX}:${token}:latest`) : null;

  return NextResponse.json({
    ok: true,
    saved: Boolean(raw),
    review: raw ? JSON.parse(raw) : null,
  });
}

export async function POST(request: Request) {
  let payload: ReviewPayload;

  try {
    payload = (await request.json()) as ReviewPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json({ ok: false, error: "Invalid review payload" }, { status: 400 });
  }

  const reviewedCount = payload.images.filter((image) => image.reviewed).length;
  const boxCount = payload.images.reduce((total, image) => total + image.boxes.length, 0);
  const savedAt = new Date().toISOString();
  const review = {
    ...payload,
    savedAt,
    reviewedCount,
    boxCount,
    readyForTraining: Boolean(payload.complete),
  };

  const kv = getKv();
  if (kv) {
    await kv.put(`${KEY_PREFIX}:${payload.token}:latest`, JSON.stringify(review));
    if (payload.complete) {
      await kv.put(`${KEY_PREFIX}:${payload.token}:complete`, JSON.stringify(review));
    }
  }

  console.log("[chinola-review]", {
    token: payload.token,
    complete: Boolean(payload.complete),
    reviewedCount,
    boxCount,
    savedAt,
  });

  return NextResponse.json({
    ok: true,
    savedAt,
    reviewedCount,
    boxCount,
    readyForTraining: Boolean(payload.complete),
    signalKey: payload.complete ? `${KEY_PREFIX}:${payload.token}:complete` : `${KEY_PREFIX}:${payload.token}:latest`,
    statusUrl: `/api/chinola/review?token=${encodeURIComponent(payload.token)}`,
    stored: Boolean(kv),
  });
}
