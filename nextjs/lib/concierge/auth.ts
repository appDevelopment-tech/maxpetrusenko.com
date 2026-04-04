import { NextRequest } from "next/server";
import { getEnvValue } from "./env";

export const ADMIN_COOKIE_NAME = "max-admin-session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return Buffer.from(signature).toString("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function getAdminPassword(): string | null {
  return getEnvValue("CONCIERGE_ADMIN_PASSWORD");
}

export function getAdminSecret(): string | null {
  return getEnvValue("CONCIERGE_SESSION_SECRET");
}

export function getSessionCookieName(): string {
  return ADMIN_COOKIE_NAME;
}

export async function createAdminSessionValue(secret: string): Promise<string> {
  const payload = toBase64Url(
    JSON.stringify({
      exp: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
      iat: Date.now(),
    })
  );
  const signature = await signValue(payload, secret);
  return `${payload}.${signature}`;
}

export async function createAdminSession(): Promise<string | null> {
  const secret = getAdminSecret();
  if (!secret) return null;
  return createAdminSessionValue(secret);
}

export async function verifyAdminSessionValue(
  sessionValue: string | null,
  secret: string
): Promise<boolean> {
  if (!sessionValue) return false;

  const [payload, signature] = sessionValue.split(".");
  if (!payload || !signature) return false;

  const expected = await signValue(payload, secret);
  if (!timingSafeEqual(signature, expected)) return false;

  try {
    const decoded = JSON.parse(fromBase64Url(payload)) as { exp?: number };
    return typeof decoded.exp === "number" && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

export async function verifyAdminSession(
  sessionValue: string | null
): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;
  return verifyAdminSessionValue(sessionValue, secret);
}

export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;

  const sessionValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? null;
  return verifyAdminSessionValue(sessionValue, secret);
}
