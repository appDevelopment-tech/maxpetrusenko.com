import { getRequestContext } from "@cloudflare/next-on-pages";

export function getCloudflareEnv(): CloudflareEnv | null {
  try {
    return getRequestContext().env as CloudflareEnv;
  } catch {
    return null;
  }
}

export function getEnvValue(key: string): string | null {
  const env = getCloudflareEnv();
  const value = env?.[key as keyof CloudflareEnv];
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  const nodeValue = process.env[key];
  return nodeValue?.trim() ? nodeValue : null;
}

export function getKvBinding(key: keyof CloudflareEnv): KVNamespace | null {
  const env = getCloudflareEnv();
  const value = env?.[key];
  if (value && typeof value === "object") {
    return value as unknown as KVNamespace;
  }
  return null;
}
